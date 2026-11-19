import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";

export const metadata = { title: "Recherche" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const db = await createClient();
  let results: { code: string; display_name: string; photo_url: string | null; events: { slug: string; title: string } | null }[] = [];
  if (q.length >= 2) {
    const safe = q.replace(/[%_,()]/g, "");
    const { data } = await db
      .from("candidates")
      .select("code, display_name, photo_url, events!inner(slug, title, status)")
      .eq("is_published", true)
      .in("events.status", ["published", "closed"])
      .or(`code.ilike.${safe.toUpperCase()},display_name.ilike.%${safe}%`)
      .limit(20);
    results = (data ?? []) as unknown as typeof results;
    // Un code exact mène directement à la page de vote
    const exact = results.filter((r) => r.code === q.toUpperCase());
    if (exact.length === 1 && exact[0].events) redirect(`/e/${exact[0].events.slug}/c/${exact[0].code}`);
  }
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="m-0 mb-4 text-[28px] font-extrabold">Trouver un candidat</h1>
      <form className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">Nom ou code</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nom du candidat ou code" className="av-input" />
        <button className="av-btn rounded-xl bg-primary px-5 font-bold text-white">Chercher</button>
      </form>
      {q && !results.length && <p className="text-muted">Aucun candidat trouvé pour « {q} ».</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {results.map((r, i) => (
          <li key={`${r.events?.slug}-${r.code}`} className="av-fade-up" style={{ "--av-delay": `${i * 0.05}s` } as React.CSSProperties}>
            <Link href={`/e/${r.events?.slug}/c/${r.code}`} className="av-lift av-card flex items-center gap-3 p-3">
              <Avatar name={r.display_name} src={r.photo_url} size={52} />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{r.display_name}</div>
                <div className="truncate text-sm text-muted">{r.code} · {r.events?.title}</div>
              </div>
              <span className="font-bold text-primary">Voter →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
