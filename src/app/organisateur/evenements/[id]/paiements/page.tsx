import { createClient } from "@/lib/supabase/server";
import { payoutSummary } from "@/lib/commission";
import { ActionForm, Badge, Input } from "@/components/ui/Field";
import { requestPayout } from "../../../actions";
import { dateFr, fcfa, num } from "@/lib/format";

export default async function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("organizer_id").eq("id", id).single();
  const [{ data: pays }, { data: alerts }, { data: payouts }, sum] = await Promise.all([
    db.from("payments").select("reference, amount_xof, votes, bonus_votes, status, method, phone_masked, created_at").eq("event_id", id).order("created_at", { ascending: false }).limit(100),
    db.from("fraud_alerts").select("*").eq("event_id", id).eq("status", "open").order("created_at", { ascending: false }).limit(20),
    db.from("payout_requests").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    payoutSummary(e!.organizer_id, id),
  ]);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        {!!alerts?.length && (
          <section className="av-card flex flex-col gap-2 border-[#F5C2BE] p-4">
            <h2 className="m-0 text-[15px] font-bold text-danger">Alertes anti-fraude</h2>
            {alerts.map((a) => <p key={a.id} className="m-0 text-sm">{a.kind === "hourly_cap" ? `Plafond horaire atteint par ${a.details.phone} (${a.details.used} votes)` : a.kind} · <span className="text-muted">{dateFr(a.created_at, true)}</span></p>)}
          </section>
        )}
        <section className="av-card av-scroll-x p-2">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Votant</th><th className="p-3 font-semibold">Votes</th><th className="p-3 font-semibold">Montant</th><th className="p-3 font-semibold">Moyen</th><th className="p-3 font-semibold">Statut</th></tr></thead>
            <tbody>
              {pays?.map((p) => (
                <tr key={p.reference} className="border-t border-[#EEF1F6]">
                  <td className="p-3 text-muted">{dateFr(p.created_at, true)}</td>
                  <td className="p-3">{p.phone_masked}</td>
                  <td className="p-3">{p.votes}{p.bonus_votes ? ` +${p.bonus_votes}` : ""}</td>
                  <td className="p-3 font-semibold">{fcfa(p.amount_xof)}</td>
                  <td className="p-3">{p.method ?? "—"}</td>
                  <td className="p-3"><Badge tone={p.status === "success" ? "green" : p.status === "failed" ? "red" : "amber"}>{p.status === "success" ? "Confirmé" : p.status === "failed" ? "Échoué" : "En attente"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pays?.length && <p className="p-6 text-center text-muted">Aucun paiement pour le moment.</p>}
        </section>
      </div>
      <section className="flex flex-col gap-4 self-start rounded-[var(--av-radius)] bg-ink p-5 text-white">
        <h2 className="m-0 text-[17px] font-bold">Reversements</h2>
        <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Encaissé</span><span className="font-semibold text-white">{fcfa(sum.gross)}</span></div>
        <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Frais Kkiapay {sum.feePct ? `(${sum.feePct} %)` : ""}</span><span className="font-semibold text-white">− {fcfa(sum.fees)}</span></div>
        <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Commission ({num(sum.commissionPct)} %, {sum.commissionSource})</span><span className="font-semibold text-white">− {fcfa(sum.commission)}</span></div>
        <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Déjà demandé</span><span className="font-semibold text-white">− {fcfa(sum.already)}</span></div>
        <div className="flex items-baseline justify-between border-t border-[#23365C] pt-3"><span className="text-sm text-[#C9D3E6]">Disponible</span><span className="font-heading text-2xl font-extrabold text-accent">{fcfa(sum.available)}</span></div>
        <div className="rounded-xl bg-white p-4 text-ink">
          <ActionForm action={requestPayout.bind(null, id)} submit="Demander un reversement">
            <Input label="Montant (FCFA)" name="amount" type="number" min={sum.minPayout} max={sum.available} required />
            <div>
              <label htmlFor="method" className="av-label">Vers</label>
              <select id="method" name="method" className="av-input h-11"><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="mtn">MTN MoMo</option><option value="moov">Moov Money</option><option value="bank">Compte bancaire</option></select>
            </div>
            <Input label="Numéro ou IBAN" name="destination" required />
          </ActionForm>
        </div>
        {payouts?.map((p) => <div key={p.id} className="flex justify-between text-xs text-[#C9D3E6]"><span>{dateFr(p.created_at)} · {fcfa(p.amount_xof)}</span><span>{p.status}</span></div>)}
      </section>
    </div>
  );
}
