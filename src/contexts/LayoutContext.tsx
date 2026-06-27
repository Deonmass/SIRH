"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  type AppearancePrefs,
  type HeaderColorPreset,
  type SidebarColorPreset,
} from "@/lib/appearance-presets";

export type ThemeMode = AppearancePrefs["theme"];

type LayoutContextValue = {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  sidebarColor: SidebarColorPreset;
  headerColor: HeaderColorPreset;
  sidebarCustomColor: string;
  headerCustomColor: string;
  profileModalOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarColor: (color: SidebarColorPreset) => void;
  setHeaderColor: (color: HeaderColorPreset) => void;
  setSidebarCustomColor: (hex: string) => void;
  setHeaderCustomColor: (hex: string) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  resetAppearance: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

const LEGACY_THEME_KEY = "sirh-theme";
const LEGACY_SIDEBAR_KEY = "sirh-sidebar-collapsed";

function readAppearance(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;

  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
      return {
        ...DEFAULT_APPEARANCE,
        ...parsed,
      };
    }
  } catch {
    /* ignore */
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  const legacySidebar = localStorage.getItem(LEGACY_SIDEBAR_KEY);
  return {
    ...DEFAULT_APPEARANCE,
    theme: legacyTheme === "light" ? "light" : "dark",
    sidebarCollapsed: legacySidebar === "1",
  };
}

function persistAppearance(prefs: AppearancePrefs) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
  localStorage.setItem(LEGACY_THEME_KEY, prefs.theme);
  localStorage.setItem(LEGACY_SIDEBAR_KEY, prefs.sidebarCollapsed ? "1" : "0");
}

function applyAppearanceToDom(prefs: AppearancePrefs) {
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.classList.toggle("dark", prefs.theme === "dark");
  root.classList.toggle("light", prefs.theme === "light");

  if (prefs.sidebarColor === "custom") {
    root.removeAttribute("data-sidebar-color");
    root.style.setProperty("--shell-sidebar", prefs.sidebarCustomColor);
  } else if (prefs.sidebarColor === "default") {
    root.removeAttribute("data-sidebar-color");
    root.style.removeProperty("--shell-sidebar");
  } else {
    root.setAttribute("data-sidebar-color", prefs.sidebarColor);
    root.style.removeProperty("--shell-sidebar");
  }

  if (prefs.headerColor === "custom") {
    root.removeAttribute("data-header-color");
    root.style.setProperty("--shell-header-bg", prefs.headerCustomColor);
  } else if (prefs.headerColor === "default") {
    root.removeAttribute("data-header-color");
    root.style.removeProperty("--shell-header-bg");
  } else {
    root.setAttribute("data-header-color", prefs.headerColor);
    root.style.removeProperty("--shell-header-bg");
  }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearancePrefs>(DEFAULT_APPEARANCE);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = readAppearance();
    setAppearance(prefs);
    applyAppearanceToDom(prefs);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyAppearanceToDom(appearance);
    persistAppearance(appearance);
  }, [appearance, ready]);

  const patchAppearance = useCallback((patch: Partial<AppearancePrefs>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }, []);

  const setTheme = useCallback(
    (theme: ThemeMode) => patchAppearance({ theme }),
    [patchAppearance]
  );
  const toggleTheme = useCallback(
    () => setAppearance((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" })),
    []
  );
  const setSidebarCollapsed = useCallback(
    (sidebarCollapsed: boolean) => patchAppearance({ sidebarCollapsed }),
    [patchAppearance]
  );
  const toggleSidebar = useCallback(
    () => setAppearance((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed })),
    []
  );
  const setSidebarColor = useCallback(
    (sidebarColor: SidebarColorPreset) => patchAppearance({ sidebarColor }),
    [patchAppearance]
  );
  const setHeaderColor = useCallback(
    (headerColor: HeaderColorPreset) => patchAppearance({ headerColor }),
    [patchAppearance]
  );
  const setSidebarCustomColor = useCallback(
    (sidebarCustomColor: string) =>
      patchAppearance({ sidebarCustomColor, sidebarColor: "custom" }),
    [patchAppearance]
  );
  const setHeaderCustomColor = useCallback(
    (headerCustomColor: string) =>
      patchAppearance({ headerCustomColor, headerColor: "custom" }),
    [patchAppearance]
  );
  const resetAppearance = useCallback(() => {
    setAppearance(DEFAULT_APPEARANCE);
  }, []);
  const openProfileModal = useCallback(() => setProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setProfileModalOpen(false), []);

  const value = useMemo(
    () => ({
      theme: appearance.theme,
      sidebarCollapsed: appearance.sidebarCollapsed,
      sidebarColor: appearance.sidebarColor,
      headerColor: appearance.headerColor,
      sidebarCustomColor: appearance.sidebarCustomColor,
      headerCustomColor: appearance.headerCustomColor,
      profileModalOpen,
      setTheme,
      toggleTheme,
      setSidebarCollapsed,
      toggleSidebar,
      setSidebarColor,
      setHeaderColor,
      setSidebarCustomColor,
      setHeaderCustomColor,
      openProfileModal,
      closeProfileModal,
      resetAppearance,
    }),
    [
      appearance,
      profileModalOpen,
      setTheme,
      toggleTheme,
      setSidebarCollapsed,
      toggleSidebar,
      setSidebarColor,
      setHeaderColor,
      setSidebarCustomColor,
      setHeaderCustomColor,
      openProfileModal,
      closeProfileModal,
      resetAppearance,
    ]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
