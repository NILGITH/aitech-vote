import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { fcfa, num } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  const [{ data: cats }, { data: cands }] = await Promise.all([
    db.from("categories").select("id, name").eq("event_id", id).order("position"),
    db.from("candidates").select("id, display_name, code, photo_url").eq("event_id", id),
  ]);
  const election = e!.modes.includes("election");
  const { data: rows } = election ? await db.rpc("election_results", { p_event_id: id }) : await db.rpc("event_ranking", { p_event_id: id });
  const name = (cid: string) => cands?.find((c) => c.id === cid);
  const showJury = e!.modes.includes("jury");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">{election ? "Résultats provisoires visibles par vous seul jusqu'à la clôture." : showJury ? `Score final = ${e!.jury_weight} % jury + ${100 - e!.jury_weight} % public (part des votes rapportée au premier de la catégorie).` : "Classement par nombre de votes."}</p>
        <Link href={`/organisateur/evenements/${id}/resultats/export`} className="av-btn rounded-[10px] border border-[#CBD3E1] bg-white px-4 py-2.5 text-sm font-semibold">Exporter (CSV / Excel)</Link>
      </div>
      {cats?.map((cat) => {
        const list = (rows ?? []).filter((r: { category_id: string }) => r.category_id === cat.id).sort((a: Record<string, number>, b: Record<string, number>) => election ? b.votes - a.votes : b.final_score - a.final_score || b.public_votes - a.public_votes);
        return (
          <section key={cat.id} className="av-card av-scroll-x p-4">
            <h2 className="m-0 mb-3 text-[17px] font-bold">{cat.name}</h2>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="p-2 font-semibold">#</th><th className="p-2 font-semibold">Candidat</th><th className="p-2 font-semibold">Votes</th>{!election && showJury && <><th className="p-2 font-semibold">Note jury /100</th><th className="p-2 font-semibold">Score final</th></>}{!election && <th className="p-2 font-semibold">Recettes</th>}</tr></thead>
              <tbody>
                {list.map((r: Record<string, number & string>, i: number) => {
                  const c = name(r.candidate_id);
                  return (
                    <tr key={r.candidate_id} className="border-t border-[#EEF1F6]">
                      <td className="p-2 font-bold">{i + 1}</td>
                      <td className="p-2"><div className="flex items-center gap-2"><Avatar name={c?.display_name ?? "?"} src={c?.photo_url} size={30} radius={8} /><span className="font-semibold">{c?.display_name}</span><span className="text-xs text-muted">{c?.code}</span></div></td>
                      <td className="p-2">{num(election ? r.votes : r.public_votes)}</td>
                      {!election && showJury && <><td className="p-2">{Number(r.jury_score).toLocaleString("fr-FR")}</td><td className="p-2 font-bold text-[#1650B8]">{Number(r.final_score).toLocaleString("fr-FR")}</td></>}
                      {!election && <td className="p-2">{fcfa(r.revenue_xof)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {election && list[0]?.blank ? <p className="m-0 mt-2 text-xs text-muted">Votes blancs : {num(list[0].blank)}</p> : null}
          </section>
        );
      })}
    </div>
  );
}
