import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyedHash, otpCode, safeEqual } from "@/lib/crypto";
import { sendWhatsAppCode } from "@/lib/providers/kapso";
import { sendMail } from "@/lib/providers/resend";

const TTL_MIN = 10;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export type OtpChannel = "whatsapp" | "email";
export type OtpPurpose = "vote" | "ballot";

/** Envoie un code à 6 chiffres. Le code n'est stocké que haché. */
export async function sendOtp(target: string, channel: OtpChannel, purpose: OtpPurpose) {
  const db = createAdminClient();
  const targetHash = keyedHash(`${channel}:${target}`, "otp");
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("otp_codes").select("id", { count: "exact", head: true }).eq("target_hash", targetHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) throw new OtpError("Trop de codes demandés. Réessayez dans une heure.");

  const code = otpCode();
  const { error } = await db.from("otp_codes").insert({
    target_hash: targetHash,
    code_hash: keyedHash(code, `otp-code:${targetHash}`),
    purpose,
    expires_at: new Date(Date.now() + TTL_MIN * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);

  if (channel === "whatsapp") {
    await sendWhatsAppCode(target, code);
  } else {
    await sendMail({
      to: target,
      subject: `Votre code Aitech Vote : ${code}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:16px;color:#0B1B33"><p>Votre code de vérification :</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p style="color:#5B6478">Valable ${TTL_MIN} minutes. Ne le communiquez à personne.</p></div>`,
    });
  }
  return { expiresInMin: TTL_MIN };
}

export class OtpError extends Error {}

/** Vérifie un code ; usage unique, 5 essais maximum. */
export async function verifyOtp(target: string, channel: OtpChannel, purpose: OtpPurpose, code: string): Promise<boolean> {
  const db = createAdminClient();
  const targetHash = keyedHash(`${channel}:${target}`, "otp");
  const { data: row } = await db
    .from("otp_codes")
    .select("*")
    .eq("target_hash", targetHash)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return false;
  if (row.attempts >= MAX_ATTEMPTS) return false;
  const ok = safeEqual(row.code_hash, keyedHash(code.trim(), `otp-code:${targetHash}`));
  await db.from("otp_codes").update(ok ? { consumed_at: new Date().toISOString() } : { attempts: row.attempts + 1 }).eq("id", row.id);
  return ok;
}
