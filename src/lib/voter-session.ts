import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

/**
 * Session légère du votant après vérification OTP : cookie signé (HMAC),
 * HttpOnly, 30 minutes. Contient le numéro vérifié et la finalité.
 */
type Session = { sub: string; kind: "phone" | "elector"; scope: string; exp: number };
const NAME = "av_voter";

function sign(payload: string) {
  return createHmac("sha256", env.signingSecret()).update(`voter:${payload}`).digest("base64url");
}

export async function setVoterSession(sub: string, kind: Session["kind"], scope: string, minutes = 30) {
  const s: Session = { sub, kind, scope, exp: Date.now() + minutes * 60_000 };
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  (await cookies()).set(NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: minutes * 60,
  });
}

export async function getVoterSession(kind: Session["kind"], scope?: string): Promise<Session | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (s.exp < Date.now() || s.kind !== kind) return null;
    if (scope && s.scope !== scope) return null;
    return s;
  } catch {
    return null;
  }
}

export async function clearVoterSession() {
  (await cookies()).delete(NAME);
}
