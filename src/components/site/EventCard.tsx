import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { Countdown } from "@/components/ui/Countdown";
import { EVENT_TYPE_LABELS, num } from "@/lib/format";
import type { EventRow } from "@/lib/types";

const GRADIENTS: Record<string, string> = {
  awards: "linear-gradient(135deg,var(--av-primary),#0B1B33,var(--av-primary))",
  beauty: "linear-gradient(135deg,#F2A516,#C2410C,#F2A516)",
  talent: "linear-gradient(135deg,#7A4FD6,#0B1B33,#7A4FD6)",
  election: "linear-gradient(135deg,#0E7C66,#0B1B33,#0E7C66)",
  other: "linear-gradient(135deg,#475569,#0B1B33,#475569)",
};

export function EventCard({ e, delay = 0 }: { e: EventRow & { candidates_count?: number; total_votes?: number }; delay?: number }) {
  const closed = e.status === "closed" || (e.vote_closes_at && new Date(e.vote_closes_at) < new Date());
  const isElection = e.modes.includes("election");
  return (
    <Link
      href={isElection ? `/election/${e.slug}` : `/e/${e.slug}`}
      className="av-lift av-fade-up flex flex-col overflow-hidden rounded-[18px] border border-line bg-white no-underline"
      style={{ "--av-delay": `${delay}s` } as React.CSSProperties}
    >
      <div
        className="relative flex h-40 items-end justify-between p-4"
        style={{ background: e.cover_url ? undefined : GRADIENTS[e.event_type], backgroundSize: "200% 200%", animation: e.cover_url ? undefined : "av-shine 8s linear infinite" }}
      >
        {e.cover_url && <img src={e.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
        <span className="relative rounded-lg bg-[rgba(11,27,51,.75)] px-2.5 py-1.5 text-xs font-bold text-white">{EVENT_TYPE_LABELS[e.event_type].toUpperCase()}</span>
        {e.vote_closes_at && !closed && (
          <span className="relative rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-ink">
            <Countdown to={e.vote_closes_at} variant="compact" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-[18px]">
        <h3 className="m-0 font-heading text-lg font-bold">{e.title}</h3>
        <p className="m-0 text-sm text-muted">
          {[e.location, e.candidates_count ? `${e.candidates_count} candidats` : null, e.jury_weight ? `Jury ${e.jury_weight} % / Public ${100 - e.jury_weight} %` : null].filter(Boolean).join(" · ")}
        </p>
        <div className="flex justify-between border-t border-[#EEF1F6] pt-2.5 text-sm">
          <span className="text-muted">{closed ? "Vote clôturé" : `${num(e.total_votes)} votes`}</span>
          <span className="font-bold text-primary">{isElection ? "Accéder au bulletin" : closed ? "Résultats" : "Voter"} →</span>
        </div>
      </div>
    </Link>
  );
}
