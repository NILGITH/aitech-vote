import "server-only";
import { getCredential, markTested } from "@/lib/credentials";

const BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";

async function post(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Kapso ${res.status} : ${json?.error?.message ?? json?.message ?? "échec d'envoi"}`);
  return json;
}

async function creds() {
  const cred = await getCredential("kapso");
  if (!cred?.secrets.api_key || !cred.config.phone_number_id) throw new Error("Kapso n'est pas configuré (Admin > Clés API)");
  return cred;
}

/**
 * Envoie un code de vérification par WhatsApp.
 * Hors fenêtre de 24 h, WhatsApp impose un modèle approuvé : on utilise le modèle
 * « authentification » configuré dans le back-office (paramètre = le code).
 */
export async function sendWhatsAppCode(toE164: string, code: string) {
  const cred = await creds();
  const template = cred.config.otp_template;
  if (!template) throw new Error("Modèle WhatsApp OTP non configuré");
  const withButton = String(cred.config.otp_button ?? "true").toLowerCase() !== "false";
  const components: unknown[] = [{ type: "body", parameters: [{ type: "text", text: code }] }];
  if (withButton) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] });
  return post(`/${cred.config.phone_number_id}/messages`, cred.secrets.api_key, {
    messaging_product: "whatsapp",
    to: toE164,
    type: "template",
    template: { name: template, language: { code: cred.config.template_language || "fr" }, components },
  });
}

/** Message texte libre (dans la fenêtre de 24 h après un message du destinataire). */
export async function sendWhatsAppText(toE164: string, text: string) {
  const cred = await creds();
  return post(`/${cred.config.phone_number_id}/messages`, cred.secrets.api_key, {
    messaging_product: "whatsapp",
    to: toE164,
    type: "text",
    text: { body: text, preview_url: true },
  });
}

export async function testKapso(toE164: string) {
  const cred = await creds();
  try {
    await sendWhatsAppCode(toE164, "123456");
    await markTested(cred.id, true);
  } catch (e) {
    await markTested(cred.id, false);
    throw e;
  }
}
