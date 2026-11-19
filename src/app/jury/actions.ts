"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/** Enregistre les notes d'un juré pour un candidat (RLS : seulement ses propres notes). */
export async function saveScores(eventId: string, candidateId: string, scores: Record<string, number>, comment: string) {
  const me = await requireProfile(["jury", "organizer", "super_admin"]);
  const db = await createClient();
  const { data: criteria } = await db.from("criteria").select("id, max_score").eq("event_id", eventId);
  const rows = (criteria ?? [])
    .filter((c) => scores[c.id] !== undefined)
    .map((c) => ({ event_id: eventId, candidate_id: candidateId, juror_id: me.id, criterion_id: c.id, score: Math.min(c.max_score, Math.max(0, Number(scores[c.id]))), comment: comment.slice(0, 1000) || null, updated_at: new Date().toISOString() }));
  if (!rows.length) return { error: "Aucune note." };
  const { error } = await db.from("jury_scores").upsert(rows, { onConflict: "candidate_id,juror_id,criterion_id" });
  if (error) return { error: "Enregistrement refusé (vous êtes peut-être récusé ou le vote est fermé)." };
  revalidatePath(`/jury/${eventId}`);
  return { ok: true };
}

export async function recuse(eventId: string, candidateId: string) {
  const me = await requireProfile(["jury", "organizer", "super_admin"]);
  const db = await createClient();
  await db.from("jury_scores").delete().eq("candidate_id", candidateId).eq("juror_id", me.id);
  const { error } = await db.from("jury_recusals").insert({ event_id: eventId, candidate_id: candidateId, juror_id: me.id });
  revalidatePath(`/jury/${eventId}`);
  return error ? { error: error.message } : { ok: true };
}
