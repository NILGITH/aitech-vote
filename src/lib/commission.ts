import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Taux applicable : exception négociée > plan actif > plan gratuit. */
export async function commissionFor(organizerId: string): Promise<{ pct: number; source: string }> {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: ov } = await db.from("commission_overrides").select("commission_pct, valid_until").eq("organizer_id", organizerId).order("created_at", { ascending: false });
  const o = (ov ?? []).find((x) => !x.valid_until || x.valid_until >= today);
  if (o) return { pct: Number(o.commission_pct), source: "Taux négocié" };
  const { data: sub } = await db.from("subscriptions").select("plans(name, commission_pct)").eq("organizer_id", organizerId).eq("status", "active").order("starts_at", { ascending: false }).limit(1).maybeSingle();
  const plan = (sub as unknown as { plans: { name: string; commission_pct: number } } | null)?.plans;
  if (plan) return { pct: Number(plan.commission_pct), source: `Plan ${plan.name}` };
  const { data: free } = await db.from("plans").select("name, commission_pct").eq("slug", "free").maybeSingle();
  return { pct: Number(free?.commission_pct ?? 0), source: `Plan ${free?.name ?? "Gratuit"}` };
}

export async function payoutSummary(organizerId: string, eventId: string) {
  const db = createAdminClient();
  const [{ data: pays }, { data: cfg }, { data: payouts }, com] = await Promise.all([
    db.from("payments").select("amount_xof").eq("event_id", eventId).eq("status", "success"),
    db.from("platform_config").select("kkiapay_fee_pct, fee_bearer, min_payout_xof").eq("id", 1).single(),
    db.from("payout_requests").select("amount_xof, status").eq("event_id", eventId).in("status", ["requested", "approved", "paid"]),
    commissionFor(organizerId),
  ]);
  const gross = (pays ?? []).reduce((a, p) => a + p.amount_xof, 0);
  const feePct = Number(cfg?.kkiapay_fee_pct ?? 0);
  const fees = cfg?.fee_bearer === "organizer" ? Math.round((gross * feePct) / 100) : 0;
  const commission = Math.round((gross * com.pct) / 100);
  const already = (payouts ?? []).reduce((a, p) => a + p.amount_xof, 0);
  return { gross, fees, feePct, commission, commissionPct: com.pct, commissionSource: com.source, already, available: Math.max(0, gross - fees - commission - already), minPayout: cfg?.min_payout_xof ?? 10000 };
}
