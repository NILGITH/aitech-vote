import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVoterSession } from "@/lib/voter-session";
import { keyedHash, receiptCode } from "@/lib/crypto";
import { clientIpHash, fail, ok, sqlErrorMessage, userAgent } from "@/lib/http";
import { fingerprint } from "@/lib/votes";

const Body = z.object({ candidateId: z.string().uuid() });

/** Vote gratuit : numéro vérifié obligatoire, quota par jour et par catégorie en base. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Requête invalide.");
  const session = await getVoterSession("phone", "vote");
  if (!session) return fail("Vérifiez d'abord votre numéro.", 401);

  const db = createAdminClient();
  const ipHash = await clientIpHash();
  // Garde-fou par adresse IP : 60 votes gratuits par heure maximum
  const { count } = await db.from("votes").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("kind", "free").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 60) return fail("Trop de votes depuis ce réseau. Réessayez plus tard.", 429);

  const code = receiptCode("AV");
  const { data, error } = await db.rpc("record_free_vote", {
    p_candidate_id: parsed.data.candidateId,
    p_phone_hash: keyedHash(session.sub, "phone"),
    p_ip_hash: ipHash,
    p_device_hash: keyedHash(await userAgent(), "ua"),
    p_receipt_code: code,
    p_fingerprint: fingerprint(code, parsed.data.candidateId, session.sub),
  });
  if (error) return fail(sqlErrorMessage(error.message));
  const row = Array.isArray(data) ? data[0] : data;
  return ok({ receipt: row.receipt_code, votes: 1, remaining: row.remaining });
}
