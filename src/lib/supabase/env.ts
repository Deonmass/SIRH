const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseEnv() {
  if (!url || !anonKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)"
    );
  }
  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  if (!serviceRoleKey) {
    throw new Error(
      "Variable Supabase manquante : SUPABASE_SERVICE_ROLE_KEY (.env.local) — requise pour le stockage des documents employé"
    );
  }
  return serviceRoleKey;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(url && anonKey && serviceRoleKey);
}
