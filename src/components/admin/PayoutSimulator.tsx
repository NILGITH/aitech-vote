"use client";
import { useState } from "react";
import { fcfa } from "@/lib/format";

/** Simulateur de reversement : calcule en direct ce que reçoit l'organisateur. */
export function PayoutSimulator({ plans, feePct, feeBearer }: { plans: { name: string; commission_pct: number }[]; feePct: number | null; feeBearer: string }) {
  const [amount, setAmount] = useState("1000000");
  const [plan, setPlan] = useState(Math.min(1, plans.length - 1));
  const a = Number(amount.replace(/\D/g, "")) || 0;
  const fee = feeBearer === "organizer" ? (a * (feePct ?? 0)) / 100 : 0;
  const com = (a * Number(plans[plan]?.commission_pct ?? 0)) / 100;
  return (
    <section className="flex flex-col gap-3.5 rounded-[var(--av-radius)] bg-ink p-5 text-white">
      <h2 className="m-0 text-[17px] font-bold">Simulateur de reversement</h2>
      <label className="text-sm text-[#C9D3E6]">Votes encaissés (FCFA)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="av-input mt-1.5 h-11" />
      </label>
      <div className="flex flex-wrap gap-2">
        {plans.map((p, i) => (
          <button key={p.name} type="button" onClick={() => setPlan(i)} className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${plan === i ? "bg-accent text-ink" : "border border-[#3A4C70] text-[#DCE3F0]"}`}>{p.name}</button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Frais Kkiapay ({feePct ?? 0} %{feeBearer !== "organizer" ? ", non déduits" : ""})</span><span className="font-semibold text-white">− {fcfa(fee)}</span></div>
      <div className="flex justify-between text-sm text-[#C9D3E6]"><span>Commission ({Number(plans[plan]?.commission_pct ?? 0).toLocaleString("fr-FR")} %)</span><span className="font-semibold text-white">− {fcfa(com)}</span></div>
      <div className="flex items-baseline justify-between border-t border-[#23365C] pt-3"><span className="text-sm text-[#C9D3E6]">L&apos;organisateur reçoit</span><span className="font-heading text-[26px] font-extrabold text-accent">{fcfa(a - fee - com)}</span></div>
      <p className="m-0 text-xs text-[#9FB0CF]">Calcul à partir des valeurs enregistrées.</p>
    </section>
  );
}
