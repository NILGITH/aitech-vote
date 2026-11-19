"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useLiveStats, type LiveStat } from "@/components/live/useLiveStats";
import { num } from "@/lib/format";

type C = { id: string; display_name: string; code: string; photo_url: string | null; category_id: string; bio: string | null };
type Cat = { id: string; name: string };

export function EventBoard({ slug, eventId, categories, candidates, initial, canVote, showResults }: {
  slug: string; eventId: string; categories: Cat[]; candidates: C[]; initial: LiveStat[]; canVote: boolean; showResults: boolean;
}) {
  const [active, setActive] = useState(categories[0]?.id);
  const [q, setQ] = useState("");
  const { stats, feed } = useLiveStats(eventId, initial);
  const list = useMemo(
    () =>
      candidates
        .filter((c) => c.category_id === active)
        .map((c) => ({ ...c, v: stats[c.id]?.total_votes ?? 0 }))
        .sort((a, b) => (showResults ? b.v - a.v : 0)),
    [candidates, active, stats, showResults],
  );
  const max = Math.max(1, ...list.map((c) => c.v));
  const filtered = q ? list.filter((c) => (c.display_name + c.code).toLowerCase().includes(q.toLowerCase())) : list;
  const top = showResults ? list.slice(0, 3) : [];
  const last = feed[0];
  const lastName = last && candidates.find((c) => c.id === last.candidateId)?.display_name;

  return (
    <div className="flex flex-col gap-6">
      {last && lastName && (
        <div key={last.id} role="status" className="pointer-events-none fixed inset-x-4 top-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-2xl" style={{ animation: "av-toast 5s ease-in-out both" }}>
          <span className="h-2.5 w-2.5 flex-none rounded-full bg-success" />
          <span><strong>{lastName}</strong> vient de recevoir {last.delta} vote{last.delta > 1 ? "s" : ""}</span>
        </div>
      )}

      <div className="av-scroll-x -mx-5 px-5">
        <div role="tablist" aria-label="Catégories" className="flex w-max gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`h-11 flex-none rounded-full px-4 text-sm font-semibold transition-colors ${active === c.id ? "bg-ink text-white" : "border border-[#CBD3E1] bg-white text-[#1E2B45]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {top.length >= 2 && (
        <div className="av-card flex items-end justify-center gap-3 px-4 pb-4 pt-5">
          {[top[1], top[0], top[2]].filter(Boolean).map((c) => {
            const rank = top.indexOf(c!) + 1;
            const h = rank === 1 ? 96 : rank === 2 ? 68 : 50;
            return (
              <div key={c!.id} className="flex max-w-[160px] flex-1 flex-col items-center gap-1.5 text-center">
                <span className={rank === 1 ? "av-pop" : ""} style={{ "--av-delay": ".9s" } as React.CSSProperties}>
                  <Avatar name={c!.display_name} src={c!.photo_url} size={rank === 1 ? 64 : 52} radius={999} ring={rank === 1 ? "var(--av-accent)" : undefined} />
                </span>
                <span className="w-full truncate text-[13px] font-semibold">{c!.display_name}</span>
                <span className="text-xs tabular-nums text-muted">{num(c!.v)} votes</span>
                <div
                  className="av-rise flex w-full items-center justify-center rounded-t-[10px] font-heading text-xl font-extrabold"
                  style={{ height: h, background: rank === 1 ? "var(--av-accent)" : "#E8F0FD", color: rank === 1 ? "var(--av-ink)" : "#1650B8", "--av-delay": `${rank === 1 ? 0.1 : rank === 2 ? 0.3 : 0.5}s` } as React.CSSProperties}
                >
                  {rank}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-bold">Candidats · {list.length}</h2>
        <label className="w-full sm:w-72">
          <span className="sr-only">Rechercher un candidat</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom ou un code" className="av-input h-11" />
        </label>
      </div>

      <ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
        {filtered.map((c, i) => (
          <li key={c.id} className="av-lift av-fade-up flex items-center gap-3 rounded-2xl border border-line bg-white p-3" style={{ "--av-delay": `${Math.min(i, 10) * 0.05}s` } as React.CSSProperties}>
            <Avatar name={c.display_name} src={c.photo_url} size={56} radius={14} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold">{c.display_name}</div>
              <div className="mt-0.5 text-xs text-muted">Code <strong className="text-[#1E2B45]">{c.code}</strong>{showResults && <> · {num(c.v)} votes</>}</div>
              {showResults && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF1F6]">
                  <div className="av-grow h-1.5 rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.round((c.v / max) * 100)}%` }} />
                </div>
              )}
            </div>
            <Link href={`/e/${slug}/c/${c.code}`} className={`av-btn flex h-11 flex-none items-center rounded-xl px-4 text-sm font-bold ${canVote ? "bg-primary text-white" : "border border-[#CBD3E1] text-ink"}`}>
              {canVote ? "Voter" : "Profil"}
            </Link>
          </li>
        ))}
      </ul>
      {!filtered.length && <p className="av-card p-6 text-center text-muted">Aucun candidat publié dans cette catégorie pour le moment.</p>}
    </div>
  );
}
