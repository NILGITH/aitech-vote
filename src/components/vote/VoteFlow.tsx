"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fcfa } from "@/lib/format";
import type { Pack } from "@/lib/types";

type KkiapayWindow = Window & {
  openKkiapayWidget?: (o: Record<string, unknown>) => void;
  addSuccessListener?: (cb: (r: { transactionId: string }) => void) => void;
  addFailedListener?: (cb: (r: unknown) => void) => void;
  addKkiapayListener?: (event: string, cb: (r: { transactionId?: string }) => void) => void;
  removeKkiapayListener?: (event: string) => void;
};

type Props = {
  candidateId: string;
  candidateName: string;
  paid: boolean;
  free: boolean;
  price: number;
  packs: Pack[];
  requireOtp: boolean;
  verifiedPhone: string | null;
  methods: string[];
};

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export function VoteFlow(p: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"paid" | "free">(p.paid ? "paid" : "free");
  const [pack, setPack] = useState(Math.min(2, p.packs.length - 1));
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState<string | null>(p.verifiedPhone);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"choose" | "otp" | "paying" | "confirming">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payment = useRef<{ paymentId: string } | null>(null);

  useEffect(() => {
    if (!p.paid || document.getElementById("kkiapay-js")) return;
    const s = document.createElement("script");
    s.id = "kkiapay-js";
    s.src = "https://cdn.kkiapay.me/k.js";
    s.async = true;
    document.body.appendChild(s);
  }, [p.paid]);

  const sel = p.packs[pack];
  const amount = sel ? sel.votes * p.price : 0;
  const needOtp = (p.requireOtp || mode === "free") && !verified;

  async function sendCode() {
    setError(null);
    setBusy(true);
    const r = await post("/api/otp/send", { phone });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Envoi impossible.");
    setStep("otp");
  }

  async function checkCode() {
    setError(null);
    setBusy(true);
    const r = await post<{ phone: string }>("/api/otp/verify", { phone, code });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Code incorrect.");
    setVerified(r.data.phone);
    setStep("choose");
  }

  async function confirm(transactionId: string) {
    if (!payment.current) return;
    setStep("confirming");
    for (let i = 0; i < 6; i++) {
      const r = await post<{ receipt: string }>("/api/payments/confirm", { paymentId: payment.current.paymentId, transactionId });
      if (r.ok && r.data.receipt) return router.push(`/recu/${r.data.receipt}?nouveau=1`);
      if (r.status !== 202) {
        setError(r.data.error ?? "Paiement non confirmé.");
        return setStep("choose");
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
    setError("Confirmation en attente. Votre vote sera ajouté automatiquement dès que Kkiapay confirme le paiement.");
    setStep("choose");
  }

  async function pay() {
    setError(null);
    setBusy(true);
    const r = await post<{ paymentId: string; amount: number; publicKey: string; sandbox: boolean; phone: string; reference: string; reason: string }>("/api/payments/init", {
      candidateId: p.candidateId,
      packIndex: pack,
      phone: p.requireOtp ? undefined : phone,
    });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Paiement impossible.");
    const w = window as KkiapayWindow;
    if (!w.openKkiapayWidget) return setError("Le module de paiement se charge, réessayez dans une seconde.");
    payment.current = { paymentId: r.data.paymentId };
    setStep("paying");
    const onSuccess = (res: { transactionId?: string }) => res?.transactionId && confirm(res.transactionId);
    if (w.addSuccessListener) w.addSuccessListener((res) => onSuccess(res));
    else w.addKkiapayListener?.("success", onSuccess);
    w.addFailedListener?.(() => { setError("Le paiement a échoué ou a été annulé."); setStep("choose"); });
    w.openKkiapayWidget({
      amount: r.data.amount,
      key: r.data.publicKey,
      api_key: r.data.publicKey,
      sandbox: r.data.sandbox,
      phone: r.data.phone,
      data: JSON.stringify({ reference: r.data.reference }),
      reason: r.data.reason,
      theme: getComputedStyle(document.documentElement).getPropertyValue("--av-primary").trim() || "#1F6FE5",
      position: "center",
    });
  }

  async function voteFree() {
    setError(null);
    setBusy(true);
    const r = await post<{ receipt: string }>("/api/votes/free", { candidateId: p.candidateId });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Vote impossible.");
    router.push(`/recu/${r.data.receipt}?nouveau=1`);
  }

  return (
    <div className="flex flex-col gap-5">
      {p.paid && p.free && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#EEF1F6] p-1" role="tablist" aria-label="Type de vote">
          {(["paid", "free"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-11 rounded-lg text-sm font-semibold transition-colors ${mode === m ? "bg-white shadow" : "text-muted"}`}>
              {m === "paid" ? "Vote payant" : "Vote gratuit (1/jour)"}
            </button>
          ))}
        </div>
      )}

      {mode === "paid" && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 text-[15px] font-bold">Combien de votes ?</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {p.packs.map((pk, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPack(i)}
                aria-pressed={pack === i}
                className={`min-h-[92px] rounded-[14px] p-3.5 text-left transition-all ${pack === i ? "border-2 border-primary bg-[#E8F0FD]" : "border border-[#CBD3E1] bg-white hover:border-primary"}`}
              >
                <span className="block font-heading text-[22px] font-extrabold">{pk.votes} <span className="text-sm font-semibold">vote{pk.votes > 1 ? "s" : ""}</span></span>
                <span className="block text-sm text-[#4A5468]">{fcfa(pk.votes * p.price)}</span>
                {pk.bonus > 0 && <span className="mt-1 block text-xs font-bold text-success">+{pk.bonus} offert{pk.bonus > 1 ? "s" : ""}</span>}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {needOtp && step !== "otp" && (
        <div>
          <label htmlFor="tel" className="av-label">Votre numéro WhatsApp</label>
          <div className="flex gap-2">
            <span className="flex h-12 items-center rounded-xl border border-[#CBD3E1] bg-white px-3 font-semibold">+225</span>
            <input id="tel" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 08 12 34 56" className="av-input" />
          </div>
          <p className="mt-2 text-[13px] text-muted">Pas de compte à créer. Vous recevrez un code de confirmation sur WhatsApp.</p>
        </div>
      )}

      {step === "otp" && (
        <div className="av-fade-up">
          <label htmlFor="otp" className="av-label">Code reçu sur WhatsApp</label>
          <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="av-input text-center font-heading text-2xl tracking-[.4em]" />
          <button type="button" onClick={() => setStep("choose")} className="mt-2 text-sm font-semibold text-primary">Changer de numéro</button>
        </div>
      )}

      {verified && (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-[#E6F5EF] px-3.5 py-3 text-sm text-[#0E5A45]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          Numéro <strong>{verified}</strong> confirmé
        </div>
      )}

      {error && <p role="alert" className="m-0 rounded-xl bg-[#FFF6F5] px-3.5 py-3 text-sm text-danger">{error}</p>}

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t border-line bg-white px-5 pb-6 pt-4 sm:static sm:mx-0 sm:rounded-2xl sm:border">
        {mode === "paid" && (
          <div className="flex justify-between text-[15px]">
            <span className="text-[#4A5468]">{sel.votes + sel.bonus} votes pour {p.candidateName}</span>
            <strong className="font-heading text-xl">{fcfa(amount)}</strong>
          </div>
        )}
        {needOtp && step !== "otp" ? (
          <button disabled={busy || phone.replace(/\D/g, "").length < 8} onClick={sendCode} className="av-btn h-[54px] rounded-[14px] bg-primary text-base font-bold text-white">
            {busy ? "Envoi…" : "Recevoir mon code"}
          </button>
        ) : step === "otp" ? (
          <button disabled={busy || code.length !== 6} onClick={checkCode} className="av-btn h-[54px] rounded-[14px] bg-primary text-base font-bold text-white">
            {busy ? "Vérification…" : "Valider le code"}
          </button>
        ) : mode === "paid" ? (
          <button disabled={busy || step === "paying" || step === "confirming"} onClick={pay} className="av-btn h-[54px] rounded-[14px] bg-primary text-base font-bold text-white">
            {step === "confirming" ? "Confirmation du paiement…" : step === "paying" ? "Paiement en cours…" : busy ? "Préparation…" : `Payer ${fcfa(amount)}`}
          </button>
        ) : (
          <button disabled={busy} onClick={voteFree} className="av-btn h-[54px] rounded-[14px] bg-primary text-base font-bold text-white">
            {busy ? "Enregistrement…" : "Valider mon vote gratuit"}
          </button>
        )}
        {mode === "paid" && (
          <p className="m-0 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Paiement sécurisé par Kkiapay · {p.methods.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
