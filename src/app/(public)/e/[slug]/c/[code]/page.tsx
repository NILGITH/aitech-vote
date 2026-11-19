import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isVotingOpen } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { getVoterSession } from "@/lib/voter-session";
import { maskPhone } from "@/lib/phone";
import { Avatar } from "@/components/ui/Avatar";
import { VoteFlow } from "@/components/vote/VoteFlow";
import { num } from "@/lib/format";
import type { Candidate, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(slug: string, code: string) {
  const db = await createClient();
  const { data: event } = await db.from("events").select("*").eq("slug", slug).maybeSingle<EventRow>();
  if (!event) return null;
  const { data: cand } = await db.from("candidates").select("*").eq("event_id", event.id).eq("code", decodeURIComponent(code).toUpperCase()).eq("is_published", true).maybeSingle<Candidate>();
  if (!cand) return null;
  const [{ data: cat }, { data: stat }] = await Promise.all([
    db.from("categories").select("name").eq("id", cand.category_id).single(),
    db.from("candidate_stats").select("total_votes").eq("candidate_id", cand.id).maybeSingle(),
  ]);
  return { event, cand, category: cat?.name as string, votes: Number(stat?.total_votes ?? 0) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; code: string }> }): Promise<Metadata> {
  const { slug, code } = await params;
  const d = await load(slug, code);
  return d ? { title: `Votez pour ${d.cand.display_name}`, description: `${d.category} · ${d.event.title}` } : {};
}

const METHOD_LABELS: Record<string, string> = { wave: "Wave", orange_money: "Orange Money", mtn: "MTN", moov: "Moov", card: "Carte" };

export default async function CandidatePage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const d = await load(slug, code);
  if (!d) notFound();
  const { event: e, cand } = d;
  const [settings, session] = await Promise.all([getSettings(), getVoterSession("phone", "vote")]);
  const open = isVotingOpen(e);
  const paid = e.modes.includes("paid") && settings.modules.paid !== false;
  const free = e.modes.includes("free") && settings.modules.free !== false;
  const methods = Object.entries(settings.payment_methods).filter(([, v]) => v).map(([k]) => METHOD_LABELS[k] ?? k);

  return (
    <div className="mx-auto grid max-w-[1000px] gap-8 px-5 py-8 md:grid-cols-[1fr_420px]">
      <div className="av-fade-up flex flex-col gap-5">
        <Link href={`/e/${slug}`} className="text-sm font-semibold text-primary">← {e.title}</Link>
        <div className="flex items-center gap-4">
          <Avatar name={cand.display_name} src={cand.photo_url} size={88} radius={22} />
          <div>
            <h1 className="m-0 text-[clamp(24px,4vw,32px)] font-extrabold">{cand.display_name}</h1>
            <p className="m-0 text-sm text-muted">{d.category} · Code <strong className="text-ink">{cand.code}</strong></p>
            {e.show_live_results && <p className="m-0 mt-1 text-sm font-semibold text-success">{num(d.votes)} votes</p>}
          </div>
        </div>
        {cand.bio && <p className="m-0 whitespace-pre-line leading-relaxed text-[#1E2B45]">{cand.bio}</p>}
        {cand.video_url && (
          <a href={cand.video_url} target="_blank" rel="noopener noreferrer" className="self-start rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold">Voir la vidéo ↗</a>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Votez pour ${cand.display_name} (${cand.code}) : ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/e/${slug}/c/${cand.code}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="av-btn flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#1FA855] px-5 font-bold text-white"
        >
          Partager sur WhatsApp
        </a>
      </div>
      <div className="av-fade-up av-card self-start p-5" style={{ "--av-delay": ".1s" } as React.CSSProperties}>
        {open && (paid || free) ? (
          <VoteFlow
            candidateId={cand.id}
            candidateName={cand.display_name}
            paid={paid}
            free={free}
            price={e.price_per_vote_xof}
            packs={e.packs}
            requireOtp={e.require_otp}
            verifiedPhone={session ? maskPhone(session.sub) : null}
            methods={methods}
          />
        ) : (
          <p className="m-0 text-center text-muted">{e.status === "closed" ? "Le vote est clôturé." : "Le vote n'est pas ouvert pour le moment."}</p>
        )}
      </div>
    </div>
  );
}
