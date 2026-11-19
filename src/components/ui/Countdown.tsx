"use client";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ to, variant = "inline" }: { to: string; variant?: "inline" | "blocks" | "compact" }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = parts(now === null ? 0 : target - now);
  if (now !== null && target - now <= 0) return <span>Vote clôturé</span>;

  if (variant === "blocks") {
    const items = [
      [p.d, "jours"],
      [p.h, "heures"],
      [p.m, "min"],
      [p.s, "sec"],
    ] as const;
    return (
      <div className="grid grid-cols-4 gap-2" aria-label="Temps restant avant la clôture">
        {items.map(([v, l]) => (
          <div key={l} className="rounded-xl bg-white/12 px-1 py-2.5 text-center" style={{ background: "rgba(255,255,255,.12)" }}>
            <div className="font-heading text-[22px] font-extrabold tabular-nums">{now === null ? "--" : pad(v)}</div>
            <div className="text-[11px] text-[#D3DDF0]">{l}</div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === "compact") return <span className="tabular-nums">{now === null ? "…" : `${p.d} j ${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`}</span>;
  return <span className="tabular-nums">{now === null ? "…" : `${p.d} j ${pad(p.h)} h ${pad(p.m)} min ${pad(p.s)} s`}</span>;
}
