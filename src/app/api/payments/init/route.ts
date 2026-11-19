import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCredential } from "@/lib/credentials";
import { isSandbox } from "@/lib/providers/kkiapay";
import { getVoterSession } from "@/lib/voter-session";
import { keyedHash, randomToken } from "@/lib/crypto";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { fail, ok } from "@/lib/http";
import type { EventRow, Pack } from "@/lib/types";

const Body = z.object({ candidateId: z.string().uuid(), packIndex: z.number().int().min(0).max(20), phone: z.string().optional() });

/** Prépare un paiement : le montant est calculé ICI, jamais à partir du navigateur. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Requête invalide.");
  const db = createAdminClient();

  const { data: cand } = await db.from("candidates").select("id, event_id, category_id, is_published, display_name, code").eq("id", parsed.data.candidateId).maybeSingle();
  if (!cand?.is_published) return fail("Ce candidat n'est pas disponible.", 404);
  const { data: ev } = await db.from("events").select("*").eq("id", cand.event_id).single<EventRow>();
  if (!ev) return fail("Événement introuvable.", 404);
  const now = Date.now();
  const open = ev.status === "published" && (!ev.vote_opens_at || new Date(ev.vote_opens_at).getTime() <= now) && (!ev.vote_closes_at || new Date(ev.vote_closes_at).getTime() > now);
  if (!open) return fail("Le vote est fermé pour cet événement.");
  if (!ev.modes.includes("paid")) return fail("Le vote payant n'est pas activé.");

  // Numéro du votant : vérifié par code si l'événement l'exige
  let phone: string | null = null;
  const session = await getVoterSession("phone", "vote");
  if (session) phone = session.sub;
  else if (!ev.require_otp && parsed.data.phone) phone = normalizePhone(parsed.data.phone);
  if (!phone) return fail("Vérifiez d'abord votre numéro.", 401);

  const pack: Pack | undefined = (ev.packs as Pack[])[parsed.data.packIndex];
  if (!pack) return fail("Pack inconnu.");
  const amount = pack.votes * ev.price_per_vote_xof;
  if (amount < 1) return fail("Montant invalide.");

  // Plafond anti-fraude : votes payants par numéro et par heure
  const phoneHash = keyedHash(phone, "phone");
  const { data: recent } = await db
    .from("payments")
    .select("votes, bonus_votes")
    .eq("event_id", ev.id)
    .eq("phone_hash", phoneHash)
    .eq("status", "success")
    .gte("created_at", new Date(now - 3600_000).toISOString());
  const used = (recent ?? []).reduce((a, p) => a + p.votes + p.bonus_votes, 0);
  if (used + pack.votes + pack.bonus > ev.max_paid_votes_per_hour) {
    await db.from("fraud_alerts").insert({ event_id: ev.id, kind: "hourly_cap", details: { phone: maskPhone(phone), used, requested: pack.votes + pack.bonus } });
    return fail(`Limite atteinte : ${ev.max_paid_votes_per_hour} votes payants par heure et par numéro.`, 429);
  }

  const cred = await getCredential("kkiapay", ev.id);
  if (!cred?.config.public_key) return fail("Le paiement n'est pas encore configuré pour cet événement.", 503);

  const reference = `AV-${randomToken(9)}`;
  const { data: payment, error } = await db
    .from("payments")
    .insert({
      reference,
      event_id: ev.id,
      category_id: cand.category_id,
      candidate_id: cand.id,
      votes: pack.votes,
      bonus_votes: pack.bonus,
      amount_xof: amount,
      phone_hash: phoneHash,
      phone_masked: maskPhone(phone),
    })
    .select("id")
    .single();
  if (error) return fail("Impossible de préparer le paiement.", 500);

  return ok({
    paymentId: payment.id,
    reference,
    amount,
    votes: pack.votes + pack.bonus,
    publicKey: cred.config.public_key,
    sandbox: isSandbox(cred),
    phone,
    reason: `${pack.votes + pack.bonus} vote(s) pour ${cand.display_name} (${cand.code})`,
  });
}
