"use client";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { recuse, saveScores } from "@/app/jury/actions";

type Crit = { id: string; name: string; weight: number; max_score: number };
type Cand = { id: string; display_name: string; code: string; photo_url: string | null; bio: string | null; video_url: string | null };

export function JuryScoring({ eventId, criteria, candidates, initial, recused }: {
  eventId: string; criteria: Crit[]; candidates: Cand[]; initial: Record<string, { scores: Record<string, number>; comment: string }>; recused: string[];
}) {
  const [cur, setCur] = useState(candidates.find((c) => !initial[c.id] && !recused.includes(c.id))?.id ?? candidates[0]?.id);
  const [data, setData] = useState(initial);
  const [rec, setRec] = useState(recused);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = candidates.find((x) => x.id === cur);
  const entry = useMemo(() => data[cur ?? ""] ?? { scores: {} as Record<string, number>, comment: "" }, [data, cur]);
  const totalW = criteria.reduce((a, k) => a + Number(k.weight), 0) || 1;
  const total = useMemo(() => criteria.reduce((a, k) => a + ((entry.scores[k.id] ?? 0) / k.max_score) * Number(k.weight), 0) / totalW * 20, [entry, criteria, totalW]);
  const done = candidates.filter((x) => data[x.id] && Object.keys(data[x.id].scores).length === criteria.length).length;

  const set = (kid: string, v: number) => setData((d) => ({ ...d, [cur!]: { ...entry, scores: { ...entry.scores, [kid]: v } } }));
  const next = () => {
    const i = candidates.findIndex((x) => x.id === cur);
    const n = candidates.slice(i + 1).find((x) => !rec.includes(x.id)) ?? candidates.find((x) => !data[x.id] && !rec.includes(x.id));
    if (n) setCur(n.id);
  };

  if (!criteria.length) return <p className="av-card p-6 text-center text-muted">L&apos;organisateur n&apos;a pas encore défini la grille de notation.</p>;

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <aside className="av-card flex-none p-3 lg:w-[290px]">
        <div className="px-2 pb-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F6]"><div className="h-2 rounded-full bg-success transition-[width] duration-500" style={{ width: `${(done / Math.max(1, candidates.length)) * 100}%` }} /></div>
          <div className="mt-1.5 text-[13px] text-muted">{done} / {candidates.length} candidats notés</div>
        </div>
        <ul className="av-scroll-x m-0 flex list-none gap-1 p-0 lg:flex-col">
          {candidates.map((x) => {
            const st = rec.includes(x.id) ? "récusé" : data[x.id] && Object.keys(data[x.id].scores).length === criteria.length ? "noté" : cur === x.id ? "en cours" : "à noter";
            return (
              <li key={x.id} className="flex-none">
                <button onClick={() => setCur(x.id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${cur === x.id ? "bg-[#E8F0FD]" : "hover:bg-bg"}`}>
                  <Avatar name={x.display_name} src={x.photo_url} size={36} radius={10} />
                  <span className="flex-1 text-sm font-semibold">{x.display_name}</span>
                  <span className={`text-xs font-bold ${st === "noté" ? "text-success" : st === "en cours" ? "text-[#1650B8]" : "text-muted"}`}>{st}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {c && (
        <div key={c.id} className="av-fade-up flex min-w-0 flex-1 flex-col gap-4 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={c.display_name} src={c.photo_url} size={72} radius={18} />
              <div className="min-w-0 flex-1"><h2 className="m-0 text-2xl font-bold">{c.display_name}</h2><div className="text-sm text-muted">{c.code}</div></div>
              {c.video_url && <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary">Voir la vidéo ↗</a>}
            </div>
            {c.bio && <p className="m-0 text-sm leading-relaxed text-[#4A5468]">{c.bio}</p>}
            {rec.includes(c.id) ? (
              <p className="av-card p-5 text-muted">Vous vous êtes récusé pour ce candidat.</p>
            ) : (
              <div className="av-card flex flex-col gap-5 p-5">
                {criteria.map((k) => (
                  <div key={k.id}>
                    <div className="mb-2 flex justify-between gap-2"><span className="text-[15px] font-bold">{k.name} <span className="font-medium text-muted">· {Math.round((Number(k.weight) / totalW) * 100)} %</span></span><span className="font-heading font-extrabold">{entry.scores[k.id] ?? "–"} / {k.max_score}</span></div>
                    {k.max_score <= 20 ? (
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${k.max_score + 1}, minmax(0, 1fr))` }}>
                        {Array.from({ length: k.max_score + 1 }, (_, n) => (
                          <button key={n} type="button" aria-label={`${k.name} : ${n}`} aria-pressed={entry.scores[k.id] === n} onClick={() => set(k.id, n)} className={`h-10 rounded-lg text-sm font-bold transition-all ${entry.scores[k.id] === n ? "scale-105 bg-[#7A4FD6] text-white" : "border border-[#CBD3E1] bg-white"}`}>{n}</button>
                        ))}
                      </div>
                    ) : (
                      <input type="range" min={0} max={k.max_score} value={entry.scores[k.id] ?? 0} onChange={(e) => set(k.id, Number(e.target.value))} className="w-full accent-[#7A4FD6]" aria-label={k.name} />
                    )}
                  </div>
                ))}
                <label className="text-[15px] font-bold">Commentaire (facultatif)
                  <textarea rows={3} value={entry.comment} onChange={(e) => setData((d) => ({ ...d, [cur!]: { ...entry, comment: e.target.value } }))} className="av-input mt-2 font-normal" />
                </label>
              </div>
            )}
          </div>
          <div className="flex flex-none flex-col gap-3 xl:w-[250px]">
            <div className="rounded-[var(--av-radius)] bg-ink p-5 text-center text-white">
              <div className="text-[13px] text-[#C9D3E6]">Note pondérée</div>
              <div className="my-1 font-heading text-[46px] font-extrabold">{total.toFixed(1).replace(".", ",")}</div>
              <div className="text-[13px] text-[#C9D3E6]">sur 20</div>
            </div>
            <p className="m-0 rounded-xl border border-line bg-white p-3 text-[13px] leading-normal text-[#4A5468]">Vos notes restent invisibles pour les autres jurés et pour le public. L&apos;organisateur voit le détail en cas de litige.</p>
            {!rec.includes(c.id) && (
              <>
                <button disabled={pending || Object.keys(entry.scores).length < criteria.length} onClick={() => start(async () => { const r = await saveScores(eventId, c.id, entry.scores, entry.comment); setMsg(r.error ?? "Notes enregistrées"); if (!r.error) next(); })} className="av-btn h-[52px] rounded-[14px] bg-primary font-bold text-white">{pending ? "Enregistrement…" : "Enregistrer et suivant"}</button>
                <button disabled={pending} onClick={() => confirm("Vous récuser pour ce candidat (conflit d'intérêts) ?") && start(async () => { const r = await recuse(eventId, c.id); if (!r.error) { setRec((x) => [...x, c.id]); next(); } setMsg(r.error ?? "Récusation enregistrée"); })} className="h-12 rounded-[14px] border border-[#CBD3E1] bg-white text-sm font-semibold">Je me récuse (conflit d&apos;intérêts)</button>
              </>
            )}
            {msg && <p role="status" className="av-fade-up m-0 text-center text-sm font-semibold text-success">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
