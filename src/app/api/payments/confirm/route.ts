import { z } from "zod";
import { confirmPayment } from "@/lib/votes";
import { fail, ok } from "@/lib/http";

const Body = z.object({ paymentId: z.string().uuid(), transactionId: z.string().min(3).max(80) });

/** Retour du widget : le vote ne compte qu'après vérification serveur auprès de Kkiapay. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Requête invalide.");
  try {
    const r = await confirmPayment(parsed.data.paymentId, parsed.data.transactionId);
    return ok(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    console.error("payments/confirm", msg);
    if (msg.includes("attente")) return fail(msg, 202);
    return fail(msg.startsWith("Le paiement") ? msg : "Paiement non confirmé. Si vous avez été débité, votre vote sera ajouté automatiquement dès confirmation.", 402);
  }
}
