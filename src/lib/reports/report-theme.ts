/** Thème visuel rapports — fond blanc, bleu nuit professionnel */
export const THEME = {
  white: [255, 255, 255] as [number, number, number],
  navy: [15, 23, 42] as [number, number, number],
  navyDark: [10, 17, 35] as [number, number, number],
  accent: [14, 165, 233] as [number, number, number],
  accentDeep: [2, 132, 199] as [number, number, number],
  ice: [239, 246, 255] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
} as const;

export const PPTX_THEME = {
  navy: "0F172A",
  navyDark: "0A1123",
  accent: "0EA5E9",
  accentDeep: "0284C7",
  ice: "EFF6FF",
  white: "FFFFFF",
  slate: "334155",
  muted: "64748B",
  emerald: "10B981",
} as const;
