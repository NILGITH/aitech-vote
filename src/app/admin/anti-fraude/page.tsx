import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Badge } from "@/components/ui/Field";
import { resolveAlert } from "../actions";
import { dateFr } from "@/lib/format";

const KIND: Record<string, string> = { hourly_cap: "Plafond horaire de votes payants atteint" };

export default async function FraudAdmin() {
  const db = createAdminClient();
  const { data: alerts } = await db.from("fraud_alerts").select("*, events(title)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageTitle title="Anti-fraude" sub="Alertes levées automatiquement par les règles de chaque événement (plafonds, quotas, pics)." />
      <div className="flex flex-col gap-3">
        {alerts?.map((a) => (
          <section key={a.id} className={`av-card flex flex-wrap items-center gap-3 p-4 ${a.status === "open" ? "border-[#F5C2BE]" : ""}`}>
            <div className="min-w-[240px] flex-1">
              <div className="font-bold">{KIND[a.kind] ?? a.kind}</div>
              <div className="text-[13px] text-muted">{(a.events as { title: string } | null)?.title} · {dateFr(a.created_at, true)} · {Object.entries(a.details ?? {}).map(([k, v]) => `${k} : ${v}`).join(" · ")}</div>
            </div>
            <Badge tone={a.status === "open" ? "red" : "gray"}>{a.status === "open" ? "À traiter" : a.status === "resolved" ? "Traitée" : "Ignorée"}</Badge>
            {a.status === "open" && <><ActionForm action={resolveAlert.bind(null, a.id, "resolved")} submit="Marquer traitée" /><ActionForm action={resolveAlert.bind(null, a.id, "dismissed")} submit="Ignorer" danger /></>}
          </section>
        ))}
        {!alerts?.length && <p className="av-card p-6 text-center text-muted">Aucune alerte.</p>}
      </div>
    </>
  );
}
