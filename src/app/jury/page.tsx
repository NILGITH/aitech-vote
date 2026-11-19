import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageTitle } from "@/components/admin/Shell";

export default async function JuryHome() {
  const me = await requireProfile(["jury", "organizer", "super_admin"]);
  const db = await createClient();
  const { data: mem } = await db.from("jury_members").select("event_id").eq("user_id", me.id);
  const ids = (mem ?? []).map((m) => m.event_id);
  const { data: events } = ids.length ? await db.from("events").select("id, title, status, vote_closes_at").in("id", ids) : { data: [] };
  return (
    <>
      <PageTitle title="Mes jurys" sub="Notez les candidats selon la grille définie par l'organisateur." />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
        {events?.map((e, i) => (
          <Link key={e.id} href={`/jury/${e.id}`} className="av-lift av-fade-up av-card p-5" style={{ "--av-delay": `${i * 0.06}s` } as React.CSSProperties}>
            <div className="font-heading text-lg font-bold">{e.title}</div>
            <div className="mt-1 text-sm text-primary">Ouvrir la grille →</div>
          </Link>
        ))}
      </div>
      {!events?.length && <p className="av-card p-6 text-center text-muted">Vous n&apos;êtes membre d&apos;aucun jury pour le moment.</p>}
    </>
  );
}
