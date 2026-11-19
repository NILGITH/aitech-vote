import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Retour des liens e-mail Supabase (confirmation, invitation jury, réinitialisation). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/organisateur";
  if (code) {
    const db = await createClient();
    await db.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin));
}
