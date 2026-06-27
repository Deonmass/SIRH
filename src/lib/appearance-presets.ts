export type SidebarColorPreset =
  | "default"
  | "white"
  | "slate"
  | "sky"
  | "indigo"
  | "emerald"
  | "custom";

export type HeaderColorPreset = "default" | "white" | "sky" | "slate" | "custom";

export type AppearancePrefs = {
  theme: "dark" | "light";
  sidebarCollapsed: boolean;
  sidebarColor: SidebarColorPreset;
  headerColor: HeaderColorPreset;
  sidebarCustomColor: string;
  headerCustomColor: string;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: "dark",
  sidebarCollapsed: false,
  sidebarColor: "default",
  headerColor: "default",
  sidebarCustomColor: "#e0f2fe",
  headerCustomColor: "#ffffff",
};

export const SIDEBAR_COLOR_OPTIONS: {
  id: Exclude<SidebarColorPreset, "custom">;
  label: string;
  swatch: string;
}[] = [
  { id: "default", label: "Défaut", swatch: "#64748b" },
  { id: "white", label: "Blanc", swatch: "#ffffff" },
  { id: "slate", label: "Ardoise", swatch: "#f1f5f9" },
  { id: "sky", label: "Bleu ciel", swatch: "#e0f2fe" },
  { id: "indigo", label: "Indigo", swatch: "#eef2ff" },
  { id: "emerald", label: "Émeraude", swatch: "#ecfdf5" },
];

export const HEADER_COLOR_OPTIONS: {
  id: Exclude<HeaderColorPreset, "custom">;
  label: string;
  swatch: string;
}[] = [
  { id: "default", label: "Défaut", swatch: "#64748b" },
  { id: "white", label: "Blanc", swatch: "#ffffff" },
  { id: "sky", label: "Bleu clair", swatch: "#e0f2fe" },
  { id: "slate", label: "Ardoise", swatch: "#f8fafc" },
];

export const APPEARANCE_STORAGE_KEY = "sirh-appearance";
