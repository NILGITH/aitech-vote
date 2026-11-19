import { createAdminClient } from "@/lib/supabase/admin";
import { getCredential } from "@/lib/credentials";
import { checkWebhookSecret } from "@/lib/providers/kkiapay";
import { confirmPayment } from "@/lib/votes";
import { fail, ok } from "@/lib/http";

/**
 * Webhook Kkiapay : filet de sécurité si le votant ferme la page après avoir payé.
 * 1) on retrouve le paiement par la référence passée au widget,
 * 2) on contrôle l'en-tête x-kkiapay-secret avec le secret de l'événement,
 * 3) on revérifie quand même la transaction via l'API Kkiapay avant de compter le vote.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.transactionId) return fail("payload", 400);
  const state = (body.stateData ?? {}) as Record<string, unknown>;
  const reference = String(state.reference ?? state.data ?? body.partnerId ?? "");
  if (!reference.startsWith("AV-")) return ok({ ignored: true });

  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("id, event_id, status").eq("reference", reference).maybeSingle();
  if (!payment) return ok({ ignored: true });

  const cred = await getCredential("kkiapay", payment.event_id);
  if (!cred || !checkWebhookSecret(cred, req.headers.get("x-kkiapay-secret"))) return fail("unauthorized", 401);

  if (body.event === "transaction.failed" || body.isPaymentSucces === false) {
    if (payment.status === "pending") await db.from("payments").update({ status: "failed", failure_reason: body.failureMessage ?? "failed", provider_payload: body }).eq("id", payment.id);
    return ok({ received: true });
  }
  try {
    await confirmPayment(payment.id, String(body.transactionId));
  } catch (e) {
    console.error("webhook kkiapay", e instanceof Error ? e.message : e);
  }
  return ok({ received: true });
}
