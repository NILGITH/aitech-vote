"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthState = { error?: string; info?: string };

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const db = await createClient();
  const { data, error } = await db.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  const { data: p } = await db.from("profiles").select("role").eq("id", data.user.id).single();
  const next = String(form.get("suite") ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(p?.role === "super_admin" ? "/admin" : p?.role === "jury" ? "/jury" : "/organisateur");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const full_name = String(form.get("full_name") ?? "").trim();
  const organization_name = String(form.get("organization_name") ?? "").trim();
  if (password.length < 10) return { error: "Le mot de passe doit contenir au moins 10 caractères." };
  if (!full_name) return { error: "Indiquez votre nom." };
  const db = await createClient();
  const { error } = await db.auth.signUp({
    email,
    password,
    options: { data: { full_name, organization_name }, emailRedirectTo: `${env.siteUrl()}/auth/callback?next=/organisateur` },
  });
  if (error) return { error: error.message.includes("registered") ? "Un compte existe déjà avec cet e-mail." : "Inscription impossible. Vérifiez vos informations." };
  return { info: "Compte créé. Confirmez votre e-mail, puis connectez-vous. Un administrateur validera votre compte organisateur." };
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/");
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const db = await createClient();
  await db.auth.resetPasswordForEmail(String(form.get("email") ?? ""), { redirectTo: `${env.siteUrl()}/auth/callback?next=/compte/mot-de-passe` });
  return { info: "Si un compte existe, un lien de réinitialisation vient d'être envoyé." };
}
