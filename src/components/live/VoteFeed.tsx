"use client";
import { useLiveStats, type LiveStat } from "./useLiveStats";

type C = { id: string; display_name: string };

/** Bandeau défilant des derniers votes, et notification flottante en option. */
export function VoteTicker({ eventId, candidates, initial, fallback }: { eventId: string; candidates: C[]; initial: LiveStat[]; fallback: string[] }) {
  const { feed } = useLiveStats(eventId, initial);
  const name = (id: string) => candidates.find((c) => c.id === id)?.display_name ?? "Un candidat";
  const items = feed.length ? feed.map((f) => `${name(f.candidateId)} vient de recevoir ${f.delta} vote${f.delta > 1 ? "s" : ""}`) : fallback;
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-t border-[#1E2E4F] bg-[#081429]" aria-live="off">
      <div className="av-ticker flex w-max gap-10 whitespace-nowrap py-3.5 text-sm text-[#C9D3E6]">
        {loop.map((t, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VoteToast({ eventId, candidates, initial }: { eventId: string; candidates: C[]; initial: LiveStat[] }) {
  const { feed } = useLiveStats(eventId, initial);
  const last = feed[0];
  if (!last) return null;
  const c = candidates.find((x) => x.id === last.candidateId);
  return (
    <div key={last.id} role="status" className="pointer-events-none fixed inset-x-4 top-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-2xl" style={{ animation: "av-toast 5s ease-in-out both" }}>
      <span className="h-2.5 w-2.5 flex-none rounded-full bg-success" />
      <span><strong>{c?.display_name ?? "Un candidat"}</strong> vient de recevoir {last.delta} vote{last.delta > 1 ? "s" : ""}</span>
    </div>
  );
}
