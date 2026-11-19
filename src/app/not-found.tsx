import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="av-pop font-heading text-7xl font-extrabold text-primary">404</div>
      <h1 className="m-0 text-2xl font-bold">Page introuvable</h1>
      <p className="m-0 text-muted">Ce lien n&apos;existe pas ou l&apos;événement n&apos;est plus en ligne.</p>
      <Link href="/" className="av-btn rounded-xl bg-primary px-5 py-3 font-bold text-white">Retour à l&apos;accueil</Link>
    </div>
  );
}
