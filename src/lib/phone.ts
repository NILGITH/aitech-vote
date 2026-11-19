/** Normalise un numéro ivoirien (ou international) au format E.164 sans « + ». */
export function normalizePhone(input: string, defaultCountry = "225"): string | null {
  let d = (input || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 10 || d.length === 8) d = defaultCountry + d;
  if (!/^\d{10,15}$/.test(d)) return null;
  return d;
}

export function maskPhone(e164: string): string {
  if (e164.length < 6) return "••••";
  return `+${e164.slice(0, 3)} •• •• ${e164.slice(-4, -2)} ${e164.slice(-2)}`;
}
