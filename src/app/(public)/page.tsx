import Link from "next/link";
import { getPlans, getSettings } from "@/lib/settings";
import { getPublicEvents } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/site/EventCard";
import { Reveal } from "@/components/ui/Reveal";
import { Countdown } from "@/components/ui/Countdown";
import { LiveRanking } from "@/components/live/LiveRanking";
import { VoteTicker } from "@/components/live/VoteFeed";
import { fcfa } from "@/lib/format";
import type { Candidate, Category } from "@/lib/types";

export const revalidate = 30;

const MODES = [
  { key: "paid", n: "1", title: "Vote public payant", text: "Packs de votes payés par Mobile Money, Wave ou carte. Idéal pour les awards et concours.", ex: "Awards, Miss, talents", soft: "#E8F0FD", ink: "#1650B8" },
  { key: "free", n: "2", title: "Vote gratuit contrôlé", text: "1 vote par jour et par numéro vérifié par code. Limites anti-robots.", ex: "Prix du public, sondages", soft: "#E6F5EF", ink: "#0E6B52" },
  { key: "jury", n: "3", title: "Jury", text: "Chaque juré note les candidats sur une grille de critères pondérés, combinable avec le public.", ex: "Concours, startups, prix", soft: "#F1ECFC", ink: "#5B34B8" },
  { key: "election", n: "4", title: "Élection à bulletin secret", text: "Liste électorale, un électeur = un vote, résultats scellés jusqu'à la clôture.", ex: "Associations, ordres, écoles", soft: "#FDF3DC", ink: "#8A5A00" },
  { key: "live", n: "5", title: "Vote en direct", text: "QR code projeté pendant la soirée, résultats animés sur écran géant.", ex: "Galas, conférences, finales", soft: "#FDECEC", ink: "#B42318" },
];

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5FD3A4" strokeWidth="2.2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

export default async function Home() {
  const [settings, plans, events] = await Promise.all([getSettings(), getPlans(), getPublicEvents(12)]);
  const sections = settings.home_sections.filter((s) => s.visible);
  const modes = MODES.filter((m) => settings.modules[m.key] !== false);

  // Événement mis en avant : le premier événement ouvert au vote public
  const featured = events.find((e) => e.status === "published" && (e.modes.includes("paid") || e.modes.includes("free")));
  let feat: { cat: Category; cands: Candidate[]; stats: { candidate_id: string; category_id: string; total_votes: number }[] } | null = null;
  if (featured) {
    const db = await createClient();
    const [{ data: cats }, { data: cands }, { data: stats }] = await Promise.all([
      db.from("categories").select("*").eq("event_id", featured.id).order("position").limit(1),
      db.from("candidates").select("*").eq("event_id", featured.id).eq("is_published", true),
      db.from("candidate_stats").select("candidate_id, category_id, total_votes").eq("event_id", featured.id),
    ]);
    if (cats?.[0]) feat = { cat: cats[0] as Category, cands: (cands ?? []) as Candidate[], stats: (stats ?? []).map((s) => ({ ...s, total_votes: Number(s.total_votes) })) };
  }

  const blocks: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden="true" className="av-float absolute -right-32 -top-44 h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--av-primary) 45%, transparent), transparent 70%)" }} />
        <div aria-hidden="true" className="av-float absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--av-accent) 22%, transparent), transparent 70%)", animationDuration: "11s" }} />
        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-12 px-5 py-[clamp(40px,7vw,72px)]">
          <div className="av-fade-up flex min-w-0 flex-[1_1_480px] flex-col gap-5">
            <span className="self-start rounded-full bg-[#1E2E4F] px-3.5 py-2 text-sm font-semibold text-[#BFD4F7]">Concours · Awards · Jury · Élections · Direct</span>
            <h1 className="m-0 text-[clamp(32px,5.4vw,54px)] font-extrabold leading-[1.08] tracking-tight">
              {settings.content.heroTitle} <span className="av-shine-text">{settings.content.heroHighlight}</span>
            </h1>
            <p className="m-0 max-w-[560px] text-[clamp(16px,2vw,19px)] leading-relaxed text-[#C9D3E6]">{settings.content.heroText}</p>
            <form action="/recherche" className="flex max-w-[560px] flex-wrap gap-2 rounded-2xl bg-white p-2">
              <label htmlFor="q" className="sr-only">Rechercher un candidat</label>
              <input id="q" name="q" placeholder="Nom du candidat ou code (ex. MUS-014)" className="min-w-0 flex-[1_1_200px] border-0 px-3.5 py-3 text-base text-ink outline-none" />
              <button className="av-btn flex-[1_0_auto] rounded-[10px] bg-accent px-6 py-3.5 text-base font-bold text-ink">Voter</button>
            </form>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#C9D3E6]">
              <span className="flex items-center gap-2"><Check />Paiement vérifié par Kkiapay</span>
              <span className="flex items-center gap-2"><Check />Reçu et code de vérification</span>
              <span className="flex items-center gap-2"><Check />Anti-fraude en temps réel</span>
            </div>
          </div>
          <div className="av-fade-up flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-[20px] bg-white p-[22px] text-ink shadow-[0_30px_60px_rgba(0,0,0,.35)]" style={{ "--av-delay": ".2s" } as React.CSSProperties}>
            {featured && feat ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold uppercase tracking-wide text-muted">{featured.title}</div>
                    <div className="font-heading text-xl font-bold">{feat.cat.name}</div>
                  </div>
                  <span className="flex flex-none items-center gap-1.5 rounded-full bg-[#FDECEC] px-2.5 py-1.5 text-xs font-bold text-danger">
                    <span className="av-pulse-dot h-2 w-2 rounded-full bg-[#D92D20]" />EN DIRECT
                  </span>
                </div>
                <LiveRanking eventId={featured.id} categoryId={feat.cat.id} candidates={feat.cands} initial={feat.stats} limit={4} showVotes={false} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted">
                  {featured.vote_closes_at ? <span>Clôture dans <strong className="text-ink"><Countdown to={featured.vote_closes_at} /></strong></span> : <span>Votes ouverts</span>}
                  <Link href={`/e/${featured.slug}`} className="av-btn rounded-[10px] bg-primary px-4 py-2.5 font-semibold text-white">Voter</Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 py-6 text-center">
                <div className="font-heading text-xl font-bold">Les premiers événements arrivent</div>
                <p className="m-0 text-muted">Organisateur ? Lancez votre concours, vos awards ou votre élection en quelques minutes.</p>
                <Link href="/inscription" className="av-btn mx-auto rounded-[10px] bg-primary px-5 py-3 font-semibold text-white">Créer un événement</Link>
              </div>
            )}
          </div>
        </div>
        {sections.some((s) => s.key === "feed") && featured && feat && (
          <VoteTicker eventId={featured.id} candidates={feat.cands} initial={feat.stats} fallback={[`Votes ouverts : ${featured.title}`, "Payez avec Wave, Orange Money, MTN, Moov ou carte", "Chaque vote reçoit un code de vérification"]} />
        )}
      </section>
    ),
    feed: null,
    events: (
      <section key="events" className="mx-auto max-w-[1240px] px-5 pb-6 pt-[clamp(48px,7vw,72px)]">
        <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="m-0 mb-2 text-[clamp(26px,3.4vw,34px)] font-bold">Événements en cours</h2>
            <p className="m-0 text-[17px] text-muted">Soutenez vos candidats avant la clôture.</p>
          </div>
          <Link href="/evenements" className="font-semibold text-primary">Tous les événements →</Link>
        </Reveal>
        {events.length ? (
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
            {events.slice(0, 6).map((e, i) => <EventCard key={e.id} e={e} delay={i * 0.08} />)}
          </div>
        ) : (
          <p className="av-card p-8 text-center text-muted">Aucun événement public pour le moment.</p>
        )}
      </section>
    ),
    modes: (
      <section key="modes" id="usages" className="mx-auto max-w-[1240px] px-5 py-[clamp(48px,7vw,72px)]">
        <Reveal>
          <h2 className="m-0 mb-2 text-[clamp(26px,3.4vw,34px)] font-bold">Un seul outil, {modes.length} façons de voter</h2>
          <p className="m-0 mb-8 max-w-[680px] text-[17px] text-muted">Choisissez le mode de vote à la création de l&apos;événement. Vous pouvez en combiner plusieurs, par exemple jury + public.</p>
        </Reveal>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
          {modes.map((m, i) => (
            <Reveal key={m.key} delay={i * 0.08} className="av-lift flex flex-col gap-3 rounded-[18px] border border-line bg-white p-[22px]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] font-heading text-lg font-extrabold" style={{ background: m.soft, color: m.ink }}>{m.n}</span>
              <h3 className="m-0 text-lg font-bold">{m.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-[#4A5468]">{m.text}</p>
              <p className="m-0 text-[13px] font-semibold text-muted">{m.ex}</p>
            </Reveal>
          ))}
        </div>
      </section>
    ),
    steps: (
      <section key="steps" className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap gap-10 px-5 py-[clamp(48px,7vw,72px)]">
          <div className="min-w-0 flex-[1_1_400px]">
            <Reveal><h2 className="m-0 mb-6 text-[clamp(26px,3.4vw,34px)] font-bold">Voter, c&apos;est 3 étapes</h2></Reveal>
            <ol className="m-0 flex list-none flex-col gap-5 p-0">
              {[
                ["Trouvez votre candidat", "Par son nom ou son code, ou via le lien qu'il a partagé sur WhatsApp."],
                ["Choisissez le nombre de votes", "1, 5, 10 ou 50 votes en un seul paiement. Votre numéro et un code de vérification suffisent."],
                ["Payez et recevez votre reçu", "Wave, Orange Money, MTN, Moov ou carte. Le vote compte dès que Kkiapay confirme le paiement."],
              ].map(([t, d], i) => (
                <Reveal as="li" key={t} delay={0.1 + i * 0.15} className="flex gap-4">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary font-bold text-white">{i + 1}</span>
                  <div><div className="mb-1 text-lg font-bold">{t}</div><div className="text-base leading-normal text-[#4A5468]">{d}</div></div>
                </Reveal>
              ))}
            </ol>
          </div>
          <div className="grid min-w-0 flex-[1_1_400px] gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
            {[
              ["Paiement vérifié", "Le serveur confirme chaque transaction auprès de Kkiapay. Aucun vote sans paiement réel."],
              ["Anti-fraude", "Limites par numéro, détection des pics et code de vérification sur le vote gratuit."],
              ["Candidats consentants", "Aucun profil n'est publié sans l'accord du candidat, donné par e-mail."],
              ["Jury + public", "L'organisateur fixe le poids de chacun, par exemple 75 % jury et 25 % public."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="av-lift rounded-2xl bg-bg p-5">
                <div className="mb-1.5 font-bold">{t}</div>
                <div className="text-[15px] leading-normal text-[#4A5468]">{d}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    ),
    pricing: plans.length ? (
      <section key="pricing" id="tarifs" className="mx-auto max-w-[1240px] px-5 py-[clamp(48px,7vw,72px)]">
        <Reveal>
          <h2 className="m-0 mb-2 text-[clamp(26px,3.4vw,34px)] font-bold">Organisateurs : lancez votre événement</h2>
          <p className="m-0 mb-8 text-[17px] text-muted">Une commission n&apos;est prélevée que sur les votes payants.</p>
        </Reveal>
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
          {plans.map((p, i) => {
            const dark = i === 1;
            return (
              <Reveal key={p.id} delay={i * 0.1} className={`av-lift flex flex-col gap-3.5 rounded-[20px] p-7 ${dark ? "bg-ink text-white" : "border border-line bg-white"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="m-0 text-xl font-bold">{p.name}</h3>
                  {dark && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-ink">RECOMMANDÉ</span>}
                </div>
                <div className="font-heading text-3xl font-extrabold">
                  {fcfa(p.price_xof)}
                  {p.price_xof > 0 && <span className={`text-base font-medium ${dark ? "text-[#C9D3E6]" : "text-muted"}`}> / mois</span>}
                </div>
                <div className={`text-[15px] ${dark ? "text-[#C9D3E6]" : "text-muted"}`}>+ commission de {Number(p.commission_pct).toLocaleString("fr-FR")} % sur les votes payants</div>
                <ul className={`m-0 pl-5 text-[15px] leading-8 ${dark ? "text-[#DCE3F0]" : "text-[#4A5468]"}`}>
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={`/inscription?plan=${p.slug}`} className={`av-btn mt-auto rounded-[10px] p-3.5 text-center font-bold ${dark ? "bg-accent text-ink" : "border border-[#CBD3E1]"}`}>Choisir {p.name}</Link>
              </Reveal>
            );
          })}
        </div>
      </section>
    ) : null,
  };

  return <>{sections.map((s) => blocks[s.key] ?? null)}</>;
}
