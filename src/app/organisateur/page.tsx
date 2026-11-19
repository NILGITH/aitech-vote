import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Kpi, PageTitle } from "@/components/admin/Shell";
import { Badge } from "@/components/ui/Field";
import { STATUS_LABELS, fcfa, num, dateFr } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export default async function OrganizerHome() {
  const me = await requireProfile(["organizer", "super_admin"]);
  const db = await createClient();
  const { data: events } = await db.from("events").select("*").eq("organizer_id", me.id).order("created_at", { ascending: false });
  const ids = (events ?? []).map((e) => e.id);
  const [{ data: stats }, { data: rev }, { data: alerts }] = ids.length
    ? await Promise.all([
        db.from("candidate_stats").select("event_id, paid_votes, free_votes").in("event_id", ids),
        db.from("candidate_revenue").select("event_id, revenue_xof").in("event_id", ids),
        db.from("fraud_alerts").select("id").in("event_id", ids).eq("status", "open"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const paid = (stats ?? []).reduce((a, s) => a + Number(s.paid_votes), 0);
  const free = (stats ?? []).reduce((a, s) => a + Number(s.free_votes), 0);
  const revenue = (rev ?? []).reduce((a, r) => a + Number(r.revenue_xof), 0);
  const active = (events ?? []).filter((e) => e.status === "published").length;

  return (
    <>
      <PageTitle title={`Bonjour ${me.full_name.split(" ")[0] || ""}`} sub="Suivez vos événements et vos recettes en temps réel.">
        <Link href="/organisateur/evenements/nouveau" className="av-btn rounded-[10px] bg-primary px-4 py-2.5 text-sm font-bold text-white">Nouvel événement</Link>
      </PageTitle>
      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <Kpi label="Recettes encaissées" value={fcfa(revenue)} sub="via Kkiapay" delay={0} />
        <Kpi label="Votes payants" value={num(paid)} delay={0.08} />
        <Kpi label="Votes gratuits" value={num(free)} delay={0.16} />
        <Kpi label="Alertes anti-fraude" value={num(alerts?.length ?? 0)} sub={`${active} événement(s) en ligne`} tone={(alerts?.length ?? 0) > 0 ? "bad" : undefined} delay={0.24} />
      </div>
      <div className="av-card av-scroll-x p-2">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Événement</th><th className="p-3 font-semibold">Statut</th><th className="p-3 font-semibold">Clôture</th><th className="p-3 font-semibold">Votes</th><th className="p-3 font-semibold">Recettes</th></tr></thead>
          <tbody>
            {(events as EventRow[] | null)?.map((e) => {
              const v = (stats ?? []).filter((s) => s.event_id === e.id).reduce((a, s) => a + Number(s.paid_votes) + Number(s.free_votes), 0);
              const r = (rev ?? []).filter((x) => x.event_id === e.id).reduce((a, x) => a + Number(x.revenue_xof), 0);
              return (
                <tr key={e.id} className="border-t border-[#EEF1F6] transition-colors hover:bg-bg">
                  <td className="p-3 font-semibold"><Link href={`/organisateur/evenements/${e.id}`} className="hover:text-primary">{e.title}</Link></td>
                  <td className="p-3"><Badge tone={e.status === "published" ? "green" : e.status === "closed" ? "gray" : "amber"}>{STATUS_LABELS[e.status]}</Badge></td>
                  <td className="p-3 text-muted">{dateFr(e.vote_closes_at, true)}</td>
                  <td className="p-3">{num(v)}</td>
                  <td className="p-3">{fcfa(r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!events?.length && <p className="p-6 text-center text-muted">Aucun événement. <Link href="/organisateur/evenements/nouveau" className="font-semibold text-primary">Créez le premier</Link>.</p>}
      </div>
    </>
  );
}
