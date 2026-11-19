import { createClient } from "@/lib/supabase/server";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Vérifier mon vote" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = (await searchParams).code?.trim().toUpperCase();
  let r: { kind: string; event_title: string; votes: number | null; recorded_on: string; fingerprint: string; electors_total: number | null; electors_voted: number | null } | null = null;
  if (code) {
    const db = await createClient();
    const { data } = await db.rpc("verify_receipt", { p_code: code });
    r = (Array.isArray(data) ? data[0] : data) ?? null;
  }
  const pct = r?.electors_total ? Math.round(((r.electors_voted ?? 0) / r.electors_total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 py-10">
      <h1 className="m-0 text-[28px] font-extrabold">Vérifier mon vote</h1>
      <p className="m-0 leading-relaxed text-[#4A5468]">Saisissez le code reçu après votre vote pour confirmer qu&apos;il a bien été compté, sans révéler votre choix.</p>
      <form className="flex flex-col gap-3">
        <label htmlFor="code" className="av-label">Code de vérification</label>
        <input id="code" name="code" defaultValue={code} placeholder="AV7-K4Q-92M" required className="av-input h-[54px] font-heading text-xl font-bold tracking-wider" />
        <button className="av-btn h-[54px] rounded-[14px] bg-primary font-bold text-white">Vérifier</button>
      </form>
      {code && !r && <p role="alert" className="av-fade-up m-0 rounded-xl bg-[#FFF6F5] p-4 text-danger">Aucun vote ne correspond à ce code. Vérifiez la saisie.</p>}
      {r && (
        <div className="av-fade-up av-card flex flex-col gap-2.5 border-[#A7DCC6] p-5">
          <div className="flex items-center gap-2.5">
            <span className="av-pop flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F5EF]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E6B52" strokeWidth="2.4" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
            <strong className="text-base text-[#0E5A45]">Vote trouvé et compté</strong>
          </div>
          <div className="flex justify-between text-sm"><span className="text-muted">Événement</span><span className="text-right font-semibold">{r.event_title}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted">Enregistré le</span><span className="font-semibold">{dateFr(r.recorded_on)}</span></div>
          {r.votes && <div className="flex justify-between text-sm"><span className="text-muted">Votes</span><span className="font-semibold">{r.votes}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-muted">Empreinte</span><span className="font-mono font-semibold">{r.fingerprint.slice(0, 4)}…{r.fingerprint.slice(-4)}</span></div>
          {r.kind === "ballot" && r.electors_total ? (
            <div className="mt-2 text-sm text-[#4A5468]">
              <strong className="text-ink">Participation :</strong> {r.electors_voted} électeurs sur {r.electors_total} ont voté ({pct} %).
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF1F6]"><div className="av-grow h-2 rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
