import type { HopitalVisite } from "@/lib/repositories/hopital-visite";
import { getSanteVisiteStatut, type SanteVisiteValidation } from "@/lib/sante-visite";

export interface SanteDashboardFilters {
  year?: number;
  month?: number;
  date?: string;
  hopital?: string;
}

export interface SanteDashboardData {
  filters: SanteDashboardFilters;
  kpi: {
    totalVisites: number;
    montantTotal: number;
    enAttente: number;
    validees: number;
    rejetees: number;
  };
  topAgents: { matricule: string; count: number }[];
  topHopitaux: { hopital: string; montant: number; count: number }[];
  visitesParMois: { label: string; count: number; montant: number }[];
  repartitionHopital: { hopital: string; count: number }[];
  repartitionValidation: { statut: SanteVisiteValidation; label: string; count: number }[];
  montantParMois: { label: string; montant: number }[];
}

function inFilterRange(dateVisite: string | undefined, filters: SanteDashboardFilters): boolean {
  if (!dateVisite) return !filters.date && !filters.month && !filters.year;
  if (filters.date && dateVisite !== filters.date) return false;
  const [y, m] = dateVisite.split("-").map(Number);
  if (filters.year && y !== filters.year) return false;
  if (filters.month && m !== filters.month) return false;
  return true;
}

export function buildSanteDashboard(
  visites: HopitalVisite[],
  filters: SanteDashboardFilters
): SanteDashboardData {
  const scoped = visites.filter((v) => {
    if (filters.hopital && (v.hopital ?? "") !== filters.hopital) return false;
    return inFilterRange(v.dateVisite, filters);
  });

  const kpi = {
    totalVisites: scoped.length,
    montantTotal: scoped.reduce((s, v) => s + (v.montant ?? 0), 0),
    enAttente: scoped.filter((v) => getSanteVisiteStatut(v.validation) === "en_attente").length,
    validees: scoped.filter((v) => getSanteVisiteStatut(v.validation) === "valide").length,
    rejetees: scoped.filter((v) => getSanteVisiteStatut(v.validation) === "rejete").length,
  };

  const agentMap = new Map<string, number>();
  scoped.forEach((v) => {
    const key = v.matriculeAgent?.trim() || "—";
    agentMap.set(key, (agentMap.get(key) ?? 0) + 1);
  });
  const topAgents = [...agentMap.entries()]
    .map(([matricule, count]) => ({ matricule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hopitalMap = new Map<string, { montant: number; count: number }>();
  scoped.forEach((v) => {
    const key = v.hopital?.trim() || "Non renseigné";
    const cur = hopitalMap.get(key) ?? { montant: 0, count: 0 };
    cur.count += 1;
    cur.montant += v.montant ?? 0;
    hopitalMap.set(key, cur);
  });
  const topHopitaux = [...hopitalMap.entries()]
    .map(([hopital, data]) => ({ hopital, ...data }))
    .sort((a, b) => b.montant - a.montant || b.count - a.count)
    .slice(0, 5);

  const monthMap = new Map<string, { count: number; montant: number }>();
  scoped.forEach((v) => {
    const key = v.dateVisite?.slice(0, 7) ?? "sans-date";
    const cur = monthMap.get(key) ?? { count: 0, montant: 0 };
    cur.count += 1;
    cur.montant += v.montant ?? 0;
    monthMap.set(key, cur);
  });

  let visitesParMois: { label: string; count: number; montant: number }[];
  if (filters.year && !filters.month && !filters.date) {
    visitesParMois = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const key = `${filters.year}-${String(month).padStart(2, "0")}`;
      const data = monthMap.get(key) ?? { count: 0, montant: 0 };
      return {
        label: new Date(`${key}-01`).toLocaleDateString("fr-FR", {
          month: "short",
          year: "2-digit",
        }),
        ...data,
      };
    });
  } else {
    visitesParMois = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, data]) => ({
        label:
          key === "sans-date"
            ? "Sans date"
            : new Date(`${key}-01`).toLocaleDateString("fr-FR", {
                month: "short",
                year: "2-digit",
              }),
        ...data,
      }));
  }

  const repartitionHopital = [...hopitalMap.entries()]
    .map(([hopital, data]) => ({ hopital, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const validationMap = new Map<SanteVisiteValidation, number>();
  scoped.forEach((v) => {
    const key = getSanteVisiteStatut(v.validation);
    validationMap.set(key, (validationMap.get(key) ?? 0) + 1);
  });

  return {
    filters,
    kpi,
    topAgents,
    topHopitaux,
    visitesParMois,
    montantParMois: visitesParMois.map((m) => ({ label: m.label, montant: m.montant })),
    repartitionHopital,
    repartitionValidation: (["en_attente", "valide", "rejete"] as SanteVisiteValidation[]).map(
      (statut) => ({
        statut,
        label:
          statut === "en_attente" ? "En attente" : statut === "valide" ? "Validé" : "Rejeté",
        count: validationMap.get(statut) ?? 0,
      })
    ),
  };
}
