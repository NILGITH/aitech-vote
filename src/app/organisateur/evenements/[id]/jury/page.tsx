import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm, Input } from "@/components/ui/Field";
import { addCriterion, deleteCriterion, inviteJuror, removeJuror } from "../../../actions";

export default async function JuryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const [{ data: members }, { data: criteria }, { data: scores }, { count: candCount }] = await Promise.all([
    db.from("jury_members").select("user_id").eq("event_id", id),
    db.from("criteria").select("*").eq("event_id", id).order("position"),
    db.from("jury_scores").select("juror_id, candidate_id").eq("event_id", id),
    db.from("candidates").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await createAdminClient().from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const totalWeight = (criteria ?? []).reduce((a, c) => a + Number(c.weight), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="av-card flex flex-col gap-4 p-5">
        <h2 className="m-0 text-[17px] font-bold">Membres du jury</h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {profiles?.map((p) => {
            const done = new Set((scores ?? []).filter((s) => s.juror_id === p.id).map((s) => s.candidate_id)).size;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-[#EEF1F6] py-3 first:border-t-0">
                <div className="min-w-0 flex-1"><div className="font-semibold">{p.full_name || p.email}</div><div className="text-xs text-muted">{p.email} · {done} / {candCount ?? 0} candidats notés</div></div>
                <ActionForm action={removeJuror.bind(null, id, p.id)} submit="Retirer" danger confirmText="Retirer ce juré ?" />
              </li>
            );
          })}
        </ul>
        {!profiles?.length && <p className="m-0 text-sm text-muted">Aucun juré pour le moment.</p>}
        <div className="rounded-xl bg-bg p-4">
          <ActionForm action={inviteJuror.bind(null, id)} submit="Inviter">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Nom" name="full_name" required />
              <Input label="E-mail" name="email" type="email" required />
            </div>
          </ActionForm>
          <p className="m-0 mt-2 text-xs text-muted">Le juré reçoit un e-mail pour créer son mot de passe. Il ne voit que ses dossiers et ses propres notes.</p>
        </div>
      </section>
      <section className="av-card flex flex-col gap-4 p-5">
        <h2 className="m-0 text-[17px] font-bold">Grille de notation</h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {criteria?.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-t border-[#EEF1F6] py-3 first:border-t-0">
              <div className="min-w-0 flex-1"><div className="font-semibold">{c.name}</div><div className="text-xs text-muted">Noté sur {c.max_score} · poids {Number(c.weight)} ({totalWeight ? Math.round((Number(c.weight) / totalWeight) * 100) : 0} %)</div></div>
              <ActionForm action={deleteCriterion.bind(null, id, c.id)} submit="Supprimer" danger />
            </li>
          ))}
        </ul>
        {!criteria?.length && <p className="m-0 text-sm text-muted">Ajoutez vos critères (ex. Voix 30 %, Présence scénique 25 %…).</p>}
        <div className="rounded-xl bg-bg p-4">
          <ActionForm action={addCriterion.bind(null, id)} submit="Ajouter le critère">
            <Input label="Critère" name="name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Poids" name="weight" type="number" step="0.1" min="0.1" defaultValue={1} />
              <Input label="Note maximale" name="max_score" type="number" min={1} defaultValue={10} />
            </div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
