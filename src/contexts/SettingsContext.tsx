"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { convertCurrency } from "@/lib/currency";
import {
  compareSettingsRevision,
  readSettingsCache,
  SETTINGS_CACHE_KEY,
  writeSettingsCache,
  type SettingsCacheEntry,
} from "@/lib/settings-cache";
import { useAuth } from "@/contexts/AuthContext";
import { SALARY_VISIBILITY_SECTION } from "@/lib/permissions";
import type { AppSettings } from "@/lib/types";
import { formatCurrency, formatSalaryDisplay } from "@/lib/utils";

export type SettingsBundle = {
  settings: AppSettings;
  revision: string;
};

type SettingsContextValue = {
  settings: AppSettings;
  revision: string;
  /** Mise à jour locale immédiate (état React + localStorage), sans requête réseau */
  commitSettings: (next: AppSettings, revision?: string) => void;
  /** Après enregistrement serveur réussi — source de vérité + cache navigateur */
  applyServerSettings: (bundle: SettingsBundle) => void;
  /** @deprecated Préférer commitSettings / applyServerSettings */
  updateSettings: (next: AppSettings) => void;
  /** Rechargement explicite depuis l'API (après mutation ou si cache absent) */
  refreshSettingsFromServer: () => Promise<SettingsBundle | null>;
  hideSalaries: boolean;
  /** Permission utilisateur : voir les montants salariaux */
  canViewSalaries: boolean;
  /** Permission utilisateur : modifier salaires / primes */
  canEditSalaries: boolean;
  exchangeRate: number;
  formatSalary: (amount: number, currency?: import("@/lib/types").Currency) => string;
  formatEquivalent: (amount: number, currency: import("@/lib/types").Currency) => string | null;
  convertAmount: (
    amount: number,
    from: import("@/lib/types").Currency,
    to: import("@/lib/types").Currency
  ) => number;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  initialSettings,
  initialRevision,
  children,
}: {
  initialSettings: AppSettings;
  initialRevision: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  const [settings, setSettings] = useState(initialSettings);
  const [revision, setRevision] = useState(initialRevision);
  const hydrated = useRef(false);
  const serverRevisionRef = useRef(initialRevision);

  const commitSettings = useCallback((next: AppSettings, nextRevision?: string) => {
    setSettings(next);
    const rev = nextRevision ?? serverRevisionRef.current;
    if (nextRevision) {
      setRevision(nextRevision);
      serverRevisionRef.current = nextRevision;
    }
    writeSettingsCache(next, rev);
  }, []);

  const applyServerSettings = useCallback((bundle: SettingsBundle) => {
    setSettings(bundle.settings);
    setRevision(bundle.revision);
    serverRevisionRef.current = bundle.revision;
    writeSettingsCache(bundle.settings, bundle.revision);
  }, []);

  const updateSettings = useCallback(
    (next: AppSettings) => {
      commitSettings(next);
    },
    [commitSettings]
  );

  /** Au premier rendu client : préférer le cache navigateur (navigation SPA rapide). */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const cached = readSettingsCache();
    if (cached) {
      setSettings(cached.settings);
      setRevision(cached.revision);
      return;
    }

    writeSettingsCache(initialSettings, initialRevision);
    serverRevisionRef.current = initialRevision;
  }, [initialSettings, initialRevision]);

  /** Rechargement complet (hard refresh) : n'écrase le cache que si le serveur est plus récent. */
  useEffect(() => {
    if (!hydrated.current) return;
    serverRevisionRef.current = initialRevision;
    if (compareSettingsRevision(initialRevision, revision) > 0) {
      setSettings(initialSettings);
      setRevision(initialRevision);
      writeSettingsCache(initialSettings, initialRevision);
    }
  }, [initialRevision, initialSettings, revision]);

  /** Autre onglet a enregistré des paramètres — synchroniser sans requête réseau. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_CACHE_KEY || !event.newValue) return;
      try {
        const cached = JSON.parse(event.newValue) as SettingsCacheEntry;
        if (!cached?.settings || typeof cached.revision !== "string") return;
        setRevision((current) => {
          if (compareSettingsRevision(cached.revision, current) <= 0) return current;
          setSettings(cached.settings);
          serverRevisionRef.current = cached.revision;
          return cached.revision;
        });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshSettingsFromServer = useCallback(async (): Promise<SettingsBundle | null> => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) return null;
      const bundle = (await res.json()) as SettingsBundle;
      if (!bundle?.settings) return null;
      applyServerSettings(bundle);
      return bundle;
    } catch {
      return null;
    }
  }, [applyServerSettings]);

  const canViewSalaries = can(SALARY_VISIBILITY_SECTION, "read");
  const canEditSalaries = can(SALARY_VISIBILITY_SECTION, "write");
  const hideSalaries =
    settings.hideSalariesFromDisplay === true || !canViewSalaries;
  const exchangeRate = settings.exchangeRate > 0 ? settings.exchangeRate : 2850;

  const formatSalary = useCallback(
    (amount: number, currency: import("@/lib/types").Currency = "USD") =>
      formatSalaryDisplay(amount, currency, hideSalaries),
    [hideSalaries]
  );

  const formatEquivalent = useCallback(
    (amount: number, currency: import("@/lib/types").Currency) => {
      if (hideSalaries || !Number.isFinite(amount)) return null;
      const other: import("@/lib/types").Currency = currency === "CDF" ? "USD" : "CDF";
      const converted = convertCurrency(amount, currency, other, exchangeRate);
      return `≈ ${formatCurrency(converted, other)}`;
    },
    [hideSalaries, exchangeRate]
  );

  const convertAmount = useCallback(
    (
      amount: number,
      from: import("@/lib/types").Currency,
      to: import("@/lib/types").Currency
    ) => convertCurrency(amount, from, to, exchangeRate),
    [exchangeRate]
  );

  const value = useMemo(
    () => ({
      settings,
      revision,
      commitSettings,
      applyServerSettings,
      updateSettings,
      refreshSettingsFromServer,
      hideSalaries,
      canViewSalaries,
      canEditSalaries,
      exchangeRate,
      formatSalary,
      formatEquivalent,
      convertAmount,
    }),
    [
      settings,
      revision,
      commitSettings,
      applyServerSettings,
      updateSettings,
      refreshSettingsFromServer,
      hideSalaries,
      canViewSalaries,
      canEditSalaries,
      exchangeRate,
      formatSalary,
      formatEquivalent,
      convertAmount,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within SettingsProvider");
  }
  return ctx;
}

/** Retourne null si le provider n'est pas monté (ex. premier rendu SSR d'une page). */
export function useOptionalAppSettings() {
  return useContext(SettingsContext);
}
