"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

type Cand = { id: string; display_name: string; photo_url: string | null; bio: string | null; category_id: string };
type Cat = { id: string; name: string; max_choices: number; description: string | null };

async function post<T>(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
}

export function BallotFlow({ eventId, categories, candidates, alreadyVerified }: { eventId: string; categories: Cat[]; candidates: Cand[]; alreadyVerified: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"id" | "code" | "ballot" | "review">(alreadyVerified ? "ballot" : "id");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cat = categories[idx];

  const toggle = (catId: string, candId: string, max: number) =>
    setChoices((c) => {
      const cur = c[catId] ?? [];
      if (cur.includes(candId)) return { ...c, [catId]: cur.filter((x) => x !== candId) };
      if (max === 1) return { ...c, [catId]: [candId] };
      if (cur.length >= max) return c;
      return { ...c, [catId]: [...cur, candId] };
    });

  async function identify() {
    setBusy(true); setError(null);
    const r = await post("/api/ballot/identify", { eventId, identifier });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Erreur");
    setStep("code");
  }
  async function verify() {
    setBusy(true); setError(null);
    const r = await post("/api/ballot/verify", { eventId, identifier, code });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Erreur");
    setStep("ballot");
  }
  async function cast() {
    setBusy(true); setError(null);
    const r = await post<{ receipt: string }>("/api/ballot/cast", { eventId, choices });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Erreur");
    router.push(`/recu/${r.data.receipt}?nouveau=1`);
  }

  return (
    <div className="flex flex-col gap-5">
      {step === "id" && (
        <div className="av-fade-up flex flex-col gap-3">
          <label htmlFor="ident" className="av-label">E-mail ou numéro inscrit sur la liste électorale</label>
          <input id="ident" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="av-input" placeholder="prenom.nom@exemple.ci ou 07 08 12 34 56" autoComplete="email" />
          <button disabled={busy || identifier.length < 4} onClick={identify} className="av-btn h-[54px] rounded-[14px] bg-primary font-bold text-white">{busy ? "Envoi…" : "Recevoir mon code"}</button>
        </div>
      )}
      {step === "code" && (
        <div className="av-fade-up flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">Si vous êtes inscrit, un code vient d&apos;être envoyé {identifier.includes("@") ? "par e-mail" : "sur WhatsApp"}.</p>
          <label htmlFor="code" className="av-label">Code reçu</label>
          <input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="av-input text-center font-heading text-2xl tracking-[.4em]" autoComplete="one-time-code" />
          <button disabled={busy || code.length !== 6} onClick={verify} className="av-btn h-[54px] rounded-[14px] bg-primary font-bold text-white">{busy ? "Vérification…" : "Accéder au bulletin"}</button>
        </div>
      )}
      {step === "ballot" && cat && (
        <div key={cat.id} className="av-fade-up flex flex-col gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {categories.map((c, i) => <span key={c.id} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-accent" : "bg-[#E3E7EF]"}`} />)}
          </div>
          <p className="m-0 text-sm text-muted">Poste {idx + 1} sur {categories.length}</p>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 p-0 font-heading text-lg font-bold">{cat.name} · {cat.max_choices === 1 ? "choisissez 1 candidat" : `jusqu'à ${cat.max_choices} candidats`}</legend>
            {candidates.filter((c) => c.category_id === cat.id).map((c) => {
              const on = (choices[cat.id] ?? []).includes(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(cat.id, c.id, cat.max_choices)} className={`flex min-h-[72px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition-all ${on ? "border-2 border-primary bg-[#E8F0FD]" : "border border-[#CBD3E1] bg-white"}`}>
                  <Avatar name={c.display_name} src={c.photo_url} size={48} />
                  <span className="flex-1"><span className="block text-[15px] font-bold">{c.display_name}</span>{c.bio && <span className="line-clamp-1 block text-[13px] text-muted">{c.bio}</span>}</span>
                  <span className={`h-6 w-6 flex-none rounded-full ${on ? "border-[7px] border-primary bg-white" : "border-2 border-[#9AA4B5]"}`} />
                </button>
              );
            })}
            <button type="button" aria-pressed={(choices[cat.id] ?? []).length === 0} onClick={() => setChoices((c) => ({ ...c, [cat.id]: [] }))} className="rounded-[14px] border border-dashed border-[#9AA4B5] bg-white px-4 py-3 text-left text-sm font-semibold text-[#4A5468]">
              Vote blanc pour ce poste
            </button>
          </fieldset>
          <div className="rounded-xl bg-[#FDF3DC] p-3 text-[13px] leading-normal text-[#6B4700]">Votre choix est enregistré séparément de votre identité. Personne, pas même l&apos;organisateur, ne peut savoir pour qui vous avez voté.</div>
          <div className="flex gap-2.5">
            <button type="button" disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="h-[54px] flex-1 rounded-[14px] border border-[#CBD3E1] bg-white font-bold disabled:opacity-40">Retour</button>
            {idx < categories.length - 1 ? (
              <button type="button" onClick={() => setIdx(idx + 1)} className="av-btn h-[54px] flex-[2] rounded-[14px] bg-primary font-bold text-white">Poste suivant</button>
            ) : (
              <button type="button" onClick={() => setStep("review")} className="av-btn h-[54px] flex-[2] rounded-[14px] bg-primary font-bold text-white">Relire mon bulletin</button>
            )}
          </div>
        </div>
      )}
      {step === "review" && (
        <div className="av-fade-up flex flex-col gap-3">
          <h2 className="m-0 text-lg font-bold">Récapitulatif</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((c) => {
              const names = (choices[c.id] ?? []).map((id) => candidates.find((x) => x.id === id)?.display_name).filter(Boolean);
              return <li key={c.id} className="av-card flex justify-between gap-3 p-3 text-sm"><span className="text-muted">{c.name}</span><strong className="text-right">{names.length ? names.join(", ") : "Vote blanc"}</strong></li>;
            })}
          </ul>
          <p className="m-0 text-sm text-muted">Une fois déposé, le bulletin ne peut plus être modifié.</p>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setStep("ballot")} className="h-[54px] flex-1 rounded-[14px] border border-[#CBD3E1] bg-white font-bold">Modifier</button>
            <button type="button" disabled={busy} onClick={cast} className="av-btn h-[54px] flex-[2] rounded-[14px] bg-success font-bold text-white">{busy ? "Dépôt…" : "Déposer mon bulletin"}</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="m-0 rounded-xl bg-[#FFF6F5] p-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
