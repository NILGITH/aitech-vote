import { z } from "zod";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import { setVoterSession } from "@/lib/voter-session";
import { fail, ok } from "@/lib/http";

const Body = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Code invalide.");
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return fail("Numéro invalide.");
  const valid = await verifyOtp(phone, "whatsapp", "vote", parsed.data.code);
  if (!valid) return fail("Code incorrect ou expiré.", 401);
  await setVoterSession(phone, "phone", "vote");
  return ok({ verified: true, phone: maskPhone(phone) });
}
