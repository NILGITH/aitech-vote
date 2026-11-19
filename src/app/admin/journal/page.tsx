import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { dateFr } from "@/lib/format";

export default async function AuditLog() {
  const db = createAdminClient();
  const { data: rows } = await db.from("audit_log").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageTitle title="Journal d'audit" sub="Chaque modification sensible faite dans le back-office (clés, tarifs, apparence, comptes, reversements)." />
      <div className="av-card av-scroll-x p-2">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Auteur</th><th className="p-3 font-semibold">Action</th><th className="p-3 font-semibold">Cible</th></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-[#EEF1F6]">
                <td className="whitespace-nowrap p-3 text-muted">{dateFr(r.created_at, true)}</td>
                <td className="p-3">{(r.profiles as { full_name: string; email: string } | null)?.full_name || (r.profiles as { email: string } | null)?.email}</td>
                <td className="p-3 font-mono text-xs">{r.action}</td>
                <td className="p-3 text-muted">{r.entity} {r.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows?.length && <p className="p-6 text-center text-muted">Journal vide.</p>}
      </div>
    </>
  );
}
