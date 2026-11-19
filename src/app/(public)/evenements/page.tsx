import { getPublicEvents } from "@/lib/queries";
import { EventCard } from "@/components/site/EventCard";

export const metadata = { title: "Événements" };
export const revalidate = 30;

const FILTERS = [
  ["", "Tous"],
  ["awards", "Awards"],
  ["beauty", "Concours de beauté"],
  ["talent", "Talents"],
  ["election", "Élections"],
] as const;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = (await searchParams).type ?? "";
  const all = await getPublicEvents(60);
  const events = type ? all.filter((e) => e.event_type === type) : all;
  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <h1 className="av-fade-up m-0 mb-2 text-[clamp(28px,4vw,40px)] font-extrabold">Événements</h1>
      <p className="m-0 mb-6 text-muted">Concours, awards et élections ouverts au vote.</p>
      <nav aria-label="Filtrer" className="av-scroll-x -mx-5 mb-8 px-5">
        <div className="flex w-max gap-2">
          {FILTERS.map(([k, l]) => (
            <a key={k} href={k ? `?type=${k}` : "?"} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${type === k ? "bg-ink text-white" : "border border-[#CBD3E1] bg-white"}`}>{l}</a>
          ))}
        </div>
      </nav>
      {events.length ? (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
          {events.map((e, i) => <EventCard key={e.id} e={e} delay={Math.min(i, 8) * 0.06} />)}
        </div>
      ) : (
        <p className="av-card p-8 text-center text-muted">Aucun événement dans cette catégorie pour le moment.</p>
      )}
    </div>
  );
}
