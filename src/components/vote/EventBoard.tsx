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

      <ul className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
        {filtered.map((c, i) => {
          const rank = showResults ? list.indexOf(c) + 1 : 0;
          return (
            <li key={c.id} className="group av-lift av-sheen av-tilt-in flex flex-col overflow-hidden rounded-[18px] border border-line bg-white" style={{ "--av-delay": `${Math.min(i, 12) * 0.05}s` } as React.CSSProperties}>
              <Link href={`/e/${slug}/c/${c.code}`} className="relative block aspect-[4/3] overflow-hidden bg-[#EEF1F6]" aria-label={`Voir ${c.display_name}`}>
                {c.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photo_url} alt="" loading="lazy" className="av-zoom-img h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center"><Avatar name={c.display_name} size={96} radius={999} /></span>
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(11,27,51,.55)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {rank > 0 && rank <= 3 && (
                  <span className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-extrabold shadow-lg ${rank === 1 ? "av-glow bg-accent text-ink" : "bg-white text-ink"}`}>{rank}</span>
                )}
                <span className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-ink backdrop-blur">{c.code}</span>
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <div className="truncate text-[15px] font-bold">{c.display_name}</div>
                {c.bio && <p className="m-0 line-clamp-2 text-xs leading-snug text-muted">{c.bio}</p>}
                {showResults && (
                  <div className="mt-auto">
                    <div className="mb-1 flex justify-between text-xs"><span className="text-muted">Votes</span><strong className="tabular-nums">{num(c.v)}</strong></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF1F6]">
                      <div className="av-grow h-1.5 rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700" style={{ width: `${Math.round((c.v / max) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <Link href={`/e/${slug}/c/${c.code}`} className={`av-btn mt-1 flex h-10 items-center justify-center rounded-xl text-sm font-bold ${canVote ? "bg-primary text-white" : "border border-[#CBD3E1] text-ink"}`}>
                  {canVote ? "Voter" : "Voir le profil"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {!filtered.length && <p className="av-card p-6 text-center text-muted">Aucun candidat publié dans cette catégorie pour le moment.</p>}
    </div>
  );
}
