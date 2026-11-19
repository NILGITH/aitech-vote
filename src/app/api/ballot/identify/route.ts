import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { OtpError, sendOtp } from "@/lib/otp";
import { fail, ok } from "@/lib/http";

const Body = z.object({ eventId: z.string().uuid(), identifier: z.string().min(4).max(120) });

/**
 * Identification de l'électeur sur la liste électorale, puis envoi d'un code
 * (e-mail via Resend ou WhatsApp via Kapso). La réponse ne révèle pas si la
 * personne est inscrite, pour protéger la liste.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Saisissez votre e-mail ou votre numéro.");
  const db = createAdminClient();
  const id = parsed.data.identifier.trim();
  const isEmail = id.includes("@");
  const phone = isEmail ? null : normalizePhone(id);
  if (!isEmail && !phone) return fail("Numéro ou e-mail invalide.");

  let q = db.from("electors").select("id, email, phone, has_voted").eq("event_id", parsed.data.eventId);
  q = isEmail ? q.ilike("email", id) : q.eq("phone", phone!);
  const { data: el } = await q.maybeSingle();

  const generic = { sent: true, channel: isEmail ? "email" : "whatsapp" };
  if (!el) return ok(generic);
  if (el.has_voted) return fail("Vous avez déjà voté pour ce scrutin. Utilisez votre code de vérification pour retrouver votre bulletin.", 409);
  try {
    await sendOtp(isEmail ? el.email!.toLowerCase() : el.phone!, isEmail ? "email" : "whatsapp", "ballot");
  } catch (e) {
    if (e instanceof OtpError) return fail(e.message, 429);
    console.error("ballot/identify", e);
    return fail("Impossible d'envoyer le code pour le moment.", 503);
  }
  return ok(generic);
}
