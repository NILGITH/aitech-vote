"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Le clic sur « Accepter et valider » dans l'e-mail ouvre cette page, qui enregistre
 * l'accord automatiquement. L'enregistrement se fait par une requête POST déclenchée
 * dans le navigateur : les robots qui pré-ouvrent les liens des e-mails ne valident
 * donc rien à la place du candidat.
 */
export function ConsentAction({ token, action, name, eventTitle, alreadyAccepted }: { token: string; action: "accepter" | "refuser" | "erreur"; name: string; eventTitle: string; alreadyAccepted: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(alreadyAccepted && action === "accepter" ? "done" : "idle");
  const [result, setResult] = useState<{ slug?: string; code?: string }>({});
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [withdrawn, setWithdrawn] = useState(false);
  const fired = useRef(false);

  async function send(decision: "accept" | "refuse" | "report" | "withdraw") {
    setState("busy");
    const res = await fetch("/api/consent/decide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, decision, note }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setState("error"); setMessage(data.error ?? "Erreur"); return; }
    if (decision === "withdraw") setWithdrawn(true);
    setResult(data);
    setState("done");
  }

  useEffect(() => {
    if (action === "accepter" && !alreadyAccepted && !fired.current) {
      fired.current = true;
      send("accept");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "error") return <p role="alert" className="rounded-xl bg-[#FFF6F5] p-4 text-danger">{message}</p>;

  if (action === "accepter") {
    if (state !== "done") return <p className="text-center text-muted">Enregistrement de votre accord…</p>;
    if (withdrawn) return <p className="av-fade-up rounded-xl bg-bg p-4 text-center">Votre accord est retiré : votre profil n&apos;est plus visible.</p>;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-[88px] w-[88px]">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-success" style={{ animation: "av-ring 1.8s ease-out infinite" }} />
          <span className="av-pop absolute inset-0 flex items-center justify-center rounded-full bg-success">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5" style={{ strokeDasharray: 30, animation: "av-draw .5s .5s ease-out both" }} /></svg>
          </span>
        </div>
        <h1 className="av-fade-up m-0 text-[25px] font-extrabold">Merci, votre profil est en ligne !</h1>
        <p className="av-fade-up m-0 text-[15px] text-[#4A5468]">Votre accord pour {eventTitle} est enregistré. Les votes pour vous sont ouverts dès la publication de l&apos;événement.</p>
        {result.slug && result.code && (
          <>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Votez pour moi (${result.code}) : ${location.origin}/e/${result.slug}/c/${result.code}`)}`} target="_blank" rel="noopener noreferrer" className="av-btn flex h-[54px] w-full items-center justify-center rounded-[14px] bg-[#1FA855] font-bold text-white">Inviter mes fans à voter</a>
            <Link href={`/e/${result.slug}/c/${result.code}`} className="font-semibold text-primary">Voir mon profil</Link>
          </>
        )}
        <button type="button" onClick={() => confirm("Retirer votre accord ? Votre profil sera masqué.") && send("withdraw")} className="text-sm font-semibold text-danger">Retirer mon accord</button>
      </div>
    );
  }

  if (state === "done") return <p className="av-fade-up rounded-xl bg-bg p-4 text-center">{action === "refuser" ? "C'est noté : votre profil ne sera pas publié. L'organisateur est prévenu." : "Merci, l'organisateur est prévenu et corrigera vos informations. Vous recevrez une nouvelle demande."}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0">{action === "refuser" ? `Confirmez-vous refuser la publication de votre profil (${name}) ?` : "Indiquez l'erreur à corriger :"}</p>
      {action === "erreur" && <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="av-input" placeholder="Ex. : mon nom s'écrit…" />}
      <button disabled={state === "busy" || (action === "erreur" && note.length < 3)} onClick={() => send(action === "refuser" ? "refuse" : "report")} className={`av-btn h-[54px] rounded-[14px] font-bold text-white ${action === "refuser" ? "bg-danger" : "bg-primary"}`}>
        {action === "refuser" ? "Je refuse la publication" : "Envoyer"}
      </button>
    </div>
  );
}
