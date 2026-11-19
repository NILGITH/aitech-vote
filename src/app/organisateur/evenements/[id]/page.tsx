import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm, Input, Toggle, Badge } from "@/components/ui/Field";
import { RangeField } from "@/components/org/EventTabs";
import { updateEvent } from "../../actions";
import { EVENT_TYPE_LABELS, MODE_LABELS } from "@/lib/format";
import type { EventRow } from "@/lib/types";

const local = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  // Affichage à l'heure d'Abidjan (UTC+0)
  return d.toISOString().slice(0, 16);
};

export default async function EventSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  const { data: cred } = await createAdminClient().from("api_credentials").select("is_active, public_config").eq("provider", "kkiapay").or(`event_id.eq.${id},event_id.is.null`);
  const ownKeys = cred?.length ? true : false;
  const packs = [...e!.packs, ...Array(5).fill({ votes: 0, bonus: 0 })].slice(0, 5);

  return (
    <ActionForm action={updateEvent.bind(null, id)} submit="Enregistrer les réglages">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="av-card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Informations</h2>
          <Input label="Titre" name="title" defaultValue={e!.title} required />
          <div>
            <label htmlFor="event_type" className="av-label">Type</label>
            <select id="event_type" name="event_type" defaultValue={e!.event_type} className="av-input h-11">
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="description" className="av-label">Description</label>
            <textarea id="description" name="description" rows={4} defaultValue={e!.description ?? ""} className="av-input" />
          </div>
          <Input label="Lieu" name="location" defaultValue={e!.location ?? ""} placeholder="Abidjan" />
          <Input label="Image de couverture (lien)" name="cover_url" defaultValue={e!.cover_url ?? ""} placeholder="https://…" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Date de la finale" name="starts_at" type="datetime-local" defaultValue={local(e!.starts_at)} />
            <Input label="Ouverture du vote" name="vote_opens_at" type="datetime-local" defaultValue={local(e!.vote_opens_at)} />
            <Input label="Clôture du vote" name="vote_closes_at" type="datetime-local" defaultValue={local(e!.vote_closes_at)} />
          </div>
          <p className="m-0 text-xs text-muted">Heures en GMT (heure d&apos;Abidjan).</p>
        </section>

        <section className="av-card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Modes de vote</h2>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))" }}>
            {(["paid", "free", "jury", "election", "live"] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#CBD3E1] bg-white p-3 text-sm font-semibold transition-all has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#E8F0FD]">
                <input type="checkbox" name={`mode_${m}`} defaultChecked={e!.modes.includes(m)} className="h-4 w-4 accent-[var(--av-primary)]" />
                {MODE_LABELS[m]}
              </label>
            ))}
          </div>
          <div>
            <div className="av-label">Pondération du résultat final (jury + public)</div>
            <RangeField name="jury_weight" defaultValue={e!.jury_weight} leftLabel="Jury" rightLabel="Public" />
            <p className="m-0 mt-1 text-xs text-muted">Utilisée seulement si « Jury » et un vote public sont activés ensemble.</p>
          </div>
          <Input label="Code de l'écran géant (lettres et chiffres)" name="short_code" defaultValue={e!.short_code ?? ""} placeholder="AMU26" hint="Adresse de l'écran : /direct/CODE" />
        </section>

        <section className="av-card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Prix et packs</h2>
          <Input label="Prix d'un vote (FCFA)" name="price_per_vote_xof" type="number" min={0} defaultValue={e!.price_per_vote_xof} />
          <div>
            <div className="av-label">Packs proposés (votes payés + votes offerts)</div>
            <div className="grid gap-2">
              {packs.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <input aria-label={`Pack ${i + 1} : votes`} name={`pack${i + 1}_votes`} type="number" min={0} defaultValue={p.votes || ""} placeholder="votes" className="av-input h-10" />
                  <span>+</span>
                  <input aria-label={`Pack ${i + 1} : offerts`} name={`pack${i + 1}_bonus`} type="number" min={0} defaultValue={p.bonus || ""} placeholder="offerts" className="av-input h-10" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-bg p-3 text-sm">
            Paiement Kkiapay : {ownKeys ? <Badge tone="green">configuré</Badge> : <Badge tone="amber">à configurer par l&apos;administrateur</Badge>}
          </div>
        </section>

        <section className="av-card flex flex-col p-5">
          <h2 className="m-0 mb-2 text-[17px] font-bold">Sécurité et affichage</h2>
          <Toggle name="require_otp" label="Code de vérification obligatoire" sub="WhatsApp avant chaque vote payant" defaultChecked={e!.require_otp} />
          <Toggle name="show_live_results" label="Résultats publics en direct" sub="Sinon révélés à la clôture" defaultChecked={e!.show_live_results} />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input label="Votes gratuits par jour" name="free_votes_per_day" type="number" min={1} defaultValue={e!.free_votes_per_day} />
            <Input label="Max. votes payants / heure / numéro" name="max_paid_votes_per_hour" type="number" min={1} defaultValue={e!.max_paid_votes_per_hour} />
          </div>
        </section>
      </div>
    </ActionForm>
  );
}
