import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth";

export async function Header() {
  const profile = await getCurrentProfile().catch(() => null);
  const space = profile?.role === "super_admin" ? "/admin" : profile?.role === "jury" ? "/jury" : "/organisateur";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
        <Link href="/" className="mr-auto flex items-center gap-2.5 no-underline">
          <Image src="/mark.png" alt="" width={40} height={26} priority />
          <span className="font-heading text-xl font-bold">
            Aitech <span className="text-primary">Vote</span>
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden gap-6 text-[15px] font-medium text-[#1E2B45] md:flex">
          <Link href="/evenements" className="hover:text-primary">Événements</Link>
          <Link href="/#usages" className="hover:text-primary">Organiser</Link>
          <Link href="/#tarifs" className="hover:text-primary">Tarifs</Link>
          <Link href="/verifier" className="hover:text-primary">Vérifier mon vote</Link>
        </nav>
        <div className="flex gap-2.5">
          {profile ? (
            <Link href={space} className="av-btn rounded-[10px] bg-primary px-4 py-3 text-[15px] font-semibold text-white">Mon espace</Link>
          ) : (
            <>
              <Link href="/connexion" className="av-btn hidden rounded-[10px] border border-[#CBD3E1] px-4 py-3 text-[15px] font-semibold sm:block">Se connecter</Link>
              <Link href="/inscription" className="av-btn rounded-[10px] bg-primary px-4 py-3 text-[15px] font-semibold text-white">Créer un événement</Link>
            </>
          )}
        </div>
        <details className="w-full md:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none text-sm font-semibold text-muted">Menu ▾</summary>
          <nav aria-label="Menu mobile" className="mt-3 grid gap-1 text-base font-medium">
            <Link href="/evenements" className="rounded-lg px-2 py-3 hover:bg-bg">Événements</Link>
            <Link href="/#usages" className="rounded-lg px-2 py-3 hover:bg-bg">Organiser</Link>
            <Link href="/#tarifs" className="rounded-lg px-2 py-3 hover:bg-bg">Tarifs</Link>
            <Link href="/verifier" className="rounded-lg px-2 py-3 hover:bg-bg">Vérifier mon vote</Link>
            {!profile && <Link href="/connexion" className="rounded-lg px-2 py-3 hover:bg-bg">Se connecter</Link>}
          </nav>
        </details>
      </div>
    </header>
  );
}
