"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { sendConsentEmail } from "@/lib/consent";
import { payoutSummary } from "@/lib/commission";
import { normalizePhone } from "@/lib/phone";
import { slugify } from "@/lib/format";
import { env } from "@/lib/env";
import type { ActionState } from "@/components/ui/Field";
import type { Mode } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string, d = 0) => { const v = Number(String(f.get(k) ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(v) ? v : d; };
const b = (f: FormData, k: string) => f.get(k) === "on";
const dt = (f: FormData, k: string) => { const v = s(f, k); return v ? new Date(v).toISOString() : null; };

async function ownEvent(eventId: string) {
  const db = await createClient();
  const { data } = await db.from("events").select("id, organizer_id, slug").eq("id", eventId).maybeSingle();
  if (!data) throw new Error("Événement introuvable");
  return { db, event: data };
}

function refresh(eventId: string) {
  revalidatePath(`/organisateur/evenements/${eventId}`, "layout");
}

// ---------- Événements ----------
export async function createEvent(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireProfile(["organizer", "super_admin"]);
  const db = await createClient();
  const title = s(f, "title");
  if (title.length < 3) return { error: "Indiquez un titre." };
  const type = s(f, "event_type") || "awards";
  const modes: Mode[] = type === "election" ? ["election"] : ["paid"];
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await db
    .from("events")
    .insert({ organizer_id: me.id, title, slug, event_type: type, modes, status: "draft", require_otp: true })
    .select("id")
    .single();
  if (error) return { error: "Création impossible : " + error.message };
  redirect(`/organisateur/evenements/${data.id}`);
}

export async function updateEvent(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const modes = (["paid", "free", "jury", "election", "live"] as const).filter((m) => b(f, `mode_${m}`));
  if (!modes.length) return { error: "Choisissez au moins un mode de vote." };
  if (modes.includes("election") && (modes.includes("paid") || modes.includes("free"))) return { error: "Une élection à bulletin secret ne se combine pas avec le vote public." };
  const packs = [1, 2, 3, 4, 5]
    .map((i) => ({ votes: n(f, `pack${i}_votes`), bonus: n(f, `pack${i}_bonus`) }))
    .filter((p) => p.votes > 0)
    .map((p) => ({ votes: Math.round(p.votes), bonus: Math.max(0, Math.round(p.bonus)) }));
  const short = s(f, "short_code").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { error } = await db
    .from("events")
    .update({
      title: s(f, "title"),
      description: s(f, "description") || null,
      event_type: s(f, "event_type"),
      location: s(f, "location") || null,
      cover_url: s(f, "cover_url") || null,
      starts_at: dt(f, "starts_at"),
      vote_opens_at: dt(f, "vote_opens_at"),
      vote_closes_at: dt(f, "vote_closes_at"),
      modes,
      jury_weight: modes.includes("jury") && (modes.includes("paid") || modes.includes("free")) ? Math.min(100, Math.max(0, Math.round(n(f, "jury_weight")))) : modes.includes("jury") ? 100 : 0,
      price_per_vote_xof: Math.max(0, Math.round(n(f, "price_per_vote_xof", 100))),
      packs: packs.length ? packs : [{ votes: 1, bonus: 0 }],
      require_otp: b(f, "require_otp"),
      free_votes_per_day: Math.max(1, Math.round(n(f, "free_votes_per_day", 1))),
      max_paid_votes_per_hour: Math.max(1, Math.round(n(f, "max_paid_votes_per_hour", 200))),
      show_live_results: b(f, "show_live_results"),
      short_code: short.length >= 3 ? short.slice(0, 12) : null,
    })
    .eq("id", eventId);
  if (error) return { error: error.message.includes("short_code") ? "Ce code d'écran est déjà pris." : error.message };
  refresh(eventId);
  return { ok: true };
}

export async function setEventStatus(eventId: string, status: "published" | "closed" | "draft", _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  if (status === "published") {
    const { count } = await db.from("categories").select("id", { count: "exact", head: true }).eq("event_id", eventId);
    if (!count) return { error: "Ajoutez au moins une catégorie avant de publier." };
  }
  const { error } = await db.from("events").update({ status }).eq("id", eventId);
  if (error) return { error: error.message.includes("non validé") ? "Votre compte doit être validé par un administrateur avant de publier." : error.message };
  refresh(eventId);
  revalidatePath("/");
  return { ok: true, message: status === "published" ? "Événement publié" : status === "closed" ? "Vote clôturé" : "Repassé en brouillon" };
}

// ---------- Catégories ----------
export async function addCategory(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const name = s(f, "name");
  if (!name) return { error: "Nom requis." };
  const { count } = await db.from("categories").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const { error } = await db.from("categories").insert({ event_id: eventId, name, description: s(f, "description") || null, max_choices: Math.max(1, Math.round(n(f, "max_choices", 1))), position: count ?? 0 });
  if (error) return { error: error.message };
  refresh(eventId);
  return { ok: true, message: "Catégorie ajoutée" };
}

export async function deleteCategory(eventId: string, categoryId: string, _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const { error } = await db.from("categories").delete().eq("id", categoryId).eq("event_id", eventId);
  if (error) return { error: "Suppression impossible (des votes existent peut-être)." };
  refresh(eventId);
  return { ok: true };
}

// ---------- Candidats ----------
export async function saveCandidate(eventId: string, candidateId: string | null, _: ActionState, f: FormData): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const code = s(f, "code").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (code.length < 2) return { error: "Code candidat requis (ex. MUS-014)." };
  const social: Record<string, string> = {};
  for (const k of ["instagram", "facebook", "tiktok", "youtube"]) if (s(f, k)) social[k] = s(f, k);
  const row = {
    category_id: s(f, "category_id"),
    code,
    display_name: s(f, "display_name"),
    bio: s(f, "bio") || null,
    photo_url: s(f, "photo_url") || null,
    video_url: s(f, "video_url") || null,
    social,
  };
  if (!row.display_name || !row.category_id) return { error: "Nom et catégorie requis." };
  const email = s(f, "email").toLowerCase() || null;
  const phone = s(f, "phone") ? normalizePhone(s(f, "phone")) : null;

  let id = candidateId;
  if (id) {
    const { error } = await db.from("candidates").update(row).eq("id", id).eq("event_id", eventId);
    if (error) return { error: error.message.includes("duplicate") ? "Ce code est déjà utilisé." : error.message };
    await db.from("candidate_private").update({ email, phone }).eq("candidate_id", id);
  } else {
    const { data, error } = await db.from("candidates").insert({ ...row, event_id: eventId }).select("id").single();
    if (error) return { error: error.message.includes("duplicate") ? "Ce code est déjà utilisé." : error.message };
    id = data.id;
    await db.from("candidate_private").insert({ candidate_id: id, event_id: eventId, email, phone });
  }
  refresh(eventId);
  return { ok: true, message: candidateId ? "Candidat mis à jour" : "Candidat ajouté (profil masqué en attente de consentement)" };
}

export async function deleteCandidate(eventId: string, candidateId: string, _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const { error } = await db.from("candidates").delete().eq("id", candidateId).eq("event_id", eventId);
  if (error) return { error: "Suppression impossible : ce candidat a déjà reçu des votes." };
  refresh(eventId);
  return { ok: true };
}

export async function requestConsent(eventId: string, candidateId: string, _: ActionState): Promise<ActionState> {
  const me = await requireProfile(["organizer", "super_admin"]);
  const { db } = await ownEvent(eventId);
  const { data: c } = await db.from("candidates").select("id, consent_status").eq("id", candidateId).eq("event_id", eventId).maybeSingle();
  if (!c) return { error: "Candidat introuvable." };
  try {
    await sendConsentEmail(candidateId, me.id, c.consent_status === "pending");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Envoi impossible." };
  }
  refresh(eventId);
  return { ok: true, message: "Demande de consentement envoyée" };
}

export async function requestAllConsents(eventId: string, _: ActionState): Promise<ActionState> {
  const me = await requireProfile(["organizer", "super_admin"]);
  const { db } = await ownEvent(eventId);
  const { data } = await db.from("candidates").select("id, consent_status").eq("event_id", eventId).in("consent_status", ["not_sent", "pending"]);
  let sent = 0;
  const errors: string[] = [];
  for (const c of data ?? []) {
    try { await sendConsentEmail(c.id, me.id, c.consent_status === "pending"); sent++; } catch (e) { errors.push(e instanceof Error ? e.message : "erreur"); }
  }
  refresh(eventId);
  return errors.length ? { error: `${sent} envoyée(s), ${errors.length} échec(s) : ${errors[0]}` } : { ok: true, message: `${sent} demande(s) envoyée(s)` };
}

// ---------- Jury ----------
export async function inviteJuror(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  await ownEvent(eventId);
  const email = s(f, "email").toLowerCase();
  const name = s(f, "full_name");
  if (!email.includes("@")) return { error: "E-mail invalide." };
  const admin = createAdminClient();
  let { data: prof } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (!prof) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${env.siteUrl()}/auth/callback?next=/compte/mot-de-passe` });
    if (error || !data.user) return { error: "Invitation impossible : " + (error?.message ?? "") };
    await admin.from("profiles").update({ role: "jury", status: "active", full_name: name }).eq("id", data.user.id);
    prof = { id: data.user.id, role: "jury" };
  }
  const { error } = await admin.from("jury_members").upsert({ event_id: eventId, user_id: prof.id });
  if (error) return { error: error.message };
  refresh(eventId);
  return { ok: true, message: "Juré ajouté (invitation envoyée par e-mail s'il n'avait pas de compte)" };
}

export async function removeJuror(eventId: string, userId: string, _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  await db.from("jury_members").delete().eq("event_id", eventId).eq("user_id", userId);
  refresh(eventId);
  return { ok: true };
}

export async function addCriterion(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const name = s(f, "name");
  if (!name) return { error: "Nom du critère requis." };
  const { count } = await db.from("criteria").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const { error } = await db.from("criteria").insert({ event_id: eventId, name, weight: Math.max(0.1, n(f, "weight", 1)), max_score: Math.max(1, Math.round(n(f, "max_score", 10))), position: count ?? 0 });
  if (error) return { error: error.message };
  refresh(eventId);
  return { ok: true };
}

export async function deleteCriterion(eventId: string, id: string, _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  await db.from("criteria").delete().eq("id", id).eq("event_id", eventId);
  refresh(eventId);
  return { ok: true };
}

// ---------- Électeurs ----------
export async function importElectors(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const lines = s(f, "list").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((l) => {
    const [full_name, email, phone, external_id] = l.split(/[;,\t]/).map((x) => (x ?? "").trim());
    return { event_id: eventId, full_name, email: email?.includes("@") ? email.toLowerCase() : null, phone: phone ? normalizePhone(phone) : null, external_id: external_id || null };
  }).filter((r) => r.full_name && (r.email || r.phone));
  if (!rows.length) return { error: "Aucune ligne valide. Format : Nom ; e-mail ; téléphone" };
  let added = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await db.from("electors").upsert(rows.slice(i, i + 200), { onConflict: "event_id,email", ignoreDuplicates: true }).select("id");
    if (error) {
      // Repli ligne par ligne (doublons de téléphone)
      for (const r of rows.slice(i, i + 200)) { const { error: e2 } = await db.from("electors").insert(r); if (!e2) added++; }
    } else added += data?.length ?? 0;
  }
  refresh(eventId);
  return { ok: true, message: `${added} électeur(s) ajouté(s) sur ${rows.length} ligne(s)` };
}

export async function deleteElector(eventId: string, id: string, _: ActionState): Promise<ActionState> {
  const { db } = await ownEvent(eventId);
  const { error } = await db.from("electors").delete().eq("id", id).eq("event_id", eventId).eq("has_voted", false);
  if (error) return { error: error.message };
  refresh(eventId);
  return { ok: true };
}

// ---------- Reversements ----------
export async function requestPayout(eventId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireProfile(["organizer", "super_admin"]);
  const { db, event } = await ownEvent(eventId);
  const sum = await payoutSummary(event.organizer_id, eventId);
  const amount = Math.round(n(f, "amount"));
  if (amount < sum.minPayout) return { error: `Montant minimum : ${sum.minPayout} FCFA.` };
  if (amount > sum.available) return { error: "Montant supérieur au solde disponible." };
  const { error } = await db.from("payout_requests").insert({ organizer_id: me.id, event_id: eventId, amount_xof: amount, method: s(f, "method"), destination: s(f, "destination") });
  if (error) return { error: error.message };
  refresh(eventId);
  return { ok: true, message: "Demande de reversement envoyée" };
}
