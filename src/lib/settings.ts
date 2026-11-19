import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Plan, SiteSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: SiteSettings = {
  theme: { primary: "#1F6FE5", accent: "#F2A516", ink: "#0B1B33", headingFont: "Sora", radius: 16, animation: "soft" },
  home_sections: [
    { key: "hero", label: "Bandeau principal", visible: true },
    { key: "feed", label: "Fil des votes en direct", visible: true },
    { key: "events", label: "Événements en cours", visible: true },
    { key: "modes", label: "Cinq façons de voter", visible: true },
    { key: "steps", label: "Voter en 3 étapes", visible: true },
    { key: "pricing", label: "Tarifs", visible: true },
  ],
  modules: { paid: true, free: true, jury: true, election: true, live: true, consent_required: true, whatsapp: true },
  payment_methods: { wave: true, orange_money: true, mtn: true, moov: true, card: true },
  content: {
    heroTitle: "Votez en 10 secondes.",
    heroHighlight: "Des résultats que tout le monde peut vérifier.",
    heroText: "La plateforme de vote des concours, awards et élections en Afrique de l'Ouest. Paiement par Wave, Orange Money, MTN, Moov ou carte, sans créer de compte.",
  },
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const db = await createClient();
    const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_SETTINGS;
    return {
      theme: { ...DEFAULT_SETTINGS.theme, ...(data.theme ?? {}) },
      home_sections: data.home_sections?.length ? data.home_sections : DEFAULT_SETTINGS.home_sections,
      modules: { ...DEFAULT_SETTINGS.modules, ...(data.modules ?? {}) },
      payment_methods: { ...DEFAULT_SETTINGS.payment_methods, ...(data.payment_methods ?? {}) },
      content: { ...DEFAULT_SETTINGS.content, ...(data.content ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export const getPlans = cache(async (): Promise<Plan[]> => {
  const db = await createClient();
  const { data } = await db.from("plans").select("*").eq("is_visible", true).order("display_order");
  return (data ?? []) as Plan[];
});

export const FONT_STACKS: Record<string, string> = {
  Sora: "'Sora', system-ui, sans-serif",
  Poppins: "'Poppins', system-ui, sans-serif",
  Montserrat: "'Montserrat', system-ui, sans-serif",
};
