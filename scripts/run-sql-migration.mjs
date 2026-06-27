#!/usr/bin/env node
/**
 * Exécute un fichier SQL sur Supabase Postgres.
 *
 * Variables (.env.local) :
 *   DATABASE_URL              — chaîne complète (prioritaire)
 *   SUPABASE_DB_PASSWORD      — mot de passe postgres du projet
 *   NEXT_PUBLIC_SUPABASE_URL  — pour déduire l'hôte db.<ref>.supabase.co
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function projectRefFromUrl(url) {
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!password || !ref) {
    throw new Error(
      "DATABASE_URL ou SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL requis (.env.local).\n" +
        "Mot de passe : Supabase Dashboard → Project Settings → Database → Database password"
    );
  }

  const host = process.env.SUPABASE_DB_HOST ?? `db.${ref}.supabase.co`;
  const user = process.env.SUPABASE_DB_USER ?? "postgres";
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";
  const port = process.env.SUPABASE_DB_PORT ?? "5432";
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:${port}/${database}`;
}

async function main() {
  loadEnvLocal();
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/run-sql-migration.mjs <fichier.sql>");
    process.exit(1);
  }

  const sqlPath = resolve(root, file);
  const sql = readFileSync(sqlPath, "utf8");
  const url = resolveDatabaseUrl();

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`→ Exécution de ${file}…`);
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Migration exécutée avec succès.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗ Échec migration:", err.message);
  process.exit(1);
});
