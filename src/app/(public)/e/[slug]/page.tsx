import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getEventBundle, isVotingOpen } from "@/lib/queries";
import { Countdown } from "@/components/ui/Countdown";
import { EventBoard } from "@/components/vote/EventBoard";
import { FaceStack } from "@/components/ui/FaceStack";
import { EVENT_TYPE_LABELS, dateFr, fcfa, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = await getEventBundle((await params).slug);
  return b ? { title: b.event.title, description: b.event.description ?? undefined } : {};
}

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ code?: string }> }) {
  const { slug } = await params;
  const { code } = await searchParams;
  if (code) redirect(`/e/${slug}/c/${encodeURIComponent(code.trim().toUpperCase())}`);
  const b = await getEventBundle(slug);
  if (!b) notFound();
  const { event: e, categories, candidates, stats } = b;
  if (e.modes.includes("election")) redirect(`/election/${slug}`);
  const open = isVotingOpen(e);
  const voteModes = e.modes.includes("paid") || e.modes.includes("free");
  const totalVotes = Object.values(stats).reduce((a, s) => a + Number(s.total_votes), 0);
  const ranked = !e.show_live_results ? candidates : [...candidates].sort((a, b) => Number(stats[b.id]?.total_votes ?? 0) - Number(stats[a.id]?.total_votes ?? 0));

  return (
    <>
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(160deg, var(--av-primary) 0%, var(--av-ink) 70%)" }}>
        {e.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_url} alt="" aria-hidden="true" className="av-kenburns absolute inset-0 h-full w-full object-cover" />
        )}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(11,27,51,.94) 0%, rgba(11,27,51,.78) 45%, rgba(11,27,51,.35) 100%)" }} />
        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-end gap-8 px-5 py-10 md:py-16">
          <div className="av-fade-up flex min-w-0 flex-[1_1_420px] flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 self-start rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-bold">
                <span className={`h-2 w-2 rounded-full ${open ? "av-pulse-dot bg-[#FF5A4F]" : "bg-[#9FB0CF]"}`} />
                {open ? "VOTES OUVERTS" : e.status === "closed" ? "VOTE CLÔTURÉ" : "BIENTÔT"}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-bold">{EVENT_TYPE_LABELS[e.event_type].toUpperCase()}</span>
            </div>
            <h1 className="m-0 text-[clamp(27px,4.5vw,44px)] font-extrabold leading-tight">{e.title}</h1>
            <p className="m-0 text-sm text-[#D3DDF0]">{[e.location, e.starts_at ? `Finale le ${dateFr(e.starts_at)}` : null, `${categories.length} catégorie${categories.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</p>
            {e.description && <p className="m-0 max-w-2xl leading-relaxed text-[#DCE3F0]">{e.description}</p>}
            {candidates.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <FaceStack faces={ranked.slice(0, 6).map((c) => ({ name: c.display_name, src: c.photo_url }))} total={candidates.length} size={40} ring="rgba(255,255,255,.9)" />
                {e.show_live_results && totalVotes > 0 && <span className="text-sm font-semibold text-[#DCE3F0]"><strong className="text-white">{num(totalVotes)}</strong> votes déjà exprimés</span>}
              </div>
            )}
          </div>
          <div className="av-fade-up flex min-w-0 flex-[1_1_320px] flex-col gap-3" style={{ "--av-delay": ".15s" } as React.CSSProperties}>
            {open && e.vote_closes_at && <Countdown to={e.vote_closes_at} variant="blocks" />}
            <div className="flex gap-2.5 text-[13px]">
              {e.modes.includes("paid") && <span className="flex-1 rounded-[10px] bg-white/12 p-2.5 text-center" style={{ background: "rgba(255,255,255,.12)" }}><strong className="block text-[15px]">{fcfa(e.price_per_vote_xof)}</strong>le vote</span>}
              {e.modes.includes("free") && <span className="flex-1 rounded-[10px] p-2.5 text-center" style={{ background: "rgba(255,255,255,.12)" }}><strong className="block text-[15px]">{e.free_votes_per_day} gratuit</strong>par jour</span>}
              {e.modes.includes("jury") && <span className="flex-1 rounded-[10px] p-2.5 text-center" style={{ background: "rgba(255,255,255,.12)" }}><strong className="block text-[15px]">Jury {e.jury_weight} %</strong>Public {100 - e.jury_weight} %</span>}
            </div>
            {voteModes && open && (
              <form className="flex gap-2" action={`/e/${slug}`}>
                <label htmlFor="code" className="sr-only">Code candidat</label>
                <input id="code" name="code" placeholder="Code candidat (ex. MUS-014)" className="av-input h-12 border-0" />
                <button className="av-btn h-12 rounded-xl bg-accent px-5 font-bold text-ink">OK</button>
              </form>
            )}
            {e.modes.includes("live") && e.short_code && (
              <Link href={`/direct/${e.short_code}`} className="text-sm font-semibold text-[#BFD4F7] underline">Ouvrir l&apos;écran géant</Link>
            )}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1240px] px-5 py-8">
        <EventBoard
          slug={slug}
          eventId={e.id}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          candidates={candidates.map((c) => ({ id: c.id, display_name: c.display_name, code: c.code, photo_url: c.photo_url, category_id: c.category_id, bio: c.bio }))}
          initial={Object.values(stats).map((s) => ({ candidate_id: s.candidate_id, category_id: s.category_id, total_votes: s.total_votes }))}
          canVote={open && voteModes}
          showResults={e.show_live_results}
        />
      </div>
    </>
  );
}
