import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Badge, Input } from "@/components/ui/Field";
import { assignPlan, setOrganizerStatus, setRole } from "../actions";
import { dateFr } from "@/lib/format";

export default async function OrganizersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").replace(/[%,()]/g, "").trim();
  const db = createAdminClient();
  let query = db.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,organization_name.ilike.%${q}%`);
  const [{ data: people }, { data: plans }, { data: subs }] = await Promise.all([
    query,
    db.from("plans").select("id, name").order("display_order"),
    db.from("subscriptions").select("organizer_id, ends_at, plans(name)").eq("status", "active"),
  ]);
  const subOf = (id: string) => (subs ?? []).find((s) => s.organizer_id === id) as unknown as { ends_at: string; plans: { name: string } } | undefined;
  return (
    <>
      <PageTitle title="Organisateurs et comptes" sub="Validez, suspendez, changez le rôle ou le plan d'un compte." />
      <form className="mb-4 flex max-w-md gap-2"><label htmlFor="q" className="sr-only">Rechercher</label><input id="q" name="q" defaultValue={q} placeholder="Nom, e-mail, organisation" className="av-input h-11" /><button className="rounded-xl bg-ink px-4 text-sm font-semibold text-white">OK</button></form>
      <div className="flex flex-col gap-3">
        {people?.map((p, i) => {
          const sub = subOf(p.id);
          return (
            <section key={p.id} className="av-fade-up av-card flex flex-wrap items-start gap-4 p-4" style={{ "--av-delay": `${Math.min(i, 8) * 0.04}s` } as React.CSSProperties}>
              <div className="min-w-[220px] flex-1">
                <div className="font-bold">{p.organization_name || p.full_name || p.email}</div>
                <div className="text-[13px] text-muted">{p.full_name} · {p.email} · inscrit le {dateFr(p.created_at)}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={p.status === "active" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status === "active" ? "Actif" : p.status === "pending" ? "En attente" : "Suspendu"}</Badge>
                  <Badge tone="blue">{p.role === "super_admin" ? "Super admin" : p.role === "jury" ? "Jury" : "Organisateur"}</Badge>
                  {sub && <Badge>{sub.plans.name} jusqu&apos;au {dateFr(sub.ends_at)}</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {p.status !== "active" && <ActionForm action={setOrganizerStatus.bind(null, p.id, "active")} submit="Valider" />}
                {p.status !== "suspended" && <ActionForm action={setOrganizerStatus.bind(null, p.id, "suspended")} submit="Suspendre" danger confirmText="Suspendre ce compte ?" />}
                <ActionForm action={setRole.bind(null, p.id)} submit="Changer le rôle" className="!flex-row items-end">
                  <select name="role" defaultValue={p.role} aria-label="Rôle" className="av-input h-11 w-40"><option value="organizer">Organisateur</option><option value="jury">Jury</option><option value="super_admin">Super admin</option></select>
                </ActionForm>
                {p.role === "organizer" && (
                  <ActionForm action={assignPlan.bind(null, p.id)} submit="Attribuer le plan" className="!flex-row items-end">
                    <select name="plan_id" aria-label="Plan" className="av-input h-11 w-36">{plans?.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}</select>
                    <div className="w-24"><Input label="Mois" name="months" type="number" min={1} defaultValue={1} /></div>
                  </ActionForm>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
