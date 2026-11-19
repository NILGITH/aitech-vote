"use client";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useLiveStats, type LiveStat } from "./useLiveStats";
import { num } from "@/lib/format";

type C = { id: string; display_name: string; code: string; photo_url: string | null; category_id: string };
type Cat = { id: string; name: string };

/** Écran géant : résultats animés, rotation automatique des catégories. */
export function BigScreen({ eventId, title, categories, candidates, initial, qr, url, closesAt, rotateSeconds = 20 }: {
  eventId: string; title: string; categories: Cat[]; candidates: C[]; initial: LiveStat[]; qr: string; url: string; closesAt: string | null; rotateSeconds?: number;
}) {
  const { stats } = useLiveStats(eventId, initial);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    const r = setInterval(() => setIdx((i) => (i + 1) % Math.max(1, categories.length)), rotateSeconds * 1000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [categories.length, rotateSeconds]);

  const cat = categories[idx];
  const list = candidates
    .filter((c) => c.category_id === cat?.id)
    .map((c) => ({ ...c, v: stats[c.id]?.total_votes ?? 0 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);
  const total = list.reduce((a, c) => a + c.v, 0) || 1;
  const all = Object.values(stats).reduce((a, s) => a + s.total_votes, 0);
  const left = closesAt && now !== null ? Math.max(0, new Date(closesAt).getTime() - now) : null;
  const clock = left === null ? null : `${String(Math.floor(left / 3600000)).padStart(2, "0")}:${String(Math.floor((left % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col gap-[3vh] p-[4vh_4vw] text-white" style={{ background: "radial-gradient(120% 90% at 20% 0%, #17305E 0%, var(--av-ink) 55%, #060F1F 100%)" }}>
      <div className="flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mark-white.png" alt="" className="h-10 w-auto" />
        <div className="min-w-0">
          <div className="text-[clamp(14px,1.2vw,20px)] font-semibold uppercase tracking-wider text-[#9FB0CF]">{title}</div>
          <div key={cat?.id} className="av-fade-up font-heading text-[clamp(28px,3vw,52px)] font-extrabold">{cat?.name}</div>
        </div>
        <span className="ml-auto flex items-center gap-2.5 rounded-full bg-[#D92D20] px-5 py-3 text-[clamp(14px,1.2vw,20px)] font-extrabold">
          <span className="h-3 w-3 rounded-full bg-white" style={{ animation: "av-pulse 1.3s ease-out infinite" }} />VOTE EN DIRECT
        </span>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-[4vw]">
        <ol className="relative m-0 min-w-[300px] flex-1 list-none p-0" style={{ height: list.length * 96 }}>
          {list.map((c, i) => {
            const pct = Math.round((c.v / total) * 100);
            return (
              <li key={c.id} className="absolute inset-x-0 flex items-center gap-5 transition-transform duration-700" style={{ transform: `translateY(${i * 96}px)` }}>
                <span style={{ boxShadow: i === 0 ? "0 0 40px 6px color-mix(in srgb, var(--av-accent) 45%, transparent)" : undefined, borderRadius: 18 }}>
                  <Avatar name={c.display_name} src={c.photo_url} size={72} radius={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex justify-between gap-3 text-[clamp(18px,1.6vw,28px)]">
                    <span className="truncate font-bold">{c.display_name} <span className="text-[0.75em] font-medium text-[#9FB0CF]">· {c.code}</span></span>
                    <span className="font-heading font-extrabold tabular-nums">{pct} %</span>
                  </div>
                  <div className="h-[22px] overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct}%`, background: i === 0 ? "var(--av-accent)" : "#3B8BFF" }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex w-[min(400px,100%)] flex-none flex-col items-center gap-4 rounded-[28px] bg-white p-8 text-center text-ink" style={{ animation: "av-float 6s ease-in-out infinite" }}>
          <div className="font-heading text-3xl font-extrabold">Votez maintenant</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code vers la page de vote" className="h-64 w-64" />
          <div className="break-all text-lg font-bold">{url.replace(/^https?:\/\//, "")}</div>
          <div className="text-base text-[#4A5468]">Scannez, choisissez, payez avec Wave ou Mobile Money</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-4 text-[clamp(16px,1.4vw,22px)] text-[#C9D3E6]">
        <span><strong className="font-heading text-white tabular-nums">{num(all)}</strong> votes au total</span>
        {clock && <span>Clôture du vote dans <strong className="font-heading text-[1.4em] tabular-nums text-accent">{clock}</strong></span>}
      </div>
    </div>
  );
}
