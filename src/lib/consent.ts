import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendMail } from "@/lib/providers/resend";
import { env } from "@/lib/env";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Envoie (ou renvoie) l'e-mail de consentement à un candidat.
 * Le lien est personnel, valable 7 jours ; seul son hachage est conservé.
 */
export async function sendConsentEmail(candidateId: string, actorId: string, isReminder = false) {
  const db = createAdminClient();
  const { data: c } = await db.from("candidates").select("*, categories(name), events(title, organizer_id, profiles(organization_name, full_name))").eq("id", candidateId).single();
  const { data: priv } = await db.from("candidate_private").select("*").eq("candidate_id", candidateId).maybeSingle();
  if (!c) throw new Error("Candidat introuvable");
  if (!priv?.email) throw new Error("Ajoutez l'e-mail du candidat avant d'envoyer la demande.");
  const { data: cfg } = await db.from("platform_config").select("terms_version").eq("id", 1).single();

  const token = randomToken(32);
  const snapshot = {
    display_name: c.display_name,
    code: c.code,
    category: c.categories?.name,
    bio: c.bio,
    photo_url: c.photo_url,
    video_url: c.video_url,
    social: c.social,
  };
  const log = [...(priv.consent_log ?? []), { at: new Date().toISOString(), what: isReminder ? "reminder_sent" : "email_sent", by: actorId }];
  await db.from("candidate_private").update({
    consent_token_hash: sha256(token),
    consent_expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    consent_sent_at: new Date().toISOString(),
    consent_reminders: isReminder ? (priv.consent_reminders ?? 0) + 1 : priv.consent_reminders ?? 0,
    consent_snapshot: snapshot,
    consent_terms_version: cfg?.terms_version ?? null,
    consent_log: log,
  }).eq("candidate_id", candidateId);
  await db.from("candidates").update({ consent_status: "pending", is_published: false }).eq("id", candidateId);

  const org = c.events?.profiles?.organization_name || c.events?.profiles?.full_name || "L'organisateur";
  const link = `${env.siteUrl()}/consentement/${token}`;
  const first = esc(String(c.display_name).split(" ")[0]);
  const html = `
<div style="background:#E9EDF4;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0B1B33">
 <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#0B1B33;padding:20px 28px;color:#fff;font-size:19px;font-weight:700">Aitech Vote</div>
  <div style="padding:28px">
   <h1 style="margin:0 0 14px;font-size:22px">Bonjour ${first},</h1>
   <p style="font-size:16px;line-height:1.6;margin:0 0 14px"><strong>${esc(org)}</strong> vous a inscrit(e) dans la catégorie <strong>${esc(c.categories?.name ?? "")}</strong> de <strong>${esc(c.events?.title ?? "")}</strong>. Avant toute publication, nous avons besoin de votre accord.</p>
   <p style="font-size:15px;color:#4A5468;margin:0 0 10px">Voici exactement ce qui sera visible en ligne :</p>
   <div style="border:1px solid #E3E7EF;border-radius:12px;padding:16px;background:#F6F8FC;font-size:14px;line-height:1.6">
    <div style="font-size:18px;font-weight:700">${esc(c.display_name)}</div>
    <div style="color:#4A5468">${esc(c.categories?.name ?? "")} · Code <strong>${esc(c.code)}</strong></div>
    ${c.bio ? `<div style="margin-top:6px">« ${esc(c.bio)} »</div>` : ""}
    <div style="color:#5B6478;margin-top:6px">${[c.photo_url ? "Photo" : null, c.video_url ? "Vidéo" : null, Object.keys(c.social ?? {}).length ? "Réseaux sociaux" : null].filter(Boolean).join(" · ") || "Nom, catégorie et code"}</div>
    <div style="color:#5B6478;font-size:13px;margin-top:6px">Jamais publiés : votre e-mail et votre téléphone.</div>
   </div>
   <p style="font-size:14px;color:#4A5468;line-height:1.7">En acceptant, vous autorisez la publication de ce profil pendant la durée de l'événement, l'affichage de votre nombre de votes et de votre classement, et son utilisation sur l'écran de la soirée.</p>
   <a href="${link}" style="display:block;text-align:center;padding:18px;border-radius:12px;background:#12805C;color:#fff;text-decoration:none;font-weight:700;font-size:17px">Accepter et valider la publication</a>
   <p style="text-align:center;font-size:13px;color:#5B6478">Un seul clic suffit : votre profil sera publié automatiquement.</p>
   <p style="text-align:center;font-size:14px"><a href="${link}?action=refuser" style="color:#B42318;font-weight:600">Je refuse</a> &nbsp;·&nbsp; <a href="${link}?action=erreur" style="color:#1650B8;font-weight:600">Signaler une erreur</a></p>
   <p style="border-top:1px solid #E3E7EF;padding-top:14px;font-size:12px;color:#5B6478;line-height:1.6">Ce lien est personnel et expire dans 7 jours. Sans réponse, votre profil ne sera pas publié. Vous pourrez retirer votre accord à tout moment. Données traitées conformément à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel. AITECH Côte d'Ivoire, Abidjan.</p>
  </div>
 </div>
</div>`;
  await sendMail({ to: priv.email, subject: `${isReminder ? "Rappel — " : ""}Action requise : validez la publication de votre profil`, html });
}

export type ConsentDecision = "accept" | "refuse" | "report";

export async function findByToken(token: string) {
  const db = createAdminClient();
  const { data: priv } = await db.from("candidate_private").select("*").eq("consent_token_hash", sha256(token)).maybeSingle();
  if (!priv) return null;
  const { data: c } = await db.from("candidates").select("*, events(title, slug, status, organizer_id)").eq("id", priv.candidate_id).single();
  return { priv, c };
}

export async function decideConsent(token: string, decision: ConsentDecision, ip: string, ua: string, note?: string) {
  const found = await findByToken(token);
  if (!found) throw new Error("Lien invalide.");
  const { priv, c } = found;
  if (priv.consent_expires_at && new Date(priv.consent_expires_at) < new Date() && decision === "accept") throw new Error("Ce lien a expiré. Demandez à l'organisateur de vous en renvoyer un.");
  const db = createAdminClient();
  const now = new Date().toISOString();
  const what = decision === "accept" ? "accepted" : decision === "refuse" ? "refused" : "error_reported";
  await db.from("candidate_private").update({
    consent_decided_at: now,
    consent_ip: ip,
    consent_user_agent: ua.slice(0, 300),
    consent_log: [...(priv.consent_log ?? []), { at: now, what, ip, note: note?.slice(0, 500) }],
    ...(decision === "accept" ? {} : { consent_token_hash: null }),
  }).eq("candidate_id", priv.candidate_id);
  if (decision === "accept") await db.from("candidates").update({ consent_status: "accepted", is_published: true }).eq("id", c.id);
  if (decision === "refuse") await db.from("candidates").update({ consent_status: "refused", is_published: false }).eq("id", c.id);
  if (decision === "report") await db.from("candidates").update({ consent_status: "pending", is_published: false }).eq("id", c.id);

  // Prévenir l'organisateur d'un refus ou d'une erreur signalée
  if (decision !== "accept") {
    const { data: org } = await db.from("profiles").select("email").eq("id", c.events.organizer_id).single();
    if (org?.email) {
      await sendMail({
        to: org.email,
        subject: decision === "refuse" ? `${c.display_name} a refusé la publication` : `${c.display_name} signale une erreur dans son profil`,
        html: `<p>${esc(c.display_name)} (${esc(c.code)}) — ${esc(c.events.title)}</p><p>${decision === "refuse" ? "Le candidat a refusé la publication de son profil. Il reste masqué." : `Erreur signalée : ${esc(note ?? "")}`}</p>`,
      }).catch(() => undefined);
    }
  }
  return { candidate: c, decision };
}

/** Retrait du consentement après publication (lien conservé). */
export async function withdrawConsent(token: string, ip: string) {
  const found = await findByToken(token);
  if (!found) throw new Error("Lien invalide.");
  const db = createAdminClient();
  await db.from("candidates").update({ consent_status: "withdrawn", is_published: false }).eq("id", found.c.id);
  await db.from("candidate_private").update({ consent_log: [...(found.priv.consent_log ?? []), { at: new Date().toISOString(), what: "withdrawn", ip }], consent_token_hash: null }).eq("candidate_id", found.c.id);
}
