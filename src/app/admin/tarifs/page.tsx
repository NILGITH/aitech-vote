import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Input, Toggle } from "@/components/ui/Field";
import { PayoutSimulator } from "@/components/admin/PayoutSimulator";
import { addOverride, deleteOverride, savePlan, savePlatformConfig } from "../actions";
import { dateFr } from "@/lib/format";
import type { Plan } from "@/lib/types";

export default async function PricingAdmin() {
  const db = createAdminClient();
  const [{ data: plans }, { data: cfg }, { data: overrides }, { data: orgs }] = await Promise.all([
    db.from("plans").select("*").order("display_order"),
    db.from("platform_config").select("*").eq("id", 1).single(),
    db.from("commission_overrides").select("*, profiles(full_name, organization_name)").order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, organization_name").in("role", ["organizer"]).order("full_name"),
  ]);
  return (
    <>
      <PageTitle title="Tarifs et commissions" sub="Tout se règle ici, à la main. Les changements s'appliquent au site dès l'enregistrement." />
      <section className="mb-5 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
        {[...(plans as Plan[]), null].map((p, i) => (
          <div key={p?.id ?? "new"} className="av-fade-up av-card p-5" style={{ "--av-delay": `${i * 0.06}s` } as React.CSSProperties}>
            <h2 className="m-0 mb-3 text-[17px] font-bold">{p ? `Plan ${p.name}` : "Nouveau plan"}</h2>
            <ActionForm action={savePlan.bind(null, p?.id ?? "new")} submit={p ? "Enregistrer" : "Créer le plan"}>
              <Input label="Nom" name="name" defaultValue={p?.name} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prix mensuel (FCFA)" name="price_xof" type="number" min={0} defaultValue={p?.price_xof ?? 0} />
                <Input label="Commission (%)" name="commission_pct" type="number" step="0.1" min={0} max={100} defaultValue={p?.commission_pct ?? 10} />
                <Input label="Événements / mois" name="max_events_month" type="number" defaultValue={p?.max_events_month ?? 1} hint="-1 = illimité" />
                <Input label="Candidats / événement" name="max_candidates" type="number" defaultValue={p?.max_candidates ?? 5} hint="-1 = illimité" />
              </div>
              <div><label className="av-label" htmlFor={`f-${p?.id ?? "new"}`}>Avantages affichés (un par ligne)</label><textarea id={`f-${p?.id ?? "new"}`} name="features" rows={4} defaultValue={p?.features.join("\n")} className="av-input text-sm" /></div>
              <Toggle name="is_visible" label="Visible sur le site" defaultChecked={p?.is_visible ?? true} />
            </ActionForm>
          </div>
        ))}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="av-card p-5">
          <h2 className="m-0 mb-3 text-[17px] font-bold">Règles générales</h2>
          <ActionForm action={savePlatformConfig}>
            <Input label="Frais Kkiapay de votre contrat (%)" name="kkiapay_fee_pct" defaultValue={cfg?.kkiapay_fee_pct ?? ""} placeholder="à renseigner" />
            <div>
              <label htmlFor="fee_bearer" className="av-label">Qui paie les frais Kkiapay ?</label>
              <select id="fee_bearer" name="fee_bearer" defaultValue={cfg?.fee_bearer} className="av-input h-11">
                <option value="organizer">Déduits de la part de l&apos;organisateur</option>
                <option value="platform">Pris sur la commission Aitech Vote</option>
                <option value="voter">Ajoutés au prix payé par le votant</option>
              </select>
            </div>
            <Input label="Montant minimum d'un reversement (FCFA)" name="min_payout_xof" type="number" defaultValue={cfg?.min_payout_xof ?? 10000} />
            <div>
              <label htmlFor="payout_delay" className="av-label">Délai de reversement après clôture</label>
              <select id="payout_delay" name="payout_delay" defaultValue={cfg?.payout_delay} className="av-input h-11"><option value="48h">48 heures</option><option value="7d">7 jours</option><option value="manual">Sur demande, validation manuelle</option></select>
            </div>
            <Input label="Élections : forfait par électeur (FCFA)" name="election_fee_per_voter_xof" type="number" defaultValue={cfg?.election_fee_per_voter_xof ?? ""} placeholder="sur devis" />
            <Input label="Version des conditions (consentement)" name="terms_version" defaultValue={cfg?.terms_version} />
          </ActionForm>
        </section>
        <div className="flex flex-col gap-5">
          <PayoutSimulator plans={(plans ?? []).map((p) => ({ name: p.name, commission_pct: Number(p.commission_pct) }))} feePct={cfg?.kkiapay_fee_pct ?? null} feeBearer={cfg?.fee_bearer ?? "organizer"} />
          <section className="av-card p-5">
            <h2 className="m-0 mb-3 text-[17px] font-bold">Commissions négociées</h2>
            <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
              {overrides?.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-bg p-3 text-sm">
                  <span className="flex-1">{o.profiles?.organization_name || o.profiles?.full_name} · <strong>{Number(o.commission_pct)} %</strong> {o.valid_until ? `jusqu'au ${dateFr(o.valid_until)}` : "sans limite"}</span>
                  <ActionForm action={deleteOverride.bind(null, o.id)} submit="Retirer" danger />
                </li>
              ))}
            </ul>
            <ActionForm action={addOverride} submit="Ajouter l'exception">
              <div>
                <label htmlFor="organizer_id" className="av-label">Organisateur</label>
                <select id="organizer_id" name="organizer_id" className="av-input h-11">{orgs?.map((o) => <option key={o.id} value={o.id}>{o.organization_name || o.full_name}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Commission (%)" name="commission_pct" type="number" step="0.1" required />
                <Input label="Valable jusqu'au" name="valid_until" type="date" />
              </div>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
