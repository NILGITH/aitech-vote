import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Candidate, CandidateStat, Category, EventRow } from "@/lib/types";

export type EventBundle = {
  event: EventRow;
  categories: Category[];
  candidates: Candidate[];
  stats: Record<string, CandidateStat>;
};

export async function getPublicEvents(limit = 24): Promise<(EventRow & { candidates_count: number; total_votes: number })[]> {
  const db = await createClient();
  const { data: events } = await db
    .from("events")
    .select("*")
    .in("status", ["published", "closed"])
    .order("status", { ascending: false })
    .order("vote_closes_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (!events?.length) return [];
  const ids = events.map((e) => e.id);
  const { data: stats } = await db.from("candidate_stats").select("event_id, total_votes").in("event_id", ids);
  const { data: cands } = await db.from("candidates").select("event_id").in("event_id", ids).eq("is_published", true);
  return (events as EventRow[]).map((e) => ({
    ...e,
    total_votes: (stats ?? []).filter((s) => s.event_id === e.id).reduce((a, s) => a + Number(s.total_votes), 0),
    candidates_count: (cands ?? []).filter((c) => c.event_id === e.id).length,
  }));
}

export async function getEventBundle(slug: string): Promise<EventBundle | null> {
  const db = await createClient();
  const { data: event } = await db.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!event) return null;
  const [{ data: categories }, { data: candidates }, { data: stats }] = await Promise.all([
    db.from("categories").select("*").eq("event_id", event.id).order("position"),
    db.from("candidates").select("*").eq("event_id", event.id).eq("is_published", true).order("position"),
    db.from("candidate_stats").select("*").eq("event_id", event.id),
  ]);
  return {
    event: event as EventRow,
    categories: (categories ?? []) as Category[],
    candidates: (candidates ?? []) as Candidate[],
    stats: Object.fromEntries((stats ?? []).map((s) => [s.candidate_id, { ...s, total_votes: Number(s.total_votes) } as CandidateStat])),
  };
}

export function isVotingOpen(e: EventRow) {
  const now = Date.now();
  return (
    e.status === "published" &&
    (!e.vote_opens_at || new Date(e.vote_opens_at).getTime() <= now) &&
    (!e.vote_closes_at || new Date(e.vote_closes_at).getTime() > now)
  );
}
