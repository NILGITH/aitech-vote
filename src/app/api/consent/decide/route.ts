import { z } from "zod";
import { decideConsent, withdrawConsent } from "@/lib/consent";
import { clientIp, fail, ok, userAgent } from "@/lib/http";

const Body = z.object({ token: z.string().min(20).max(100), decision: z.enum(["accept", "refuse", "report", "withdraw"]), note: z.string().max(500).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Requête invalide.");
  try {
    const ip = await clientIp();
    if (parsed.data.decision === "withdraw") {
      await withdrawConsent(parsed.data.token, ip);
      return ok({ done: true });
    }
    const r = await decideConsent(parsed.data.token, parsed.data.decision, ip, await userAgent(), parsed.data.note);
    return ok({ done: true, slug: r.candidate.events.slug, code: r.candidate.code });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erreur", 400);
  }
}
