import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson, encryptJson, hint } from "@/lib/crypto";

export type Provider = "resend" | "kkiapay" | "kapso";

/** Champs attendus par fournisseur : public = stocké en clair, secret = chiffré. */
export const PROVIDER_FIELDS: Record<Provider, { public: { key: string; label: string; placeholder?: string }[]; secret: { key: string; label: string }[] }> = {
  resend: {
    public: [
      { key: "from_email", label: "Adresse d'expédition", placeholder: "Aitech Vote <notifications@vote.aitech-ci.com>" },
      { key: "reply_to", label: "Adresse de réponse (facultatif)", placeholder: "contact@aitech-ci.com" },
    ],
    secret: [{ key: "api_key", label: "Clé API Resend (re_…)" }],
  },
  kkiapay: {
    public: [
      { key: "public_key", label: "Clé publique" },
      { key: "sandbox", label: "Mode test (sandbox) : true / false", placeholder: "true" },
    ],
    secret: [
      { key: "private_key", label: "Clé privée" },
      { key: "secret_key", label: "Clé secrète" },
      { key: "webhook_secret", label: "Secret du webhook (hash défini dans Kkiapay)" },
    ],
  },
  kapso: {
    public: [
      { key: "phone_number_id", label: "Phone Number ID WhatsApp" },
      { key: "otp_template", label: "Modèle WhatsApp pour le code (OTP)", placeholder: "code_verification" },
      { key: "template_language", label: "Langue du modèle", placeholder: "fr" },
      { key: "otp_button", label: "Modèle avec bouton « copier le code » : true / false", placeholder: "true" },
    ],
    secret: [{ key: "api_key", label: "Clé API Kapso (X-API-Key)" }],
  },
};

export type ResolvedCredential = {
  id: string;
  provider: Provider;
  eventId: string | null;
  config: Record<string, string>;
  secrets: Record<string, string>;
};

/**
 * Renvoie la clé active d'un fournisseur. Pour Kkiapay, la clé propre à l'événement
 * est prioritaire, sinon la clé par défaut de la plateforme est utilisée.
 */
export async function getCredential(provider: Provider, eventId?: string | null): Promise<ResolvedCredential | null> {
  const db = createAdminClient();
  const rows: { id: string; provider: Provider; event_id: string | null; public_config: Record<string, string>; secret_ciphertext: string | null; is_active: boolean }[] = [];
  if (eventId) {
    const { data } = await db.from("api_credentials").select("*").eq("provider", provider).eq("event_id", eventId).eq("is_active", true).maybeSingle();
    if (data) rows.push(data);
  }
  if (!rows.length) {
    const { data } = await db.from("api_credentials").select("*").eq("provider", provider).is("event_id", null).eq("is_active", true).maybeSingle();
    if (data) rows.push(data);
  }
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    eventId: row.event_id,
    config: row.public_config ?? {},
    secrets: row.secret_ciphertext ? decryptJson(row.secret_ciphertext) : {},
  };
}

/**
 * Enregistre une clé. Un champ secret laissé vide conserve la valeur existante,
 * ce qui permet de modifier l'expéditeur sans ressaisir la clé.
 */
export async function saveCredential(params: {
  provider: Provider;
  eventId: string | null;
  config: Record<string, string>;
  secrets: Record<string, string>;
  isActive: boolean;
  actorId: string;
}) {
  const db = createAdminClient();
  let q = db.from("api_credentials").select("id, secret_ciphertext").eq("provider", params.provider);
  q = params.eventId ? q.eq("event_id", params.eventId) : q.is("event_id", null);
  const { data: existing } = await q.maybeSingle();

  const previous = existing?.secret_ciphertext ? decryptJson<Record<string, string>>(existing.secret_ciphertext) : {};
  const merged: Record<string, string> = { ...previous };
  for (const [k, v] of Object.entries(params.secrets)) if (v && v.trim()) merged[k] = v.trim();

  const hints: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) hints[k] = hint(v);

  const row = {
    provider: params.provider,
    event_id: params.eventId,
    public_config: params.config,
    secret_ciphertext: Object.keys(merged).length ? encryptJson(merged) : null,
    secret_hints: hints,
    is_active: params.isActive,
    updated_by: params.actorId,
    updated_at: new Date().toISOString(),
  };
  const res = existing
    ? await db.from("api_credentials").update(row).eq("id", existing.id)
    : await db.from("api_credentials").insert(row);
  if (res.error) throw new Error(res.error.message);
  await db.from("audit_log").insert({ actor_id: params.actorId, action: "api_credentials.save", entity: params.provider, entity_id: params.eventId ?? "default", details: { fields: Object.keys(params.secrets).filter((k) => params.secrets[k]) } });
}

export async function markTested(id: string, ok: boolean) {
  await createAdminClient().from("api_credentials").update({ last_test_at: new Date().toISOString(), last_test_ok: ok }).eq("id", id);
}
