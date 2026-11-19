import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Confetti } from "@/components/ui/Confetti";
import { dateFr } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre reçu", robots: { index: false } };

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const { code } = await params;
  const isNew = (await searchParams).nouveau === "1";
  const db = await createClient();
  const { data } = await db.rpc("verify_receipt", { p_code: code });
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) notFound();

  return (
    <div className="relative">
      {isNew && <Confetti />}
      <section className="bg-success px-5 pb-16 pt-10 text-center text-white">
        <span className="av-pop mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#12805C" strokeWidth="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5" style={{ strokeDasharray: 30, animation: "av-draw .5s .5s ease-out both" }} /></svg>
        </span>
        <h1 className="mt-3 text-[26px] font-extrabold">{r.kind === "ballot" ? "Votre bulletin est enregistré" : `${r.votes} vote${r.votes > 1 ? "s" : ""} compté${r.votes > 1 ? "s" : ""} !`}</h1>
        <p className="m-0 text-[15px] text-[#D5F0E6]">{r.event_title}</p>
      </section>
      <div className="av-fade-up mx-auto -mt-10 max-w-md px-5" style={{ "--av-delay": ".3s" } as React.CSSProperties}>
        <div className="av-card flex flex-col gap-3 p-5 shadow-[0_12px_30px_rgba(11,27,51,.08)]">
          <h2 className="m-0 text-[15px] font-bold">Votre reçu</h2>
          <div className="flex justify-between text-sm"><span className="text-muted">Événement</span><span className="text-right font-semibold">{r.event_title}</span></div>
          {r.kind === "vote" && <div className="flex justify-between text-sm"><span className="text-muted">Votes</span><span className="font-semibold">{r.votes}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-muted">Date</span><span className="font-semibold">{dateFr(r.recorded_on)}</span></div>
          <div className="rounded-xl border border-dashed border-[#9AA4B5] bg-bg p-3 text-center">
            <div className="text-xs text-muted">Code de vérification</div>
            <div className="mt-0.5 font-heading text-[22px] font-extrabold tracking-wider">{code.toUpperCase()}</div>
            <div className="mt-1 text-xs text-muted">Conservez-le : il permet de vérifier que votre vote est bien compté.</div>
          </div>
          {r.kind === "ballot" && <p className="m-0 text-xs text-muted">Votre choix est secret : ce reçu ne contient pas pour qui vous avez voté.</p>}
        </div>
        <div className="flex flex-col gap-2.5 py-6">
          {r.kind === "vote" && (
            <>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Je viens de voter sur Aitech Vote ! Votez vous aussi : ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/e/${r.event_slug}`)}`} target="_blank" rel="noopener noreferrer" className="av-btn flex h-[54px] items-center justify-center rounded-[14px] bg-[#1FA855] font-bold text-white">Partager sur WhatsApp</a>
              <Link href={`/e/${r.event_slug}`} className="av-btn flex h-[54px] items-center justify-center rounded-[14px] border border-[#CBD3E1] bg-white font-bold">Voir le classement</Link>
            </>
          )}
          <Link href="/verifier" className="p-2.5 text-center text-sm font-semibold text-primary">Vérifier un autre code</Link>
        </div>
      </div>
    </div>
  );
}
