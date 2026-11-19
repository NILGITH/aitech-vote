import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageTitle } from "@/components/admin/Shell";
import { ActionForm, Badge } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { adminResendConsent, adminUnpublish } from "../actions";
import { CONSENT_LABELS, dateFr } from "@/lib/format";

const TONE: Record<string, "green" | "amber" | "red" | "gray"> = { accepted: "green", pending: "amber", refused: "red", bounced: "gray", withdrawn: "red", not_sent: "gray" };
const FILTERS = [["", "Tous"], ["accepted", "Publiés"], ["pending", "En attente"], ["refused", "Refusés"], ["not_sent", "Non envoyés"]] as const;

type LogEntry = { at: string; what: string; ip?: string; note?: string };
const WHAT: Record<string, string> = { email_sent: "E-mail envoyé", reminder_sent: "Relance envoyée", accepted: "Accepté et validé · publié automatiquement", refused: "Refusé", error_reported: "Erreur signalée", withdrawn: "Accord retiré" };

export default async function AdminCandidates({ searchParams }: { searchParams: Promise<{ statut?: string; voir?: string }> }) {
  const { statut = "", voir } = await searchParams;
  const db = createAdminClient();
  let q = db.from("candidates").select("id, display_name, code, photo_url, consent_status, events(title)").order("updated_at", { ascending: false }).limit(200);
  if (statut) q = q.eq("consent_status", statut);
  const [{ data: cands }, { data: counts }] = await Promise.all([q, db.from("candidates").select("consent_status")]);
  const c = (s: string) => (counts ?? []).filter((x) => x.consent_status === s).length;
  const sel = voir ? (cands ?? []).find((x) => x.id === voir) : null;
  const { data: priv } = sel ? await db.from("candidate_private").select("email, consent_log, consent_ip, consent_decided_at, consent_terms_version, consent_snapshot").eq("candidate_id", sel.id).maybeSingle() : { data: null };

  return (
    <>
      <PageTitle title="Candidats et consentements" sub="Un profil n'apparaît en ligne qu'après le clic du candidat sur « Accepter et valider » dans l'e-mail reçu." />
      <div className="mb-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))" }}>
        {[["accepted", "Publiés", "text-success"], ["pending", "En attente", "text-[#8A5A00]"], ["refused", "Refusés", "text-danger"], ["bounced", "E-mails non remis", "text-[#4A5468]"]].map(([k, l, cls]) => (
          <Link key={k} href={statut === k ? "?" : `?statut=${k}`} className={`av-lift rounded-2xl border bg-white p-4 ${statut === k ? "border-2 border-primary" : "border-line"}`}>
            <span className="block text-[13px] font-semibold text-muted">{l}</span>
            <span className={`mt-1 block font-heading text-[26px] font-extrabold ${cls}`}>{c(k)}</span>
          </Link>
        ))}
      </div>
      <nav className="av-scroll-x mb-4"><div className="flex w-max gap-2">{FILTERS.map(([k, l]) => <Link key={k} href={k ? `?statut=${k}` : "?"} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${statut === k ? "bg-ink text-white" : "border border-[#CBD3E1] bg-white"}`}>{l}</Link>)}</div></nav>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="av-card av-scroll-x p-2">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Candidat</th><th className="p-3 font-semibold">Événement</th><th className="p-3 font-semibold">Statut</th></tr></thead>
            <tbody>
              {cands?.map((x) => (
                <tr key={x.id} className={`border-t border-[#EEF1F6] transition-colors hover:bg-bg ${voir === x.id ? "bg-[#EEF4FE]" : ""}`}>
                  <td className="p-3"><Link href={`?${statut ? `statut=${statut}&` : ""}voir=${x.id}`} className="flex items-center gap-2.5"><Avatar name={x.display_name} src={x.photo_url} size={34} radius={10} /><span><span className="block font-bold">{x.display_name}</span><span className="block text-xs text-muted">{x.code}</span></span></Link></td>
                  <td className="p-3 text-[#4A5468]">{(x.events as unknown as { title: string } | null)?.title}</td>
                  <td className="p-3"><Badge tone={TONE[x.consent_status]}>{CONSENT_LABELS[x.consent_status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cands?.length && <p className="p-6 text-center text-muted">Aucun candidat.</p>}
        </section>
        {sel ? (
          <section className="av-card flex flex-col gap-3 self-start p-5" style={{ animation: "av-fade-up .35s ease-out both" }}>
            <div className="flex items-center gap-3"><Avatar name={sel.display_name} src={sel.photo_url} size={52} radius={14} /><div><div className="font-heading text-lg font-bold">{sel.display_name}</div><div className="text-[13px] text-muted">{(sel.events as unknown as { title: string } | null)?.title}</div></div></div>
            <Badge tone={TONE[sel.consent_status]}>{CONSENT_LABELS[sel.consent_status]}</Badge>
            <div className="text-sm font-bold">Historique du consentement</div>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {((priv?.consent_log ?? []) as LogEntry[]).map((l, i) => (
                <li key={i} className="flex gap-2.5 text-[13px]"><span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${l.what === "accepted" ? "bg-success" : l.what === "refused" || l.what === "withdrawn" ? "bg-[#D92D20]" : "bg-primary"}`} /><span><strong className="block">{WHAT[l.what] ?? l.what}</strong><span className="text-muted">{dateFr(l.at, true)}{l.ip ? ` · IP ${l.ip.replace(/\.\d+$/, ".x")}` : ""}{l.note ? ` · ${l.note}` : ""}</span></span></li>
              ))}
            </ol>
            {!priv?.consent_log?.length && <p className="m-0 text-sm text-muted">Aucune demande envoyée.</p>}
            <div className="rounded-xl bg-bg p-3 text-[13px] leading-relaxed text-[#4A5468]"><strong className="text-ink">Preuve conservée</strong><br />Date, adresse IP, appareil, version des conditions ({priv?.consent_terms_version ?? "—"}) et copie des informations publiées.</div>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={adminResendConsent.bind(null, sel.id)} submit="Renvoyer l'e-mail" />
              {sel.consent_status === "accepted" && <ActionForm action={adminUnpublish.bind(null, sel.id)} submit="Retirer la publication" danger confirmText="Retirer ce profil du site ?" />}
            </div>
          </section>
        ) : (
          <p className="av-card self-start p-5 text-sm text-muted">Sélectionnez un candidat pour voir l&apos;historique de son consentement.</p>
        )}
      </div>
    </>
  );
}
