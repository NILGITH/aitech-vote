"use client";
import { Avatar } from "@/components/ui/Avatar";
import { useLiveStats, type LiveStat } from "./useLiveStats";
import { num } from "@/lib/format";

type C = { id: string; display_name: string; code: string; photo_url: string | null; category_id: string };

/** Classement animé d'une catégorie : les barres et l'ordre bougent en direct. */
export function LiveRanking({ eventId, categoryId, candidates, initial, limit = 5, showVotes = true }: {
  eventId: string; categoryId: string; candidates: C[]; initial: LiveStat[]; limit?: number; showVotes?: boolean;
}) {
  const { stats } = useLiveStats(eventId, initial);
  const list = candidates
    .filter((c) => c.category_id === categoryId)
    .map((c) => ({ ...c, v: stats[c.id]?.total_votes ?? 0 }))
    .sort((a, b) => b.v - a.v);
  const total = list.reduce((a, c) => a + c.v, 0) || 1;
  const shown = list.slice(0, limit);
  return (
    <ol className="relative m-0 list-none p-0" style={{ height: shown.length * 60 }}>
      {shown.map((c, i) => {
        const pct = Math.round((c.v / total) * 100);
        return (
          <li key={c.id} className="absolute inset-x-0 flex items-center gap-3 transition-transform duration-700" style={{ transform: `translateY(${i * 60}px)` }}>
            <span className="w-5 font-heading font-bold text-muted">{i + 1}</span>
            <Avatar name={c.display_name} src={c.photo_url} size={44} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-[15px]">
                <span className="truncate font-semibold">{c.display_name}</span>
                <span className="tabular-nums text-muted">{showVotes ? `${num(c.v)} · ` : ""}{pct} %</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F6]">
                <div className="av-grow h-2 rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
