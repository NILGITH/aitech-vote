import { ActionForm, Badge, Input, Toggle } from "@/components/ui/Field";
import { PROVIDER_FIELDS, type Provider } from "@/lib/credentials";
import { deleteApiKey, saveApiKey, testApiKey } from "@/app/admin/actions";
import { dateFr } from "@/lib/format";

export type CredRow = {
  provider: Provider;
  event_id: string | null;
  public_config: Record<string, string>;
  secret_hints: Record<string, string>;
  is_active: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  updated_at: string;
} | null;

const META: Record<Provider, { title: string; sub: string; testLabel?: string; testPlaceholder?: string }> = {
  resend: { title: "Resend — e-mails et notifications", sub: "Demandes de consentement, codes de vérification des électeurs, alertes aux organisateurs.", testLabel: "Envoyer un e-mail de test à", testPlaceholder: "vous@aitech-ci.com" },
  kapso: { title: "Kapso — WhatsApp", sub: "Codes de vérification des votants et messages WhatsApp.", testLabel: "Envoyer un code de test au numéro", testPlaceholder: "07 08 12 34 56" },
  kkiapay: { title: "Kkiapay — paiements", sub: "Wave, Orange Money, MTN, Moov et carte. Clé par défaut, ou propre à un événement." },
};

export function ApiKeyCard({ provider, eventId, row, title, webhookUrl }: { provider: Provider; eventId: string | null; row: CredRow; title?: string; webhookUrl?: string }) {
  const f = PROVIDER_FIELDS[provider];
  const m = META[provider];
  const key = `${provider}-${eventId ?? "default"}`;
  return (
    <section className="av-fade-up av-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 text-[17px] font-bold">{title ?? m.title}</h2>
          <p className="m-0 mt-1 text-[13px] text-muted">{m.sub}</p>
        </div>
        {row ? (
          <div className="flex flex-col items-end gap-1">
            <Badge tone={row.is_active ? "green" : "gray"}>{row.is_active ? "Active" : "Désactivée"}</Badge>
            {row.last_test_at && <span className={`text-xs font-semibold ${row.last_test_ok ? "text-success" : "text-danger"}`}>Test {row.last_test_ok ? "réussi" : "échoué"} le {dateFr(row.last_test_at, true)}</span>}
          </div>
        ) : (
          <Badge tone="amber">Non configurée</Badge>
        )}
      </div>
      <ActionForm key={`${key}-${row?.updated_at ?? ""}`} action={saveApiKey.bind(null, provider, eventId)} submit="Enregistrer">
        <div className="grid gap-3 sm:grid-cols-2">
          {f.public.map((x) => <Input key={x.key} label={x.label} name={x.key} defaultValue={row?.public_config?.[x.key] ?? ""} placeholder={x.placeholder} />)}
          {f.secret.map((x) => (
            <Input key={x.key} label={x.label} name={x.key} type="password" autoComplete="off" placeholder={row?.secret_hints?.[x.key] ? `${row.secret_hints[x.key]} (laisser vide pour conserver)` : "Saisir la valeur"} />
          ))}
        </div>
        <Toggle name="is_active" label="Activer ces clés" defaultChecked={row?.is_active ?? true} />
        <p className="m-0 text-xs text-muted">Les valeurs secrètes sont chiffrées (AES-256) avant stockage et ne sont jamais réaffichées.</p>
      </ActionForm>
      {webhookUrl && (
        <div className="rounded-xl bg-bg p-3 text-[13px]">
          <strong>URL du webhook à saisir dans Kkiapay :</strong>
          <code className="mt-1 block break-all rounded-lg bg-white p-2 text-xs">{webhookUrl}</code>
          <span className="text-muted">Utilisez le même « secret » que celui saisi ci-dessus.</span>
        </div>
      )}
      {row && (
        <div className="flex flex-wrap items-end gap-3 border-t border-[#EEF1F6] pt-4">
          <ActionForm action={testApiKey.bind(null, provider, eventId)} submit="Tester" className="min-w-[240px] flex-1">
            {m.testLabel && <Input label={m.testLabel} name="test_to" placeholder={m.testPlaceholder} />}
          </ActionForm>
          <ActionForm action={deleteApiKey.bind(null, provider, eventId)} submit="Supprimer" danger confirmText="Supprimer ces clés ?" />
        </div>
      )}
    </section>
  );
}
