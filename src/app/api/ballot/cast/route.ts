import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearVoterSession, getVoterSession } from "@/lib/voter-session";
import { receiptCode } from "@/lib/crypto";
import { fingerprint } from "@/lib/votes";
import { fail, ok, sqlErrorMessage } from "@/lib/http";

const Body = z.object({ eventId: z.string().uuid(), choices: z.record(z.string().uuid(), z.array(z.string().uuid()).max(50)) });

/** Dépôt du bulletin : l'électeur est marqué « a voté », le bulletin n'a aucun lien avec lui. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Bulletin invalide.");
  const session = await getVoterSession("elector", parsed.data.eventId);
  if (!session) return fail("Votre session a expiré. Identifiez-vous à nouveau.", 401);

  const db = createAdminClient();
  const code = receiptCode("EL");
  // L'empreinte ne contient ni l'électeur ni ses choix : uniquement le code et l'événement
  const { error } = await db.rpc("cast_ballot", {
    p_elector_id: session.sub,
    p_choices: parsed.data.choices,
    p_receipt_code: code,
    p_fingerprint: fingerprint(code, parsed.data.eventId, String(Math.random())),
  });
  if (error) return fail(sqlErrorMessage(error.message));
  await clearVoterSession();
  return ok({ receipt: code });
}
