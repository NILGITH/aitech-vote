"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LiveStat = { candidate_id: string; category_id: string; total_votes: number };
export type FeedItem = { id: number; candidateId: string; delta: number };

/**
 * Totaux en temps réel (Supabase Realtime) + fil des derniers votes.
 * Un rafraîchissement périodique sert de filet si le temps réel est coupé.
 */
export function useLiveStats(eventId: string, initial: LiveStat[]) {
  const [stats, setStats] = useState<Record<string, LiveStat>>(() => Object.fromEntries(initial.map((s) => [s.candidate_id, s])));
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const ref = useRef(stats);
  ref.current = stats;
  const seq = useRef(0);

  useEffect(() => {
    const db = createClient();
    const apply = (row: LiveStat) => {
      const prev = ref.current[row.candidate_id]?.total_votes ?? 0;
      const next = Number(row.total_votes);
      if (next !== prev) {
        setStats((s) => ({ ...s, [row.candidate_id]: { candidate_id: row.candidate_id, category_id: row.category_id, total_votes: next } }));
        if (next > prev) setFeed((f) => [{ id: ++seq.current, candidateId: row.candidate_id, delta: next - prev }, ...f].slice(0, 12));
      }
    };
    const channel = db
      .channel(`stats-${eventId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "candidate_stats", filter: `event_id=eq.${eventId}` }, (p) => apply(p.new as LiveStat))
      .subscribe();
    const poll = setInterval(async () => {
      const { data } = await db.from("candidate_stats").select("candidate_id, category_id, total_votes").eq("event_id", eventId);
      data?.forEach((r) => apply(r as LiveStat));
    }, 20000);
    return () => {
      clearInterval(poll);
      db.removeChannel(channel);
    };
  }, [eventId]);

  return { stats, feed };
}
