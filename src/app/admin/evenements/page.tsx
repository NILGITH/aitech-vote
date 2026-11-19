import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Badge } from "@/components/ui/Field";
import { adminSetEventStatus } from "../actions";
import { STATUS_LABELS, dateFr, fcfa, num } from "@/lib/format";

export default async function EventsAdmin() {
  const db = createAdminClient();
  const [{ data: events }, { data: stats }, { data: rev }] = await Promise.all([
    db.from("events").select("id, title, slug, status, modes, vote_closes_at, profiles(full_name, organization_name)").order("created_at", { ascending: false }).limit(200),
    db.from("candidate_stats").select("event_id, total_votes"),
    db.from("candidate_revenue").select("event_id, revenue_xof"),
  ]);
  return (
    <>
      <PageTitle title="Tous les événements" sub="Suspendez, archivez ou rouvrez un événement de n'importe quel organisateur." />
      <div className="av-card av-scroll-x p-2">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Événement</th><th className="p-3 font-semibold">Organisateur</th><th className="p-3 font-semibold">Statut</th><th className="p-3 font-semibold">Clôture</th><th className="p-3 font-semibold">Votes</th><th className="p-3 font-semibold">Recettes</th><th className="p-3 font-semibold">Actions</th></tr></thead>
          <tbody>
            {events?.map((e) => {
              const org = e.profiles as unknown as { full_name: string; organization_name: string | null } | null;
              return (
                <tr key={e.id} className="border-t border-[#EEF1F6]">
                  <td className="p-3 font-semibold"><Link href={`/organisateur/evenements/${e.id}`} className="hover:text-primary">{e.title}</Link></td>
                  <td className="p-3 text-muted">{org?.organization_name || org?.full_name}</td>
                  <td className="p-3"><Badge tone={e.status === "published" ? "green" : e.status === "archived" ? "red" : "amber"}>{STATUS_LABELS[e.status]}</Badge></td>
                  <td className="p-3 text-muted">{dateFr(e.vote_closes_at)}</td>
                  <td className="p-3">{num((stats ?? []).filter((s) => s.event_id === e.id).reduce((a, s) => a + Number(s.total_votes), 0))}</td>
                  <td className="p-3">{fcfa((rev ?? []).filter((s) => s.event_id === e.id).reduce((a, s) => a + Number(s.revenue_xof), 0))}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-2">
                    {e.status === "published" && <ActionForm action={adminSetEventStatus.bind(null, e.id, "closed")} submit="Clôturer" danger />}
                    {e.status !== "archived" && <ActionForm action={adminSetEventStatus.bind(null, e.id, "archived")} submit="Archiver" danger confirmText="Archiver et retirer du site ?" />}
                    {(e.status === "archived" || e.status === "closed") && <ActionForm action={adminSetEventStatus.bind(null, e.id, "published")} submit="Republier" />}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
