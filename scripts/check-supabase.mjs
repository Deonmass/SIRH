#!/usr/bin/env node
/**
 * Vérifie la connexion Supabase (.env.local requis).
 * Usage : npm run db:check
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants (.env.local)");
  process.exit(1);
}

const supabase = createClient(url, key);
const { error } = await supabase.from("app_meta").select("id").limit(1);

if (!error) {
  console.log("✅ Connexion OK — schéma détecté (table app_meta)");
  process.exit(0);
}

if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
  console.log("✅ Connexion Supabase OK");
  console.log("⚠️  Schéma absent — exécutez database/migration.sql dans Supabase → SQL Editor");
  process.exit(0);
}

console.error("❌ Erreur Supabase:", error.message);
process.exit(1);
