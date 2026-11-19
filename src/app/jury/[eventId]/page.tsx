import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { PageTitle } from "@/components/admin/Shell";
import { JuryScoring } from "@/components/org/JuryScoring";

export default async function JuryEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const me = await requireProfile(["jury", "organizer", "super_admin"]);
  const db = await createClient();
  const { data: member } = await db.from("jury_members").select("event_id").eq("event_id", eventId).eq("user_id", me.id).maybeSingle();
  if (!member) notFound();
  // Le juré n'a pas accès aux candidats non publiés via la RLS publique : lecture serveur après contrôle d'appartenance
  const admin = createAdminClient();
  const [{ data: e }, { data: criteria }, { data: cands }, { data: scores }, { data: rec }] = await Promise.all([
    admin.from("events").select("title").eq("id", eventId).single(),
    db.from("criteria").select("id, name, weight, max_score").eq("event_id", eventId).order("position"),
    admin.from("candidates").select("id, display_name, code, photo_url, bio, video_url").eq("event_id", eventId).order("position"),
    db.from("jury_scores").select("candidate_id, criterion_id, score, comment").eq("event_id", eventId).eq("juror_id", me.id),
    db.from("jury_recusals").select("candidate_id").eq("event_id", eventId).eq("juror_id", me.id),
  ]);
  const initial: Record<string, { scores: Record<string, number>; comment: string }> = {};
  (scores ?? []).forEach((s) => {
    initial[s.candidate_id] ??= { scores: {}, comment: s.comment ?? "" };
    initial[s.candidate_id].scores[s.criterion_id] = Number(s.score);
  });
  return (
    <>
      <PageTitle title={e?.title ?? "Jury"} sub="Notez chaque candidat sur les critères ci-dessous." />
      <JuryScoring eventId={eventId} criteria={(criteria ?? []).map((c) => ({ ...c, weight: Number(c.weight) }))} candidates={cands ?? []} initial={initial} recused={(rec ?? []).map((r) => r.candidate_id)} />
    </>
  );
}
