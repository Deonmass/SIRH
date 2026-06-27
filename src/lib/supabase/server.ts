import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "./env";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* ignore — Server Component en lecture seule */
        }
      },
    },
  });
}

/** Client serveur simple (API routes, scripts) — clé anon */
export function createSupabaseAdminAnonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey);
}

/** Client service role — stockage documents, opérations serveur privilégiées */
export function createSupabaseServiceClient() {
  const { url } = getSupabaseEnv();
  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
