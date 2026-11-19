export const fcfa = (n: number | null | undefined) =>
  `${Math.round(Number(n ?? 0)).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;

export const num = (n: number | null | undefined) => Math.round(Number(n ?? 0)).toLocaleString("fr-FR").replace(/ /g, " ");

export const dateFr = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    timeZone: "Africa/Abidjan",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const PALETTE = ["#1F6FE5", "#7A4FD6", "#C2410C", "#0E7C66", "#B4235F", "#475569", "#1650B8", "#8A5A00"];
export const colorFor = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

export const MODE_LABELS: Record<string, string> = {
  paid: "Vote public payant",
  free: "Vote gratuit contrôlé",
  jury: "Jury",
  election: "Élection à bulletin secret",
  live: "Vote en direct",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  awards: "Awards",
  beauty: "Concours de beauté",
  talent: "Talents",
  election: "Élection",
  other: "Autre",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  pending_review: "En validation",
  published: "Publié",
  closed: "Clôturé",
  archived: "Archivé",
};

export const CONSENT_LABELS: Record<string, string> = {
  not_sent: "Non envoyé",
  pending: "En attente",
  accepted: "Publié",
  refused: "Refusé",
  bounced: "E-mail non remis",
  withdrawn: "Retiré",
};
