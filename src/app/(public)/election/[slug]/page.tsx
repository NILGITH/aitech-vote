import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isVotingOpen } from "@/lib/queries";
import { getVoterSession } from "@/lib/voter-session";
import { BallotFlow } from "@/components/vote/BallotFlow";
import { Countdown } from "@/components/ui/Countdown";
import { num } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ElectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("*").eq("slug", slug).maybeSingle<EventRow>();
  if (!e || !e.modes.includes("election")) notFound();
  const [{ data: cats }, { data: cands }, session] = await Promise.all([
    db.from("categories").select("id, name, max_choices, description").eq("event_id", e.id).order("position"),
    db.from("candidates").select("id, display_name, photo_url, bio, category_id").eq("event_id", e.id).eq("is_published", true).order("position"),
    getVoterSession("elector", e.id),
  ]);
  const open = isVotingOpen(e);

  let results: { category_id: string; candidate_id: string; votes: number; blank: number }[] = [];
  if (e.status === "closed") {
    const { data } = await db.rpc("election_results", { p_event_id: e.id });
    results = data ?? [];
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <section className="av-fade-up mb-6 flex flex-col gap-2 rounded-[var(--av-radius)] bg-ink p-5 text-white">
        <span className="flex items-center gap-2 text-xs font-bold text-[#9FD8C2]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5FD3A4" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          BULLETIN SECRET
        </span>
        <h1 className="m-0 text-2xl font-extrabold leading-tight">{e.title}</h1>
        {e.description && <p className="m-0 text-sm text-[#C9D3E6]">{e.description}</p>}
        {open && e.vote_closes_at && <p className="m-0 text-sm text-[#C9D3E6]">Clôture dans <strong className="text-white"><Countdown to={e.vote_closes_at} /></strong></p>}
      </section>
      {open ? (
        <BallotFlow eventId={e.id} categories={cats ?? []} candidates={cands ?? []} alreadyVerified={!!session} />
      ) : e.status === "closed" ? (
        <div className="flex flex-col gap-4">
          <h2 className="m-0 text-xl font-bold">Résultats</h2>
          {(cats ?? []).map((c) => {
            const rows = results.filter((r) => r.category_id === c.id).sort((a, b) => b.votes - a.votes);
            const total = rows.reduce((a, r) => a + Number(r.votes), 0) || 1;
            return (
              <div key={c.id} className="av-card flex flex-col gap-3 p-4">
                <h3 className="m-0 font-bold">{c.name}</h3>
                {rows.map((r, i) => {
                  const cand = cands?.find((x) => x.id === r.candidate_id);
                  const pct = Math.round((Number(r.votes) / total) * 100);
                  return (
                    <div key={r.candidate_id}>
                      <div className="flex justify-between text-sm"><span className={i === 0 ? "font-bold" : ""}>{cand?.display_name}</span><span className="tabular-nums">{num(r.votes)} · {pct} %</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EEF1F6]"><div className="av-grow h-2 rounded-full" style={{ width: `${pct}%`, background: i === 0 ? "var(--av-accent)" : "var(--av-primary)" }} /></div>
                    </div>
                  );
                })}
                {rows[0]?.blank ? <p className="m-0 text-xs text-muted">Votes blancs : {num(rows[0].blank)}</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="av-card p-6 text-center text-muted">Le scrutin n&apos;est pas encore ouvert.</p>
      )}
    </div>
  );
}
