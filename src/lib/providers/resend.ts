import "server-only";
import { getCredential, markTested } from "@/lib/credentials";

export type Mail = { to: string | string[]; subject: string; html: string; text?: string };

/** Envoie un e-mail via Resend avec la clé enregistrée dans le back-office. */
export async function sendMail(mail: Mail): Promise<{ id: string }> {
  const cred = await getCredential("resend");
  if (!cred?.secrets.api_key || !cred.config.from_email) {
    throw new Error("Resend n'est pas configuré (Admin > Clés API)");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${cred.secrets.api_key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: cred.config.from_email,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(cred.config.reply_to ? { reply_to: cred.config.reply_to } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status} : ${body?.message ?? "échec d'envoi"}`);
  return { id: body.id };
}

export async function testResend(to: string) {
  const cred = await getCredential("resend");
  if (!cred) throw new Error("Aucune clé Resend enregistrée");
  try {
    await sendMail({ to, subject: "Test Aitech Vote", html: "<p>La configuration Resend fonctionne.</p>" });
    await markTested(cred.id, true);
  } catch (e) {
    await markTested(cred.id, false);
    throw e;
  }
}
