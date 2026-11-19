import { createAdminClient } from "@/lib/supabase/admin";
import { Kpi, PageTitle } from "@/components/admin/Shell";
import { ActionForm, Badge } from "@/components/ui/Field";
import { setPayoutStatus } from "../actions";
import { dateFr, fcfa, num } from "@/lib/format";

export default async function PaymentsAdmin() {
  const db = createAdminClient();
  const [{ data: pays }, { data: payouts }, { data: ok }] = await Promise.all([
    db.from("payments").select("reference, amount_xof, status, method, phone_masked, created_at, events(title)").order("created_at", { ascending: false }).limit(100),
    db.from("payout_requests").select("*, events(title), profiles(full_name, organization_name)").order("created_at", { ascending: false }).limit(50),
    db.from("payments").select("amount_xof").eq("status", "success"),
  ]);
  const gross = (ok ?? []).reduce((a, p) => a + p.amount_xof, 0);
  const pendingPayouts = (payouts ?? []).filter((p) => p.status === "requested");
  return (
    <>
      <PageTitle title="Paiements et reversements" sub="Toutes les transactions vérifiées auprès de Kkiapay et les demandes de reversement." />
      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <Kpi label="Total encaissé" value={fcfa(gross)} />
        <Kpi label="Transactions confirmées" value={num(ok?.length)} delay={0.08} />
        <Kpi label="Reversements à traiter" value={num(pendingPayouts.length)} sub={fcfa(pendingPayouts.reduce((a, p) => a + p.amount_xof, 0))} delay={0.16} />
      </div>
      <section className="av-card mb-5 p-5">
        <h2 className="m-0 mb-3 text-[17px] font-bold">Demandes de reversement</h2>
        <div className="flex flex-col gap-2">
          {payouts?.map((p) => {
            const org = p.profiles as { full_name: string; organization_name: string | null } | null;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3 text-sm">
                <span className="min-w-[240px] flex-1"><strong>{org?.organization_name || org?.full_name}</strong> · {(p.events as { title: string } | null)?.title}<br /><span className="text-muted">{fcfa(p.amount_xof)} vers {p.method} {p.destination} · {dateFr(p.created_at, true)}</span></span>
                <Badge tone={p.status === "paid" ? "green" : p.status === "rejected" ? "red" : "amber"}>{p.status === "requested" ? "Demandé" : p.status === "approved" ? "Approuvé" : p.status === "paid" ? "Payé" : "Refusé"}</Badge>
                {p.status === "requested" && <><ActionForm action={setPayoutStatus.bind(null, p.id, "approved")} submit="Approuver" /><ActionForm action={setPayoutStatus.bind(null, p.id, "rejected")} submit="Refuser" danger /></>}
                {p.status === "approved" && <ActionForm action={setPayoutStatus.bind(null, p.id, "paid")} submit="Marquer payé" />}
              </div>
            );
          })}
          {!payouts?.length && <p className="m-0 text-sm text-muted">Aucune demande.</p>}
        </div>
      </section>
      <section className="av-card av-scroll-x p-2">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Événement</th><th className="p-3 font-semibold">Votant</th><th className="p-3 font-semibold">Montant</th><th className="p-3 font-semibold">Moyen</th><th className="p-3 font-semibold">Statut</th></tr></thead>
          <tbody>
            {pays?.map((p) => (
              <tr key={p.reference} className="border-t border-[#EEF1F6]">
                <td className="p-3 text-muted">{dateFr(p.created_at, true)}</td>
                <td className="p-3">{(p.events as unknown as { title: string } | null)?.title}</td>
                <td className="p-3">{p.phone_masked}</td>
                <td className="p-3 font-semibold">{fcfa(p.amount_xof)}</td>
                <td className="p-3">{p.method ?? "—"}</td>
                <td className="p-3"><Badge tone={p.status === "success" ? "green" : p.status === "failed" ? "red" : "amber"}>{p.status === "success" ? "Confirmé" : p.status === "failed" ? "Échoué" : "En attente"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
