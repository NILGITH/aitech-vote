"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function EventTabs({ id, tabs }: { id: string; tabs: { slug: string; label: string }[] }) {
  const path = usePathname();
  const base = `/organisateur/evenements/${id}`;
  return (
    <nav aria-label="Sections de l'événement" className="av-scroll-x -mx-1 mb-6 border-b border-line">
      <div className="flex w-max gap-1 px-1">
        {tabs.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const on = t.slug ? path.startsWith(href) : path === base;
          return (
            <Link key={t.slug} href={href} aria-current={on ? "page" : undefined} className={`-mb-px border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function RangeField({ name, defaultValue, leftLabel, rightLabel }: { name: string; defaultValue: number; leftLabel: string; rightLabel: string }) {
  return <RangeInner name={name} defaultValue={defaultValue} leftLabel={leftLabel} rightLabel={rightLabel} />;
}

function RangeInner({ name, defaultValue, leftLabel, rightLabel }: { name: string; defaultValue: number; leftLabel: string; rightLabel: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div>
      <div className="mb-2.5 flex justify-between text-[15px] font-bold"><span className="text-[#5B34B8]">{leftLabel} {v} %</span><span className="text-[#1650B8]">{rightLabel} {100 - v} %</span></div>
      <div className="flex h-3.5 overflow-hidden rounded-full"><div className="bg-[#7A4FD6] transition-[width] duration-300" style={{ width: `${v}%` }} /><div className="flex-1 bg-primary" /></div>
      <input type="range" name={name} min={0} max={100} step={5} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label={`Part ${leftLabel}`} className="mt-3 w-full accent-[#7A4FD6]" />
    </div>
  );
}
