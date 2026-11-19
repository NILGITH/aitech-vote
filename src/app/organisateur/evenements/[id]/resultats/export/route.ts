import { createClient } from "@/lib/supabase/server";

/** Export CSV (séparateur « ; », compatible Excel français) des résultats. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: e } = await db.from("events").select("title, modes").eq("id", id).maybeSingle();
  if (!e) return new Response("Introuvable", { status: 404 });
  const election = e.modes.includes("election");
  const [{ data: cats }, { data: cands }, { data: rows, error }] = await Promise.all([
    db.from("categories").select("id, name").eq("event_id", id),
    db.from("candidates").select("id, display_name, code").eq("event_id", id),
    election ? db.rpc("election_results", { p_event_id: id }) : db.rpc("event_ranking", { p_event_id: id }),
  ]);
  if (error) return new Response("Accès refusé", { status: 403 });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = election ? ["Poste", "Candidat", "Code", "Voix", "Votes blancs"] : ["Catégorie", "Candidat", "Code", "Votes", "Note jury", "Score final", "Recettes FCFA"];
  const lines = (rows ?? []).map((r: Record<string, string | number>) => {
    const c = cands?.find((x) => x.id === r.candidate_id);
    const cat = cats?.find((x) => x.id === r.category_id)?.name;
    return (election ? [cat, c?.display_name, c?.code, r.votes, r.blank] : [cat, c?.display_name, c?.code, r.public_votes, r.jury_score, r.final_score, r.revenue_xof]).map(esc).join(";");
  });
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="resultats-${id.slice(0, 8)}.csv"` } });
}
