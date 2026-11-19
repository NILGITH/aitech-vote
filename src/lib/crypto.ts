import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

function key(): Buffer {
  // Accepte une clé base64 de 32 octets ou n'importe quelle chaîne (dérivée par SHA-256)
  const raw = env.encryptionKey();
  const b = Buffer.from(raw, "base64");
  return b.length === 32 ? b : createHash("sha256").update(raw).digest();
}

/** Chiffre un objet JSON en AES-256-GCM. Format : v1.iv.tag.data (base64url). */
export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptJson<T = Record<string, string>>(payload: string): T {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1") throw new Error("Format de secret inconnu");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const out = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  return JSON.parse(out.toString("utf8")) as T;
}

/** Hachage à clé (HMAC-SHA256) : numéros, IP, jetons. Irréversible sans le secret. */
export function keyedHash(value: string, scope = "default"): string {
  return createHmac("sha256", env.signingSecret()).update(`${scope}:${value}`).digest("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
/** Code de reçu lisible : AV7-K4Q-92M */
export function receiptCode(prefix = "AV"): string {
  const pick = () => ALPHABET[randomInt(0, ALPHABET.length)];
  const block = () => pick() + pick() + pick();
  return `${prefix}${pick()}-${block()}-${block()}`;
}

export function hint(secret: string | undefined | null): string {
  if (!secret) return "";
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}
