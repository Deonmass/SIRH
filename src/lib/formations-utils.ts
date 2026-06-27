import type { DbFormationParticipantJson } from "../../database/migrations/017_formations_table.types";
import type { FormationRecord, FormationStatus } from "@/lib/types";

export const FORMATION_NIVEAU_OPTIONS = [
  "Débutant",
  "Intermédiaire",
  "Avancé",
  "Expert",
] as const;

export type FormationNiveau = (typeof FORMATION_NIVEAU_OPTIONS)[number];

export function formationIdToApp(id: number): string {
  return String(id);
}

export function formationIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Identifiant formation invalide : ${id}`);
  return n;
}

export function parseParticipationJson(raw: unknown): DbFormationParticipantJson[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as DbFormationParticipantJson[];
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as { participants?: unknown };
    if (Array.isArray(obj.participants)) return obj.participants as DbFormationParticipantJson[];
  }
  return [];
}

export function formationStatus(
  dateDebut: string,
  dateFin: string,
  asOf = new Date()
): FormationStatus {
  const today = asOf.toISOString().slice(0, 10);
  if (today < dateDebut) return "a_venir";
  if (today > dateFin) return "terminee";
  return "en_cours";
}

export function formationStatusLabel(status: FormationStatus): string {
  switch (status) {
    case "a_venir":
      return "À venir";
    case "en_cours":
      return "En cours";
    case "terminee":
      return "Terminée";
  }
}

export function formationStatusBadgeClass(status: FormationStatus): string {
  switch (status) {
    case "a_venir":
      return "bg-sky-500/20 text-sky-400";
    case "en_cours":
      return "bg-amber-500/20 text-amber-500";
    case "terminee":
      return "bg-emerald-500/20 text-emerald-500";
  }
}

export function rowToFormationRecord(row: {
  id: number;
  titre: string;
  date_debut: string;
  date_fin: string;
  niveau: string | null;
  instructeur: string | null;
  commentaire: string | null;
  participation: unknown;
  cree_le?: string;
  modif_le?: string;
}): FormationRecord {
  const participants = parseParticipationJson(row.participation);
  const status = formationStatus(row.date_debut, row.date_fin);
  return {
    id: formationIdToApp(row.id),
    titre: row.titre,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    niveau: row.niveau ?? undefined,
    instructeur: row.instructeur ?? undefined,
    commentaire: row.commentaire ?? undefined,
    participants,
    participantCount: participants.length,
    status,
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}
