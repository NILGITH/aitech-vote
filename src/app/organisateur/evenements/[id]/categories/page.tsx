import { createClient } from "@/lib/supabase/server";
import { ActionForm, Input } from "@/components/ui/Field";
import { addCategory, deleteCategory } from "../../../actions";

export default async function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const [{ data: e }, { data: cats }, { data: cands }] = await Promise.all([
    db.from("events").select("modes").eq("id", id).single(),
    db.from("categories").select("*").eq("event_id", id).order("position"),
    db.from("candidates").select("category_id").eq("event_id", id),
  ]);
  const election = e?.modes?.includes("election");
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="av-card p-2">
        <ul className="m-0 list-none p-0">
          {cats?.map((c, i) => (
            <li key={c.id} className="av-fade-up flex flex-wrap items-center gap-3 border-t border-[#EEF1F6] p-3 first:border-t-0" style={{ "--av-delay": `${i * 0.04}s` } as React.CSSProperties}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0FD] font-bold text-[#1650B8]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-[13px] text-muted">{(cands ?? []).filter((x) => x.category_id === c.id).length} candidat(s){election ? ` · ${c.max_choices} choix max.` : ""}</div>
              </div>
              <ActionForm action={deleteCategory.bind(null, id, c.id)} submit="Supprimer" danger confirmText={`Supprimer « ${c.name} » et ses candidats ?`} />
            </li>
          ))}
        </ul>
        {!cats?.length && <p className="p-6 text-center text-muted">Aucune {election ? "poste" : "catégorie"} pour le moment.</p>}
      </section>
      <section className="av-card self-start p-5">
        <h2 className="m-0 mb-3 text-[17px] font-bold">Ajouter {election ? "un poste" : "une catégorie"}</h2>
        <ActionForm action={addCategory.bind(null, id)} submit="Ajouter">
          <Input label="Nom" name="name" required placeholder={election ? "Président(e)" : "Artiste de l'année"} />
          <Input label="Description (facultatif)" name="description" />
          {election && <Input label="Nombre de choix possibles" name="max_choices" type="number" min={1} defaultValue={1} />}
        </ActionForm>
      </section>
    </div>
  );
}
