#!/usr/bin/env node
/**
 * Copie les pannes stockées dans configuration → colonne vehicules (pannes jsonb ou panne text).
 *
 * Usage : npm run db:sync-pannes
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const CONFIG_TITRE = "Charroi — pannes véhicules";

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis (.env.local)");
  process.exit(1);
}

const sb = createClient(url, key);

let mode = "configuration";
const { error: pannesErr } = await sb.from("vehicules").select("pannes").limit(1);
if (!pannesErr) mode = "pannes_jsonb";
else {
  const { error: panneErr } = await sb.from("vehicules").select("panne").limit(1);
  if (!panneErr) mode = "panne_text";
}

if (mode === "configuration") {
  console.error(
    "✗ Aucune colonne pannes/panne sur vehicules. Ajoutez panne (text) ou exécutez migration 041."
  );
  process.exit(1);
}

console.log(`→ Mode colonne : ${mode}`);

const { data: cfg } = await sb
  .from("configuration")
  .select("id,params")
  .eq("titre_config", CONFIG_TITRE)
  .maybeSingle();

const byId = cfg?.params?.byId;
if (!byId || typeof byId !== "object" || !Object.keys(byId).length) {
  console.log("✓ Aucune donnée legacy dans configuration.");
  process.exit(0);
}

let synced = 0;
for (const [id, events] of Object.entries(byId)) {
  if (!Array.isArray(events) || !events.length) continue;
  const payload =
    mode === "pannes_jsonb"
      ? { pannes: events, updated_at: new Date().toISOString() }
      : { panne: JSON.stringify(events), updated_at: new Date().toISOString() };
  const { error } = await sb.from("vehicules").update(payload).eq("id", Number(id));
  if (error) {
    console.error(`✗ Véhicule ${id}:`, error.message);
    continue;
  }
  synced++;
  console.log(`  → véhicule ${id} : ${events.length} événement(s)`);
}

if (synced > 0 && cfg?.id) {
  await sb.from("configuration").update({ params: { byId: {} } }).eq("id", cfg.id);
  console.log(`✓ ${synced} véhicule(s) synchronisé(s), configuration nettoyée.`);
} else {
  console.log("✓ Rien à synchroniser.");
}
