"use client";
import { useActionState } from "react";
import type { AuthState } from "@/app/(public)/connexion/actions";

type Field = { name: string; label: string; type?: string; autoComplete?: string; required?: boolean; placeholder?: string };

export function AuthForm({ action, fields, submit, hidden }: { action: (s: AuthState, f: FormData) => Promise<AuthState>; fields: Field[]; submit: string; hidden?: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="av-label">{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required={f.required ?? true} placeholder={f.placeholder} className="av-input" />
        </div>
      ))}
      {state.error && <p role="alert" className="m-0 rounded-xl bg-[#FFF6F5] p-3 text-sm text-danger">{state.error}</p>}
      {state.info && <p role="status" className="m-0 rounded-xl bg-[#E6F5EF] p-3 text-sm text-[#0E5A45]">{state.info}</p>}
      <button disabled={pending} className="av-btn h-[52px] rounded-[14px] bg-primary font-bold text-white">{pending ? "Patientez…" : submit}</button>
    </form>
  );
}
