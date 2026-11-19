import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

/** Exige une session et, si précisé, un rôle. Redirige sinon. */
export async function requireProfile(roles?: Role[], next = "/connexion"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(next);
  if (profile.status === "suspended") redirect("/connexion?erreur=suspendu");
  if (roles && !roles.includes(profile.role)) redirect("/");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireProfile(["super_admin"]);
  if (p.status !== "active") redirect("/");
  return p;
}
