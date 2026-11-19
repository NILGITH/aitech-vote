"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { saveCredential, type Provider, PROVIDER_FIELDS, getCredential, markTested } from "@/lib/credentials";
import { testResend } from "@/lib/providers/resend";
import { testKapso } from "@/lib/providers/kapso";
import { verifyTransaction } from "@/lib/providers/kkiapay";
import { sendConsentEmail } from "@/lib/consent";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/components/ui/Field";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(/\s/g, "").replace(",", "."));

async function audit(actor: string, action: string, entity: string, entityId: string, details: Record<string, unknown> = {}) {
  await createAdminClient().from("audit_log").insert({ actor_id: actor, action, entity, entity_id: entityId, details });
}

// ---------- Modules et moyens de paiement ----------
export async function saveModules(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const keys = ["paid", "free", "jury", "election", "live", "consent_required", "whatsapp", "ussd", "ticketing"];
  const pays = ["wave", "orange_money", "mtn", "moov", "card"];
  const modules = Object.fromEntries(keys.map((k) => [k, f.get(`m_${k}`) === "on"]));
  const payment_methods = Object.fromEntries(pays.map((k) => [k, f.get(`p_${k}`) === "on"]));
  modules.consent_required = true; // non désactivable : exigence de publication
  const { error } = await createAdminClient().from("site_settings").update({ modules, payment_methods, updated_by: me.id, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  await audit(me.id, "settings.modules", "site_settings", "1", { modules, payment_methods });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Tarifs ----------
export async function savePlan(planId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const row = {
    name: s(f, "name"),
    price_xof: Math.max(0, Math.round(num(f, "price_xof") || 0)),
    commission_pct: Math.min(100, Math.max(0, num(f, "commission_pct") || 0)),
    max_events_month: Math.round(num(f, "max_events_month") || 0),
    max_candidates: Math.round(num(f, "max_candidates") || 0),
    features: s(f, "features").split("\n").map((x) => x.trim()).filter(Boolean),
    is_visible: f.get("is_visible") === "on",
    updated_at: new Date().toISOString(),
  };
  if (!row.name) return { error: "Nom requis." };
  const db = createAdminClient();
  const { error } = planId === "new"
    ? await db.from("plans").insert({ ...row, slug: row.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36), display_order: 99 })
    : await db.from("plans").update(row).eq("id", planId);
  if (error) return { error: error.message };
  await audit(me.id, "plans.save", "plans", planId, row);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePlatformConfig(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const fee = s(f, "kkiapay_fee_pct");
  const row = {
    kkiapay_fee_pct: fee === "" ? null : Math.max(0, Number(fee.replace(",", "."))),
    fee_bearer: s(f, "fee_bearer"),
    min_payout_xof: Math.max(0, Math.round(num(f, "min_payout_xof") || 0)),
    payout_delay: s(f, "payout_delay"),
    election_fee_per_voter_xof: s(f, "election_fee_per_voter_xof") ? Math.round(num(f, "election_fee_per_voter_xof")) : null,
    terms_version: s(f, "terms_version") || "2026-11",
    updated_at: new Date().toISOString(),
  };
  const { error } = await createAdminClient().from("platform_config").update(row).eq("id", 1);
  if (error) return { error: error.message };
  await audit(me.id, "platform_config.save", "platform_config", "1", row);
  return { ok: true };
}

export async function addOverride(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const { error } = await createAdminClient().from("commission_overrides").insert({ organizer_id: s(f, "organizer_id"), commission_pct: num(f, "commission_pct"), valid_until: s(f, "valid_until") || null, note: s(f, "note") || null });
  if (error) return { error: error.message };
  await audit(me.id, "override.add", "commission_overrides", s(f, "organizer_id"), { pct: num(f, "commission_pct") });
  revalidatePath("/admin/tarifs");
  return { ok: true };
}

export async function deleteOverride(id: string, _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  await createAdminClient().from("commission_overrides").delete().eq("id", id);
  await audit(me.id, "override.delete", "commission_overrides", id);
  revalidatePath("/admin/tarifs");
  return { ok: true };
}

// ---------- Apparence ----------
export async function saveAppearance(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const hex = (v: string, d: string) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
  const theme = {
    primary: hex(s(f, "primary"), "#1F6FE5"),
    accent: hex(s(f, "accent"), "#F2A516"),
    ink: hex(s(f, "ink"), "#0B1B33"),
    headingFont: ["Sora", "Poppins", "Montserrat"].includes(s(f, "headingFont")) ? s(f, "headingFont") : "Sora",
    radius: Math.min(28, Math.max(0, Math.round(num(f, "radius") || 16))),
    animation: ["none", "soft", "dynamic"].includes(s(f, "animation")) ? s(f, "animation") : "soft",
  };
  const order = s(f, "sections_order").split(",").filter(Boolean);
  const labels: Record<string, string> = { hero: "Bandeau principal", feed: "Fil des votes en direct", events: "Événements en cours", modes: "Cinq façons de voter", steps: "Voter en 3 étapes", pricing: "Tarifs" };
  const home_sections = order.filter((k) => labels[k]).map((key) => ({ key, label: labels[key], visible: f.get(`sec_${key}`) === "on" }));
  const content = { heroTitle: s(f, "heroTitle"), heroHighlight: s(f, "heroHighlight"), heroText: s(f, "heroText") };
  const { error } = await createAdminClient().from("site_settings").update({ theme, home_sections, content, updated_by: me.id, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  await audit(me.id, "settings.appearance", "site_settings", "1", { theme });
  revalidatePath("/", "layout");
  return { ok: true, message: "Changements publiés sur le site" };
}

// ---------- Clés API ----------
export async function saveApiKey(provider: Provider, eventId: string | null, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const fields = PROVIDER_FIELDS[provider];
  const config = Object.fromEntries(fields.public.map((x) => [x.key, s(f, x.key)]).filter(([, v]) => v !== ""));
  const secrets = Object.fromEntries(fields.secret.map((x) => [x.key, s(f, x.key)]));
  try {
    await saveCredential({ provider, eventId, config, secrets, isActive: f.get("is_active") === "on", actorId: me.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur" };
  }
  revalidatePath("/admin/cles-api");
  return { ok: true, message: "Clés enregistrées (chiffrées)" };
}

export async function deleteApiKey(provider: Provider, eventId: string | null, _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  let q = createAdminClient().from("api_credentials").delete().eq("provider", provider);
  q = eventId ? q.eq("event_id", eventId) : q.is("event_id", null);
  await q;
  await audit(me.id, "api_credentials.delete", provider, eventId ?? "default");
  revalidatePath("/admin/cles-api");
  return { ok: true, message: "Clés supprimées" };
}

export async function testApiKey(provider: Provider, eventId: string | null, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  try {
    if (provider === "resend") {
      await testResend(s(f, "test_to") || me.email || "");
      return { ok: true, message: "E-mail de test envoyé" };
    }
    if (provider === "kapso") {
      const to = normalizePhone(s(f, "test_to"));
      if (!to) return { error: "Numéro de test invalide." };
      await testKapso(to);
      return { ok: true, message: "Message WhatsApp de test envoyé" };
    }
    // Kkiapay : on interroge l'API avec un identifiant factice ; une réponse « introuvable »
    // prouve que les clés sont acceptées, une erreur d'authentification non.
    const cred = await getCredential("kkiapay", eventId);
    if (!cred) return { error: "Aucune clé enregistrée." };
    try {
      await verifyTransaction(cred, "test-connexion-aitech");
      await markTested(cred.id, true);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      const authFail = /40[13]/.test(m);
      await markTested(cred.id, !authFail);
      if (authFail) return { error: "Clés refusées par Kkiapay." };
    }
    return { ok: true, message: "Connexion Kkiapay établie" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec du test" };
  }
}

// ---------- Organisateurs ----------
export async function setOrganizerStatus(userId: string, status: "active" | "suspended" | "pending", _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  if (userId === me.id) return { error: "Vous ne pouvez pas modifier votre propre compte ici." };
  const { error } = await createAdminClient().from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(me.id, "profile.status", "profiles", userId, { status });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setRole(userId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const role = s(f, "role");
  if (!["organizer", "jury", "super_admin"].includes(role)) return { error: "Rôle invalide." };
  if (userId === me.id) return { error: "Vous ne pouvez pas modifier votre propre rôle." };
  const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(me.id, "profile.role", "profiles", userId, { role });
  revalidatePath("/admin/organisateurs");
  return { ok: true };
}

export async function assignPlan(userId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const db = createAdminClient();
  await db.from("subscriptions").update({ status: "cancelled" }).eq("organizer_id", userId).eq("status", "active");
  const months = Math.max(1, Math.round(num(f, "months") || 1));
  const { error } = await db.from("subscriptions").insert({ organizer_id: userId, plan_id: s(f, "plan_id"), status: "active", ends_at: new Date(Date.now() + months * 30 * 86400_000).toISOString() });
  if (error) return { error: error.message };
  await audit(me.id, "subscription.assign", "profiles", userId, { plan: s(f, "plan_id"), months });
  revalidatePath("/admin/organisateurs");
  return { ok: true };
}

// ---------- Événements ----------
export async function adminSetEventStatus(eventId: string, status: string, _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  const { error } = await createAdminClient().from("events").update({ status }).eq("id", eventId);
  if (error) return { error: error.message };
  await audit(me.id, "event.status", "events", eventId, { status });
  revalidatePath("/admin/evenements");
  revalidatePath("/");
  return { ok: true };
}

// ---------- Candidats ----------
export async function adminResendConsent(candidateId: string, _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  try { await sendConsentEmail(candidateId, me.id, true); } catch (e) { return { error: e instanceof Error ? e.message : "Erreur" }; }
  revalidatePath("/admin/candidats");
  return { ok: true, message: "E-mail renvoyé" };
}

export async function adminUnpublish(candidateId: string, _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  const { error } = await createAdminClient().from("candidates").update({ is_published: false, consent_status: "withdrawn" }).eq("id", candidateId);
  if (error) return { error: error.message };
  await audit(me.id, "candidate.unpublish", "candidates", candidateId);
  revalidatePath("/admin/candidats");
  return { ok: true, message: "Publication retirée" };
}

// ---------- Paiements, fraude ----------
export async function setPayoutStatus(id: string, status: "approved" | "paid" | "rejected", _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  const { error } = await createAdminClient().from("payout_requests").update({ status, processed_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  await audit(me.id, "payout.status", "payout_requests", id, { status });
  revalidatePath("/admin/paiements");
  return { ok: true };
}

export async function resolveAlert(id: string, status: "resolved" | "dismissed", _: ActionState): Promise<ActionState> {
  const me = await requireAdmin();
  await createAdminClient().from("fraud_alerts").update({ status }).eq("id", id);
  await audit(me.id, "fraud.resolve", "fraud_alerts", id, { status });
  revalidatePath("/admin/anti-fraude");
  return { ok: true };
}
