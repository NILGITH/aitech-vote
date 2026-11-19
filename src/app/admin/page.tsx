import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { Kpi, PageTitle } from "@/components/admin/Shell";
import { ActionForm, Toggle } from "@/components/ui/Field";
import { saveModules, setOrganizerStatus } from "./actions";
import { fcfa, num, dateFr } from "@/lib/format";

const MODULES = [
  ["paid", "Vote public payant", "Packs de votes, Mobile Money, Wave, carte"],
  ["free", "Vote gratuit contrôlé", "Code WhatsApp, 1 vote / jour"],
  ["jury", "Jury et grille de notation", "Critères pondérés"],
  ["election", "Élections à bulletin secret", "Liste électorale, reçu de vérification"],
  ["live", "Vote en direct et écran géant", "QR code, résultats animés"],
  ["whatsapp", "Notifications WhatsApp (Kapso)", "Codes de vérification par WhatsApp"],
  ["ussd", "Vote par USSD et SMS", "Phase 2 — nécessite un agrégateur"],
  ["ticketing", "Billetterie", "Phase 2"],
] as const;
const PAYS = [["wave", "Wave"], ["orange_money", "Orange Money"], ["mtn", "MTN MoMo"], ["moov", "Moov Money"], ["card", "Carte bancaire"]] as const;

export default async function AdminHome() {
  const db = createAdminClient();
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const [settings, { count: orgs }, { count: live }, { data: pays }, { data: pending }, { data: creds }, { count: alerts }] = await Promise.all([
    getSettings(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organizer").eq("status", "active"),
    db.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("payments").select("amount_xof").eq("status", "success").gte("confirmed_at", month.toISOString()),
    db.from("profiles").select("id, full_name, email, organization_name, created_at").eq("status", "pending").order("created_at").limit(10),
    db.from("api_credentials").select("provider, event_id, is_active"),
    db.from("fraud_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const gross = (pays ?? []).reduce((a, p) => a + p.amount_xof, 0);
  const has = (p: string) => (creds ?? []).some((c) => c.provider === p && !c.event_id && c.is_active);

  return (
    <>
      <PageTitle title="Vue d'ensemble de la plateforme" sub="Activez les fonctionnalités, suivez l'activité et validez les organisateurs." />
      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <Kpi label="Organisateurs actifs" value={num(orgs)} sub={`${pending?.length ?? 0} en attente`} />
        <Kpi label="Événements en ligne" value={num(live)} delay={0.08} />
        <Kpi label="Encaissé ce mois" value={fcfa(gross)} sub="via Kkiapay" delay={0.16} />
        <Kpi label="Alertes anti-fraude" value={num(alerts)} tone={(alerts ?? 0) > 0 ? "bad" : undefined} sub={(alerts ?? 0) > 0 ? "à traiter" : "aucune"} delay={0.24} />
      </div>
      {(!has("resend") || !has("kapso") || !has("kkiapay")) && (
        <div className="mb-6 rounded-xl border border-[#F3D9A4] bg-[#FFFAEF] p-4 text-sm text-[#6B4700]">
          Configuration incomplète : {[!has("resend") && "Resend (e-mails)", !has("kapso") && "Kapso (WhatsApp)", !has("kkiapay") && "Kkiapay (paiement par défaut)"].filter(Boolean).join(", ")}. <Link href="/admin/cles-api" className="font-bold underline">Configurer les clés API</Link>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="av-card p-5">
          <h2 className="m-0 mb-1 text-[17px] font-bold">Modules et moyens de paiement</h2>
          <p className="m-0 mb-3 text-sm text-muted">Un module désactivé disparaît du site et de l&apos;espace organisateur. Le consentement des candidats reste toujours obligatoire.</p>
          <ActionForm action={saveModules} submit="Enregistrer">
            <div className="grid gap-x-8 lg:grid-cols-2">
              <div>{MODULES.map(([k, l, d]) => <Toggle key={k} name={`m_${k}`} label={l} sub={d} defaultChecked={settings.modules[k] === true || (settings.modules[k] !== false && k !== "ussd" && k !== "ticketing")} />)}</div>
              <div>
                <div className="pb-1 pt-2.5 text-xs font-bold tracking-wide text-muted">MOYENS DE PAIEMENT (KKIAPAY)</div>
                {PAYS.map(([k, l]) => <Toggle key={k} name={`p_${k}`} label={l} defaultChecked={settings.payment_methods[k] !== false} />)}
              </div>
            </div>
          </ActionForm>
        </section>
        <section className="av-card flex flex-col gap-2 self-start p-5">
          <h2 className="m-0 text-[17px] font-bold">Organisateurs à valider</h2>
          {pending?.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F6] py-3 first:border-t-0">
              <div className="min-w-0 flex-1"><div className="font-semibold">{p.organization_name || p.full_name}</div><div className="text-xs text-muted">{p.email} · {dateFr(p.created_at)}</div></div>
              <ActionForm action={setOrganizerStatus.bind(null, p.id, "active")} submit="Valider" />
            </div>
          ))}
          {!pending?.length && <p className="m-0 text-sm text-muted">Aucun compte en attente.</p>}
        </section>
      </div>
    </>
  );
}
