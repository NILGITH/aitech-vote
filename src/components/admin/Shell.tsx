"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean };

/** Coque des espaces privés : menu latéral qui devient une barre défilante sur mobile. */
export function Shell({ nav, badge, user, children, signOut, dark = false }: { nav: NavItem[]; badge: string; user: string; children: React.ReactNode; signOut: () => Promise<void>; dark?: boolean }) {
  const path = usePathname();
  const isActive = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  return (
    <div className="flex min-h-screen flex-col bg-[#F3F5FA] lg:flex-row">
      <aside className={`flex flex-none flex-col gap-1 p-3 text-[#CBD2DE] lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:p-[22px_14px] ${dark ? "bg-[#111827]" : "bg-ink"}`}>
        <div className="flex items-center gap-2.5 px-2 lg:pb-1.5">
          <Image src="/mark-white.png" alt="" width={34} height={22} />
          <Link href="/" className="font-heading text-[17px] font-bold text-white">Aitech Vote</Link>
          <span className="ml-auto text-[11px] font-bold tracking-wider text-accent lg:hidden">{badge}</span>
        </div>
        <div className="hidden px-2 pb-4 text-xs font-bold tracking-wider text-accent lg:block">{badge}</div>
        <nav aria-label="Menu" className="av-scroll-x -mx-3 flex gap-1 px-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {nav.map((i) => (
            <Link key={i.href} href={i.href} aria-current={isActive(i) ? "page" : undefined} className={`flex-none whitespace-nowrap rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(i) ? "bg-primary text-white" : "hover:bg-white/10"}`}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-2 border-t border-white/10 px-2 pt-4 text-[13px] lg:flex">
          <span className="truncate">{user}</span>
          <form action={signOut}><button className="font-semibold text-white hover:underline">Se déconnecter</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-[clamp(16px,3vw,28px)]">{children}</main>
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[clamp(22px,3vw,28px)] font-bold">{title}</h1>
        {sub && <p className="m-0 mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, sub, tone, delay = 0 }: { label: string; value: string; sub?: string; tone?: "good" | "bad"; delay?: number }) {
  return (
    <div className="av-fade-up av-card p-[18px]" style={{ "--av-delay": `${delay}s` } as React.CSSProperties}>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="mt-1.5 font-heading text-[26px] font-extrabold">{value}</div>
      {sub && <div className={`mt-1 text-[13px] font-semibold ${tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-muted"}`}>{sub}</div>}
    </div>
  );
}
