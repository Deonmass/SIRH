import type { AppSettings } from "./types";

export const SETTINGS_CACHE_KEY = "sirh-app-settings-v1";

export type SettingsCacheEntry = {
  settings: AppSettings;
  revision: string;
  cachedAt: number;
};

export function readSettingsCache(): SettingsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SettingsCacheEntry;
    if (!parsed?.settings || typeof parsed.revision !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSettingsCache(settings: AppSettings, revision: string): void {
  if (typeof window === "undefined") return;
  try {
    const entry: SettingsCacheEntry = {
      settings,
      revision,
      cachedAt: Date.now(),
    };
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* quota / mode privé */
  }
}

export function clearSettingsCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Compare deux révisions (ISO ou préfixe `db:`). Retour > 0 si a est plus récent que b. */
export function compareSettingsRevision(a: string, b: string): number {
  if (a === b) return 0;
  const ta = a.replace(/^db:|^local:/, "");
  const tb = b.replace(/^db:|^local:/, "");
  if (ta > tb) return 1;
  if (ta < tb) return -1;
  return 0;
}
