import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { OtpError, sendOtp } from "@/lib/otp";
import { fail, ok } from "@/lib/http";

const Body = z.object({ phone: z.string().min(6).max(24) });

/** Envoie un code de vérification par WhatsApp (Kapso) pour voter. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Numéro invalide.");
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return fail("Numéro invalide. Exemple : 07 08 12 34 56");
  try {
    const r = await sendOtp(phone, "whatsapp", "vote");
    return ok({ sent: true, channel: "whatsapp", ...r });
  } catch (e) {
    if (e instanceof OtpError) return fail(e.message, 429);
    console.error("otp/send", e);
    return fail("Impossible d'envoyer le code pour le moment. Réessayez dans un instant.", 503);
  }
}
