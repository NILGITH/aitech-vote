import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { Countdown } from "@/components/ui/Countdown";
import { FaceStack } from "@/components/ui/FaceStack";
import { EVENT_TYPE_LABELS, num } from "@/lib/format";
import type { EventRow } from "@/lib/types";

const GRADIENTS: Record<string, string> = {
  awards: "linear-gradient(135deg,var(--av-primary),#0B1B33,var(--av-primary))",
  beauty: "linear-gradient(135deg,#F2A516,#C2410C,#F2A516)",
  talent: "linear-gradient(135deg,#7A4FD6,#0B1B33,#7A4FD6)",
  election: "linear-gradient(135deg,#0E7C66,#0B1B33,#0E7C66)",
  other: "linear-gradient(135deg,#475569,#0B1B33,#475569)",
};

type CardEvent = EventRow & { candidates_count?: number; total_votes?: number; faces?: { name: string; src: string | null }[] };

export function EventCard({ e, delay = 0 }: { e: CardEvent; delay?: number }) {
  const closed = e.status === "closed" || (e.vote_closes_at && new Date(e.vote_closes_at) < new Date());
  const isElection = e.modes.includes("election");
  return (
    <Link
      href={isElection ? `/election/${e.slug}` : `/e/${e.slug}`}
      className="group av-lift av-sheen av-tilt-in flex flex-col overflow-hidden rounded-[18px] border border-line bg-white no-underline"
      style={{ "--av-delay": `${delay}s` } as React.CSSProperties}
    >
      <div
        className="relative flex h-48 flex-col justify-between overflow-hidden p-4"
        style={{ background: e.cover_url ? "#0B1B33" : GRADIENTS[e.event_type], backgroundSize: "200% 200%", animation: e.cover_url ? undefined : "av-shine 8s linear infinite" }}
      >
        {e.cover_url && <img src={e.cover_url} alt="" className="av-zoom-img absolute inset-0 h-full w-full object-cover" loading="lazy" />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(11,27,51,.85)] via-[rgba(11,27,51,.15)] to-transparent" />
        <div className="relative flex items-start justify-between gap-2">
          <span className="rounded-lg bg-[rgba(11,27,51,.75)] px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur">{EVENT_TYPE_LABELS[e.event_type].toUpperCase()}</span>
          {e.vote_closes_at && !closed ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-ink">
              <span className="av-pulse-dot h-1.5 w-1.5 rounded-full bg-[#D92D20]" />
              <Countdown to={e.vote_closes_at} variant="compact" />
            </span>
          ) : closed ? (
            <span className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-bold text-ink">Résultats</span>
          ) : null}
        </div>
        <div className="relative flex items-end justify-between gap-2">
          <FaceStack faces={e.faces ?? []} total={e.candidates_count} size={34} />
          {!!e.total_votes && <span className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold text-white backdrop-blur">{num(e.total_votes)} votes</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-[18px]">
        <h3 className="m-0 font-heading text-lg font-bold transition-colors group-hover:text-primary">{e.title}</h3>
        <p className="m-0 text-sm text-muted">
          {[e.location, e.candidates_count ? `${e.candidates_count} candidats` : null, e.jury_weight ? `Jury ${e.jury_weight} % / Public ${100 - e.jury_weight} %` : null].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex justify-between border-t border-[#EEF1F6] pt-2.5 text-sm">
          <span className="text-muted">{closed ? "Vote clôturé" : isElection ? "Bulletin secret" : "Votes ouverts"}</span>
          <span className="font-bold text-primary transition-transform group-hover:translate-x-1">{isElection ? "Accéder au bulletin" : closed ? "Résultats" : "Voter"} →</span>
        </div>
      </div>
    </Link>
  );
}
