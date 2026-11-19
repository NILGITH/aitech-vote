"use client";
import { useActionState, useState } from "react";
import type { ActionState } from "@/components/ui/Field";
import type { SiteSettings } from "@/lib/types";

const PRIMS = [["Bleu Aitech", "#1F6FE5"], ["Bleu nuit", "#1650B8"], ["Émeraude", "#0E7C66"], ["Violet", "#6D3FD0"], ["Bordeaux", "#B4235F"]];
const ACCS = [["Or", "#F2A516"], ["Orange", "#FF8A3D"], ["Vert clair", "#5FD3A4"], ["Jaune", "#FFD027"], ["Rose", "#FF7AA8"]];
const FONTS = ["Sora", "Poppins", "Montserrat"];
const ANIMS = [["none", "Aucune"], ["soft", "Douce"], ["dynamic", "Dynamique"]];
const DEVICES = [["Ordinateur", "100%"], ["Tablette", "520px"], ["Mobile", "320px"]];

/** Éditeur d'apparence avec aperçu en direct (ordinateur / tablette / mobile). */
export function AppearanceEditor({ settings, action }: { settings: SiteSettings; action: (s: ActionState, f: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const t = settings.theme;
  const [primary, setPrimary] = useState(t.primary);
  const [accent, setAccent] = useState(t.accent);
  const [font, setFont] = useState(t.headingFont);
  const [radius, setRadius] = useState(t.radius);
  const [anim, setAnim] = useState(t.animation);
  const [title, setTitle] = useState(settings.content.heroTitle ?? "");
  const [hl, setHl] = useState(settings.content.heroHighlight ?? "");
  const [sections, setSections] = useState(settings.home_sections);
  const [dev, setDev] = useState(0);
  const show = (k: string) => sections.find((s) => s.key === k)?.visible;
  const move = (i: number, d: number) => setSections((s) => { const a = [...s]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const pill = (on: boolean) => `rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? "bg-ink text-white" : "border border-[#CBD3E1] bg-white"}`;
  const swatch = (c: string, on: boolean) => ({ background: c, outline: on ? "3px solid #0B1B33" : "1px solid #CBD3E1", outlineOffset: on ? 2 : 0, transform: on ? "scale(1.08)" : "none" });
  const fontStack = `'${font}', system-ui, sans-serif`;

  return (
    <form action={formAction} className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <input type="hidden" name="primary" value={primary} />
      <input type="hidden" name="accent" value={accent} />
      <input type="hidden" name="ink" value={t.ink} />
      <input type="hidden" name="headingFont" value={font} />
      <input type="hidden" name="radius" value={radius} />
      <input type="hidden" name="animation" value={anim} />
      <input type="hidden" name="sections_order" value={sections.map((s) => s.key).join(",")} />
      {sections.map((s) => s.visible && <input key={s.key} type="hidden" name={`sec_${s.key}`} value="on" />)}

      <div className="flex min-w-0 flex-col gap-4 xl:w-[420px] xl:flex-none">
        <section className="av-card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-base font-bold">Textes de l&apos;accueil</h2>
          <label className="text-sm font-semibold">Titre principal<input name="heroTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="av-input mt-1.5 h-11 font-normal" /></label>
          <label className="text-sm font-semibold">Phrase mise en valeur<input name="heroHighlight" value={hl} onChange={(e) => setHl(e.target.value)} className="av-input mt-1.5 h-11 font-normal" /></label>
          <label className="text-sm font-semibold">Texte d&apos;introduction<textarea name="heroText" rows={3} defaultValue={settings.content.heroText ?? ""} className="av-input mt-1.5 font-normal" /></label>
          <p className="m-0 text-xs text-muted">Logo et favicon : remplacez les fichiers logo dans le dépôt (prochaine version : envoi depuis cet écran).</p>
        </section>
        <section className="av-card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-base font-bold">Couleurs</h2>
          <div className="text-sm font-semibold">Couleur principale</div>
          <div className="flex flex-wrap items-center gap-2.5">
            {PRIMS.map(([n, c]) => <button key={c} type="button" aria-label={n} aria-pressed={primary === c} onClick={() => setPrimary(c)} className="h-10 w-10 rounded-xl transition-transform" style={swatch(c, primary === c)} />)}
            <input type="color" aria-label="Couleur principale personnalisée" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-[#CBD3E1]" />
          </div>
          <div className="text-sm font-semibold">Couleur d&apos;accent</div>
          <div className="flex flex-wrap items-center gap-2.5">
            {ACCS.map(([n, c]) => <button key={c} type="button" aria-label={n} aria-pressed={accent === c} onClick={() => setAccent(c)} className="h-10 w-10 rounded-xl transition-transform" style={swatch(c, accent === c)} />)}
            <input type="color" aria-label="Couleur d'accent personnalisée" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-[#CBD3E1]" />
          </div>
        </section>
        <section className="av-card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-base font-bold">Style</h2>
          <div className="text-sm font-semibold">Police des titres</div>
          <div className="flex flex-wrap gap-2">{FONTS.map((f) => <button key={f} type="button" onClick={() => setFont(f)} className={pill(font === f)} style={{ fontFamily: `'${f}'` }}>{f}</button>)}</div>
          <div className="text-sm font-semibold">Arrondi des coins · {radius} px</div>
          <input type="range" min={0} max={28} step={2} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Arrondi des coins" className="accent-[var(--av-primary)]" />
          <div className="text-sm font-semibold">Niveau d&apos;animation</div>
          <div className="flex flex-wrap gap-2">{ANIMS.map(([k, l]) => <button key={k} type="button" onClick={() => setAnim(k as typeof anim)} className={pill(anim === k)}>{l}</button>)}</div>
        </section>
        <section className="av-card p-5">
          <h2 className="m-0 mb-1 text-base font-bold">Sections de l&apos;accueil</h2>
          <p className="m-0 mb-2 text-[13px] text-muted">Réordonnez avec les flèches, activez ou masquez.</p>
          {sections.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 border-t border-[#EEF1F6] py-2 first:border-t-0">
              <button type="button" aria-label={`Monter ${s.label}`} onClick={() => move(i, -1)} disabled={i === 0} className="h-8 w-8 rounded-lg border border-line disabled:opacity-30">↑</button>
              <button type="button" aria-label={`Descendre ${s.label}`} onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="h-8 w-8 rounded-lg border border-line disabled:opacity-30">↓</button>
              <span className="flex-1 text-sm font-semibold">{s.label}</span>
              <button type="button" role="switch" aria-checked={s.visible} aria-label={s.label} onClick={() => setSections((a) => a.map((x) => (x.key === s.key ? { ...x, visible: !x.visible } : x)))} className={`flex h-6 w-[42px] rounded-full p-[3px] transition-colors ${s.visible ? "justify-end bg-primary" : "justify-start bg-[#CBD3E1]"}`}><span className="block h-[18px] w-[18px] rounded-full bg-white" /></button>
            </div>
          ))}
        </section>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="av-btn h-12 rounded-xl bg-primary px-6 font-bold text-white">{pending ? "Publication…" : "Publier les changements"}</button>
          {state.ok && <span role="status" className="text-sm font-semibold text-success">{state.message}</span>}
          {state.error && <span role="alert" className="text-sm font-semibold text-danger">{state.error}</span>}
        </div>
      </div>

      <section className="av-card flex min-w-0 flex-1 flex-col gap-3 p-4 xl:sticky xl:top-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-bold">Aperçu en direct</h2>
          <div className="flex gap-1 rounded-[10px] bg-[#F3F5FA] p-1">{DEVICES.map(([n], i) => <button key={n} type="button" onClick={() => setDev(i)} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${dev === i ? "bg-white shadow" : "text-[#4A5468]"}`}>{n}</button>)}</div>
        </div>
        <div className="flex justify-center rounded-[14px] bg-[#E9EDF4] p-4">
          <div className="overflow-hidden rounded-xl bg-[#F6F8FC] shadow-xl transition-[width] duration-500" style={{ width: DEVICES[dev][1], maxWidth: "100%" }}>
            <div className="flex items-center gap-2 border-b border-line bg-white px-3.5 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mark.png" alt="" className="h-[18px] w-auto" />
              <span className="text-sm font-bold" style={{ fontFamily: fontStack }}>Aitech <span style={{ color: primary }}>Vote</span></span>
              <span className="ml-auto px-2.5 py-1.5 text-[11px] font-bold text-white" style={{ background: primary, borderRadius: radius / 2 }}>Créer un événement</span>
            </div>
            {show("hero") && (
              <div className="flex flex-col gap-2.5 bg-[#0B1B33] p-5 text-white">
                <div key={`${anim}-${title}`} className="text-[22px] font-extrabold leading-tight" style={{ fontFamily: fontStack, animation: anim === "none" ? undefined : `av-fade-up ${anim === "dynamic" ? ".5s" : ".9s"} ease-out both` }}>
                  {title} <span style={{ color: accent }}>{hl}</span>
                </div>
                <div className="flex items-center gap-2"><span className="px-3.5 py-2 text-xs font-extrabold text-[#0B1B33]" style={{ background: accent, borderRadius: radius / 2 }}>Voter</span><span className="flex items-center gap-1.5 text-[11px] text-[#C9D3E6]"><span className="h-[7px] w-[7px] rounded-full bg-[#D92D20]" style={{ animation: anim === "none" ? undefined : "av-pulse 1.4s ease-out infinite" }} />Événements en direct</span></div>
              </div>
            )}
            {show("feed") && <div className="overflow-hidden whitespace-nowrap bg-[#081429] px-3.5 py-1.5 text-[11px] text-[#C9D3E6]">Kofi B. vient de recevoir 10 votes · Awa Y. passe 2e</div>}
            {show("events") && (
              <div className="grid gap-2.5 p-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                {["Awards Musique", "Miss Lagune", "Élection BDE"].map((x, i) => (
                  <div key={`${x}-${anim}`} className="overflow-hidden border border-line bg-white" style={{ borderRadius: radius, animation: anim === "none" ? undefined : `av-fade-up ${anim === "dynamic" ? ".4s" : ".8s"} ${i * 0.1}s ease-out both` }}>
                    <div className="h-14" style={{ background: `linear-gradient(135deg, ${primary}, #0B1B33)` }} />
                    <div className="p-2.5 text-xs font-bold" style={{ fontFamily: fontStack }}>{x}</div>
                  </div>
                ))}
              </div>
            )}
            {show("pricing") && <div className="m-3.5 flex items-center justify-between bg-[#0B1B33] p-3 text-xs text-white" style={{ borderRadius: radius }}><span>Plan Pro</span><span className="px-2.5 py-1.5 font-extrabold text-[#0B1B33]" style={{ background: accent, borderRadius: radius / 2 }}>Choisir</span></div>}
          </div>
        </div>
        <p className="m-0 text-xs text-muted">Les visiteurs qui ont demandé à réduire les animations sur leur appareil les verront sans effet.</p>
      </section>
    </form>
  );
}
