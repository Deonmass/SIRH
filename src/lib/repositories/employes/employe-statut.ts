import { EMPLOYE_STATUT_VALUES } from "../../../../database/migrations/007_employes_statut.types";
import type { EmployeeStatus } from "@/lib/types";

const VALID = new Set<string>(EMPLOYE_STATUT_VALUES);

/** Libellés affichés dans la liste, le dossier et les filtres. */
export const EMPLOYE_STATUT_LABELS: Record<EmployeeStatus, string> = {
  candidat: "Candidat",
  pre_embauche: "Pré-embauche",
  essai: "Période d'essai",
  actif: "Actif",
  conge: "En congé",
  suspendu: "Suspendu",
  preavis: "Préavis",
  sorti: "Sorti",
  licencie: "Licencié",
};

/** Ordre des onglets statut (liste employés, rapports). */
export { EMPLOYE_STATUT_VALUES as EMPLOYE_STATUT_ORDER };

const ALIASES: Record<string, EmployeeStatus> = {
  engage: "pre_embauche",
  engagee: "pre_embauche",
  engager: "pre_embauche",
  preembauche: "pre_embauche",
  periode_d_essai: "essai",
  periode_dessai: "essai",
  periode_essai: "essai",
  periodeessai: "essai",
  en_conge: "conge",
  conges: "conge",
  pre_avis: "preavis",
};

function normalizeStatutKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "_")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function parseEmployeStatut(raw: string | null | undefined): EmployeeStatus {
  if (!raw?.trim()) return "candidat";

  const trimmed = raw.trim();
  if (VALID.has(trimmed)) return trimmed as EmployeeStatus;

  const key = normalizeStatutKey(trimmed);
  if (VALID.has(key)) return key as EmployeeStatus;
  if (ALIASES[key]) return ALIASES[key];

  return "candidat";
}

export function employeStatutLabel(status: EmployeeStatus): string {
  return EMPLOYE_STATUT_LABELS[status] ?? status;
}
