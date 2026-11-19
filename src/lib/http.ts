import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { keyedHash } from "@/lib/crypto";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return keyedHash(ip, "ip");
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
}

export async function userAgent(): Promise<string> {
  return (await headers()).get("user-agent") ?? "";
}

/** Traduit les erreurs levées par les fonctions SQL en messages lisibles. */
export function sqlErrorMessage(message: string): string {
  const map: Record<string, string> = {
    voting_closed: "Le vote est fermé pour cet événement.",
    candidate_unavailable: "Ce candidat n'est pas disponible.",
    free_vote_disabled: "Le vote gratuit n'est pas activé pour cet événement.",
    free_quota_reached: "Vous avez déjà utilisé votre vote gratuit pour aujourd'hui dans cette catégorie.",
    amount_mismatch: "Le montant payé ne correspond pas.",
    transaction_reused: "Cette transaction a déjà été utilisée.",
    already_voted: "Vous avez déjà voté pour ce scrutin.",
    elector_not_found: "Électeur introuvable.",
    too_many_choices: "Trop de choix pour un poste.",
    invalid_candidate: "Choix invalide.",
    invalid_category: "Poste invalide.",
    duplicate_choice: "Un même candidat a été choisi deux fois.",
  };
  const key = Object.keys(map).find((k) => message.includes(k));
  return key ? map[key] : "Une erreur est survenue. Réessayez.";
}
