import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Input } from "@/components/ui/Field";
import { createEvent } from "../../actions";

export const metadata = { title: "Nouvel événement" };

const TYPES = [
  ["awards", "Awards / prix", "Vote public payant, catégories, nominés"],
  ["beauty", "Concours de beauté", "Jury + vote du public"],
  ["talent", "Concours de talents", "Vote public, jury, écran en direct"],
  ["election", "Élection à bulletin secret", "Liste électorale, un électeur = un vote"],
  ["other", "Autre", "Sondage, prix du public…"],
] as const;

export default function NewEventPage() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Nouvel événement" sub="Commencez par le titre et le type ; vous réglerez les détails à l'étape suivante." />
      <div className="av-card p-6">
        <ActionForm action={createEvent} submit="Créer et continuer">
          <Input label="Titre de l'événement" name="title" required placeholder="Ex. Awards de la Musique Urbaine 2026" />
          <fieldset className="m-0 border-0 p-0">
            <legend className="av-label">Type d&apos;événement</legend>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
              {TYPES.map(([v, l, d], i) => (
                <label key={v} className="flex cursor-pointer flex-col gap-1 rounded-[14px] border border-[#CBD3E1] bg-white p-3.5 transition-all has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#E8F0FD]">
                  <input type="radio" name="event_type" value={v} defaultChecked={i === 0} className="sr-only" />
                  <span className="font-bold">{l}</span>
                  <span className="text-[13px] text-muted">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </div>
    </div>
  );
}
