"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "../../connexion/actions";

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "10 caractères minimum." };
  const db = await createClient();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "Lien expiré. Recommencez depuis « Mot de passe oublié »." };
  redirect("/connexion");
}
