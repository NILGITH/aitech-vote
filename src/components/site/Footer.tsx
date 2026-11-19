import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-ink text-[#C9D3E6]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6 px-5 py-10 text-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <Image src="/mark-white.png" alt="" width={36} height={24} />
          <span className="font-heading text-[17px] font-bold text-white">Aitech Vote</span>
          <span>· une solution AITECH Côte d&apos;Ivoire</span>
        </div>
        <nav aria-label="Liens de pied de page" className="flex flex-wrap gap-5">
          <Link href="/conditions" className="hover:text-white">Conditions</Link>
          <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
          <Link href="/verifier" className="hover:text-white">Vérifier un vote</Link>
          <a href="mailto:contact@aitech-ci.com" className="hover:text-white">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
