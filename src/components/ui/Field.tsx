"use client";
import { useActionState, useEffect, useState } from "react";

export type ActionState = { ok?: boolean; error?: string; message?: string };
type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

/** Formulaire avec retour visuel (enregistré / erreur), réutilisé dans les espaces privés. */
export function ActionForm({ action, children, submit = "Enregistrer", className = "", danger = false, confirmText }: { action: Action; children?: React.ReactNode; submit?: string; className?: string; danger?: boolean; confirmText?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (state.ok || state.error) {
      setShown(true);
      const t = setTimeout(() => setShown(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <form
      action={formAction}
      className={`flex flex-col gap-4 ${className}`}
      onSubmit={(e) => { if (confirmText && !confirm(confirmText)) e.preventDefault(); }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={`av-btn h-11 rounded-[10px] px-5 text-sm font-bold text-white ${danger ? "bg-danger" : "bg-primary"}`}>{pending ? "Patientez…" : submit}</button>
        {shown && state.ok && <span role="status" className="av-fade-up text-sm font-semibold text-success">{state.message ?? "Enregistré"}</span>}
        {shown && state.error && <span role="alert" className="av-fade-up text-sm font-semibold text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function Input({ label, name, hint, ...rest }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="av-label">{label}</label>
      <input id={name} name={name} className="av-input h-11" {...rest} />
      {hint && <p className="m-0 mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ name, label, sub, defaultChecked }: { name: string; label: string; sub?: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#EEF1F6] py-2.5 first:border-t-0">
      <span className="text-sm"><span className="block font-semibold">{label}</span>{sub && <span className="block text-[13px] text-muted">{sub}</span>}</span>
      <input type="hidden" name={name} value={on ? "on" : ""} />
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => setOn(!on)} className={`flex h-7 w-12 flex-none rounded-full p-[3px] transition-colors ${on ? "justify-end bg-primary" : "justify-start bg-[#CBD3E1]"}`}>
        <span className="block h-[22px] w-[22px] rounded-full bg-white shadow" />
      </button>
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "gray" | "blue" }) {
  const t = { green: "bg-[#E6F5EF] text-[#0E5A45]", amber: "bg-[#FDF3DC] text-[#8A5A00]", red: "bg-[#FDECEC] text-danger", gray: "bg-[#F1F4F9] text-[#4A5468]", blue: "bg-[#E8F0FD] text-[#1650B8]" }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${t}`}>{children}</span>;
}
