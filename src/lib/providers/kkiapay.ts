import "server-only";
import type { ResolvedCredential } from "@/lib/credentials";
import { safeEqual } from "@/lib/crypto";

const BASE = { sandbox: "https://api-sandbox.kkiapay.me", live: "https://api.kkiapay.me" };

export type KkiapayTransaction = {
  transactionId: string;
  status: string; // SUCCESS | FAILED | PENDING …
  amount: number;
  source?: string;
  source_common_name?: string;
  state?: unknown;
  partnerId?: string;
  reason?: string;
  [k: string]: unknown;
};

export function isSandbox(cred: ResolvedCredential): boolean {
  return String(cred.config.sandbox ?? "true").toLowerCase() !== "false";
}

/** Vérifie une transaction auprès de Kkiapay (source de vérité, jamais le navigateur). */
export async function verifyTransaction(cred: ResolvedCredential, transactionId: string): Promise<KkiapayTransaction> {
  const { public_key } = cred.config;
  const { private_key, secret_key } = cred.secrets;
  if (!public_key || !private_key || !secret_key) throw new Error("Clés Kkiapay incomplètes");
  const res = await fetch(`${isSandbox(cred) ? BASE.sandbox : BASE.live}/api/v1/transactions/status`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": public_key,
      "x-private-key": private_key,
      "x-secret-key": secret_key,
    },
    body: JSON.stringify({ transactionId }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Kkiapay ${res.status} : ${body?.reason ?? body?.message ?? "transaction introuvable"}`);
  return body as KkiapayTransaction;
}

/** Contrôle l'en-tête x-kkiapay-secret envoyé par Kkiapay sur le webhook. */
export function checkWebhookSecret(cred: ResolvedCredential, headerValue: string | null): boolean {
  const expected = cred.secrets.webhook_secret;
  if (!expected || !headerValue) return false;
  return safeEqual(expected, headerValue);
}

export function methodLabel(source?: string, commonName?: string): string {
  const n = (commonName || "").toLowerCase();
  if (n.includes("wave")) return "Wave";
  if (n.includes("orange")) return "Orange Money";
  if (n.includes("mtn")) return "MTN MoMo";
  if (n.includes("moov")) return "Moov Money";
  if (source === "CARD") return "Carte bancaire";
  return source || "Mobile Money";
}
