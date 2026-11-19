import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCredential } from "@/lib/credentials";
import { verifyTransaction, methodLabel } from "@/lib/providers/kkiapay";
import { receiptCode, sha256 } from "@/lib/crypto";

export function fingerprint(...parts: string[]) {
  return sha256(parts.join("|")).slice(0, 16);
}

/**
 * Confirme un paiement : vérifie la transaction auprès de Kkiapay avec les clés
 * de l'événement, puis enregistre le vote de façon atomique et idempotente.
 * Utilisé par le retour du widget ET par le webhook (le premier arrivé gagne).
 */
export async function confirmPayment(paymentId: string, transactionId: string) {
  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!payment) throw new Error("payment_not_found");
  if (payment.status === "success") {
    const { data: v } = await db.from("votes").select("receipt_code, quantity").eq("payment_id", payment.id).maybeSingle();
    return { receipt: v?.receipt_code as string, votes: v?.quantity as number };
  }

  const cred = await getCredential("kkiapay", payment.event_id);
  if (!cred) throw new Error("Kkiapay n'est pas configuré pour cet événement");
  const tx = await verifyTransaction(cred, transactionId);
  if (String(tx.status).toUpperCase() !== "SUCCESS") {
    await db.from("payments").update({ status: tx.status === "FAILED" ? "failed" : "pending", provider_payload: tx, failure_reason: String(tx.status) }).eq("id", payment.id);
    throw new Error(tx.status === "FAILED" ? "Le paiement a échoué." : "Paiement en attente de confirmation.");
  }

  if (Math.round(Number(tx.amount)) < payment.amount_xof) {
    await db.from("payments").update({ status: "failed", failure_reason: "amount_mismatch", provider_payload: tx }).eq("id", payment.id);
    throw new Error("Le paiement a échoué : montant incorrect.");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = receiptCode("AV");
    const { data, error } = await db.rpc("confirm_paid_vote", {
      p_payment_id: payment.id,
      p_transaction_id: transactionId,
      p_method: methodLabel(tx.source, tx.source_common_name),
      p_payload: tx,
      p_paid_amount: Math.round(Number(tx.amount)),
      p_receipt_code: code,
      p_fingerprint: fingerprint(code, payment.id, payment.candidate_id, transactionId),
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return { receipt: row.receipt_code as string, votes: row.total_votes as number };
    }
    if (!/duplicate key.*receipts/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error("Impossible de générer le reçu");
}
