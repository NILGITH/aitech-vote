import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventTabs } from "@/components/org/EventTabs";
import { ActionForm, Badge } from "@/components/ui/Field";
import { STATUS_LABELS } from "@/lib/format";
import { setEventStatus } from "../../actions";
import type { EventRow } from "@/lib/types";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("*").eq("id", id).maybeSingle<EventRow>();
  if (!e) notFound();
  const election = e.modes.includes("election");
  const tabs = [
    { slug: "", label: "Réglages" },
    { slug: "categories", label: election ? "Postes" : "Catégories" },
    { slug: "candidats", label: "Candidats" },
    ...(e.modes.includes("jury") ? [{ slug: "jury", label: "Jury" }] : []),
    ...(election ? [{ slug: "electeurs", label: "Électeurs" }] : []),
    { slug: "resultats", label: "Résultats" },
    ...(!election ? [{ slug: "paiements", label: "Paiements" }] : []),
  ];
  const publicUrl = election ? `/election/${e.slug}` : `/e/${e.slug}`;
  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/organisateur" className="text-sm font-semibold text-primary">← Mes événements</Link>
          <h1 className="m-0 mt-1 text-[clamp(22px,3vw,28px)] font-bold">{e.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={e.status === "published" ? "green" : e.status === "closed" ? "gray" : "amber"}>{STATUS_LABELS[e.status]}</Badge>
            <Link href={publicUrl} target="_blank" className="font-semibold text-primary">Voir la page publique ↗</Link>
            {e.modes.includes("live") && e.short_code && <Link href={`/direct/${e.short_code}`} target="_blank" className="font-semibold text-primary">Écran géant ↗</Link>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.status !== "published" && (
            <ActionForm action={setEventStatus.bind(null, e.id, "published")} submit={e.status === "closed" ? "Rouvrir le vote" : "Publier"} />
          )}
          {e.status === "published" && (
            <ActionForm action={setEventStatus.bind(null, e.id, "closed")} submit="Clôturer le vote" danger confirmText="Clôturer le vote ? Les résultats seront définitifs." />
          )}
        </div>
      </div>
      <EventTabs id={e.id} tabs={tabs} />
      {children}
    </div>
  );
}
