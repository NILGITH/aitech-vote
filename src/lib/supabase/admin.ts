import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client « service » : contourne la RLS. À n'utiliser que dans du code serveur,
 * après avoir vérifié les droits de l'appelant.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
