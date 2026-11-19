import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, Badge, Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { deleteCandidate, requestAllConsents, requestConsent, saveCandidate } from "../../../actions";
import { CONSENT_LABELS, dateFr } from "@/lib/format";
import type { Candidate, Category } from "@/lib/types";

const TONE: Record<string, "green" | "amber" | "red" | "gray"> = { accepted: "green", pending: "amber", refused: "red", bounced: "gray", withdrawn: "red", not_sent: "gray" };

export default async function CandidatesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string }> }) {
  const { id } = await params;
  const editId = (await searchParams).modifier;
  const db = await createClient();
  const [{ data: cats }, { data: cands }, { data: privs }] = await Promise.all([
    db.from("categories").select("*").eq("event_id", id).order("position"),
    db.from("candidates").select("*").eq("event_id", id).order("position").order("created_at"),
    db.from("candidate_private").select("candidate_id, email, phone, consent_sent_at, consent_decided_at, consent_reminders").eq("event_id", id),
  ]);
  const priv = Object.fromEntries((privs ?? []).map((p) => [p.candidate_id, p]));
  const editing = (cands as Candidate[] | null)?.find((c) => c.id === editId) ?? null;
  const ep = editing ? priv[editing.id] : null;
  const counts = { accepted: 0, pending: 0, other: 0 };
  (cands ?? []).forEach((c) => (c.consent_status === "accepted" ? counts.accepted++ : c.consent_status === "pending" ? counts.pending++ : counts.other++));

  if (!cats?.length) return <p className="av-card p-6 text-center text-muted">Créez d&apos;abord une catégorie.</p>;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 text-sm">
          <span><strong className="text-success">{counts.accepted}</strong> publiés · <strong className="text-[#8A5A00]">{counts.pending}</strong> en attente · <strong>{counts.other}</strong> à envoyer ou refusés</span>
          <ActionForm action={requestAllConsents.bind(null, id)} submit="Envoyer / relancer les demandes" />
        </div>
        <p className="m-0 text-[13px] text-muted">Un profil n&apos;apparaît en ligne qu&apos;après le clic du candidat sur « Accepter et valider » dans l&apos;e-mail. Toute modification ultérieure du profil redemande son accord.</p>
        <div className="av-card av-scroll-x p-2">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="p-3 font-semibold">Candidat</th><th className="p-3 font-semibold">Catégorie</th><th className="p-3 font-semibold">Consentement</th><th className="p-3 font-semibold">Actions</th></tr></thead>
            <tbody>
              {(cands as Candidate[] | null)?.map((c) => (
                <tr key={c.id} className="border-t border-[#EEF1F6] align-middle">
                  <td className="p-3"><div className="flex items-center gap-2.5"><Avatar name={c.display_name} src={c.photo_url} size={36} radius={10} /><div><div className="font-semibold">{c.display_name}</div><div className="text-xs text-muted">{c.code} · {priv[c.id]?.email ?? "e-mail manquant"}</div></div></div></td>
                  <td className="p-3 text-muted">{(cats as Category[]).find((x) => x.id === c.category_id)?.name}</td>
                  <td className="p-3"><Badge tone={TONE[c.consent_status]}>{CONSENT_LABELS[c.consent_status]}</Badge><div className="mt-1 text-xs text-muted">{priv[c.id]?.consent_decided_at ? `le ${dateFr(priv[c.id].consent_decided_at, true)}` : priv[c.id]?.consent_sent_at ? `envoyé le ${dateFr(priv[c.id].consent_sent_at)}` : ""}</div></td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`?modifier=${c.id}`} className="rounded-lg border border-[#CBD3E1] px-3 py-2 text-xs font-semibold">Modifier</Link>
                      {c.consent_status !== "accepted" && <ActionForm action={requestConsent.bind(null, id, c.id)} submit={c.consent_status === "pending" ? "Relancer" : "Demander l'accord"} />}
                      <ActionForm action={deleteCandidate.bind(null, id, c.id)} submit="Supprimer" danger confirmText={`Supprimer ${c.display_name} ?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cands?.length && <p className="p-6 text-center text-muted">Aucun candidat. Ajoutez-en avec le formulaire.</p>}
        </div>
      </section>

      <section className="av-card self-start p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-[17px] font-bold">{editing ? "Modifier le candidat" : "Ajouter un candidat"}</h2>{editing && <Link href="?" className="text-sm font-semibold text-primary">Annuler</Link>}</div>
        <ActionForm key={editing?.id ?? "new"} action={saveCandidate.bind(null, id, editing?.id ?? null)} submit={editing ? "Enregistrer" : "Ajouter"}>
          <Input label="Nom affiché" name="display_name" required defaultValue={editing?.display_name} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Code candidat" name="code" required placeholder="MUS-014" defaultValue={editing?.code} />
            <div>
              <label htmlFor="category_id" className="av-label">Catégorie</label>
              <select id="category_id" name="category_id" defaultValue={editing?.category_id} className="av-input h-11">
                {(cats as Category[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label htmlFor="bio" className="av-label">Présentation</label><textarea id="bio" name="bio" rows={3} defaultValue={editing?.bio ?? ""} className="av-input" /></div>
          <Input label="Photo (lien)" name="photo_url" defaultValue={editing?.photo_url ?? ""} placeholder="https://…" />
          <Input label="Vidéo (lien)" name="video_url" defaultValue={editing?.video_url ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Instagram" name="instagram" defaultValue={editing?.social?.instagram ?? ""} />
            <Input label="TikTok" name="tiktok" defaultValue={editing?.social?.tiktok ?? ""} />
          </div>
          <div className="rounded-xl bg-bg p-3">
            <div className="mb-2 text-xs font-bold text-muted">COORDONNÉES PRIVÉES (jamais publiées)</div>
            <div className="grid gap-3">
              <Input label="E-mail du candidat (pour son accord)" name="email" type="email" defaultValue={ep?.email ?? ""} />
              <Input label="Téléphone" name="phone" defaultValue={ep?.phone ?? ""} />
            </div>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
