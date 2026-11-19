import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import { setVoterSession } from "@/lib/voter-session";
import { fail, ok } from "@/lib/http";

const Body = z.object({ eventId: z.string().uuid(), identifier: z.string(), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Code invalide.");
  const id = parsed.data.identifier.trim();
  const isEmail = id.includes("@");
  const target = isEmail ? id.toLowerCase() : normalizePhone(id);
  if (!target) return fail("Identifiant invalide.");
  const valid = await verifyOtp(target, isEmail ? "email" : "whatsapp", "ballot", parsed.data.code);
  if (!valid) return fail("Code incorrect ou expiré.", 401);

  const db = createAdminClient();
  let q = db.from("electors").select("id, has_voted").eq("event_id", parsed.data.eventId);
  q = isEmail ? q.ilike("email", target) : q.eq("phone", target);
  const { data: el } = await q.maybeSingle();
  if (!el) return fail("Vous ne figurez pas sur la liste électorale de ce scrutin.", 403);
  if (el.has_voted) return fail("Vous avez déjà voté pour ce scrutin.", 409);
  await setVoterSession(el.id, "elector", parsed.data.eventId, 20);
  return ok({ verified: true });
}
