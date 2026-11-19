import { createClient } from "@/lib/supabase/server";
import { ActionForm, Badge } from "@/components/ui/Field";
import { deleteElector, importElectors } from "../../../actions";
import { num } from "@/lib/format";

export default async function ElectorsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const q = ((await searchParams).q ?? "").trim();
  const db = await createClient();
  let query = db.from("electors").select("*", { count: "exact" }).eq("event_id", id).order("full_name").limit(200);
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data: electors, count }, { count: voted }, { count: total }] = await Promise.all([
    query,
    db.from("electors").select("id", { count: "exact", head: true }).eq("event_id", id).eq("has_voted", true),
    db.from("electors").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  const pct = total ? Math.round(((voted ?? 0) / total) * 100) : 0;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4">
        <div className="av-card p-4 text-sm">
          <strong>{num(voted)}</strong> électeurs sur <strong>{num(total)}</strong> ont voté ({pct} %)
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF1F6]"><div className="av-grow h-2 rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
          <p className="m-0 mt-2 text-xs text-muted">Vous voyez qui a voté, jamais pour qui : les bulletins sont stockés sans lien avec les électeurs.</p>
        </div>
        <form className="flex gap-2"><label htmlFor="q" className="sr-only">Rechercher</label><input id="q" name="q" defaultValue={q} placeholder="Rechercher un électeur" className="av-input h-11" /><button className="rounded-xl bg-ink px-4 text-sm font-semibold text-white">OK</button></form>
        <div className="av-card av-scroll-x p-2">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Électeur</th><th className="p-3 font-semibold">Contact</th><th className="p-3 font-semibold">Statut</th><th className="p-3" /></tr></thead>
            <tbody>
              {electors?.map((el) => (
                <tr key={el.id} className="border-t border-[#EEF1F6]">
                  <td className="p-3 font-semibold">{el.full_name}</td>
                  <td className="p-3 text-muted">{el.email ?? el.phone}</td>
                  <td className="p-3">{el.has_voted ? <Badge tone="green">A voté</Badge> : <Badge>En attente</Badge>}</td>
                  <td className="p-3">{!el.has_voted && <ActionForm action={deleteElector.bind(null, id, el.id)} submit="Retirer" danger />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(count ?? 0) > 200 && <p className="p-3 text-xs text-muted">200 premiers résultats affichés sur {num(count)}.</p>}
          {!electors?.length && <p className="p-6 text-center text-muted">Liste électorale vide.</p>}
        </div>
      </section>
      <section className="av-card self-start p-5">
        <h2 className="m-0 mb-1 text-[17px] font-bold">Importer la liste électorale</h2>
        <p className="m-0 mb-3 text-[13px] text-muted">Une personne par ligne : Nom ; e-mail ; téléphone (au moins l&apos;un des deux). Copiez-collez depuis Excel.</p>
        <ActionForm action={importElectors.bind(null, id)} submit="Importer">
          <label htmlFor="list" className="sr-only">Liste</label>
          <textarea id="list" name="list" rows={10} className="av-input font-mono text-sm" placeholder={"Aïcha Diallo;aicha@exemple.ci;0708123456\nYao Kouassi;;0102030405"} />
        </ActionForm>
      </section>
    </div>
  );
}
