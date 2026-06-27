import { MOVEMENT_TYPE_LABELS } from "@/lib/movement-type-labels";
import type { ActivityEntityType } from "../../database/migrations/025_xlog.types";
import {
  resolveActivityChanges,
  type ActivityChanges,
  type ActivityFieldChange,
} from "@/lib/activity-log-diff";
import { ACTIVITY_ACTION_LABELS, ACTIVITY_ENTITY_LABELS } from "@/lib/activity-log-labels";
import type { ActivityLogEntry } from "@/lib/types";

export type ActivityDisplayRow = {
  key: string;
  label: string;
  value: string;
  highlight?: boolean;
};

export type ActivityStateSection = {
  title: string;
  rows: ActivityDisplayRow[];
};

const FIELD_LABELS: Record<string, string> = {
  employeeId: "ID employé",
  "movement.id": "ID mouvement",
  "movement.code": "Code mouvement",
  "movement.type": "Type de mouvement",
  "movement.date": "Date",
  "movement.effectiveDate": "Date d'effet",
  "movement.reason": "Motif",
  "movement.legalBasis": "Base légale",
  "movement.approvedBy": "Approuvé par",
  "movement.fromPosition": "Poste d'origine",
  "movement.toPosition": "Nouveau poste",
  "movement.fromDepartment": "Département d'origine",
  "movement.toDepartment": "Nouveau département",
  "movement.fromSalary": "Salaire d'origine",
  "movement.toSalary": "Nouveau salaire",
  "movement.positionCode": "Code poste",
  "movement.documentAnnexe": "Document annexe",
  "employee.matricule": "Matricule",
  "employee.prenom": "Prénom",
  "employee.nom": "Nom",
  "employee.postNom": "Post-nom",
  "employee.department": "Département",
  "employee.position": "Poste",
  "employee.email": "E-mail",
  "employee.telephone": "Téléphone",
  "employee.status": "Statut",
  "username": "Identifiant",
  "matriculAgent": "Matricule lié",
  "actif": "Compte actif",
  "name": "Nom",
  "code": "Code",
  "title": "Titre",
  "label": "Libellé",
};

function humanizeFieldKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const last = key.split(".").pop() ?? key;
  return last
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatActivityValue(value: unknown, fieldKey?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (fieldKey === "movement.type" && typeof value === "string") {
    return MOVEMENT_TYPE_LABELS[value as keyof typeof MOVEMENT_TYPE_LABELS] ?? value;
  }
  if (
    fieldKey &&
    (fieldKey.includes("date") || fieldKey.includes("Date") || fieldKey.endsWith("_at"))
  ) {
    const parsed = Date.parse(String(value));
    if (!Number.isNaN(parsed)) {
      try {
        return new Date(parsed).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        /* fall through */
      }
    }
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR");
  }
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return json.length > 120 ? `${json.slice(0, 117)}…` : json;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function movementSection(payload: Record<string, unknown> | null): ActivityStateSection | null {
  if (!payload?.movement || typeof payload.movement !== "object") return null;
  const m = payload.movement as Record<string, unknown>;
  const rows: ActivityDisplayRow[] = [
    { key: "type", label: "Type", value: formatActivityValue(m.type, "movement.type"), highlight: true },
    { key: "code", label: "Code", value: formatActivityValue(m.code) },
    { key: "date", label: "Date", value: formatActivityValue(m.date ?? m.effectiveDate, "movement.date") },
    {
      key: "effectiveDate",
      label: "Date d'effet",
      value: formatActivityValue(m.effectiveDate, "movement.effectiveDate"),
    },
    { key: "reason", label: "Motif", value: formatActivityValue(m.reason) },
    { key: "fromPosition", label: "Poste d'origine", value: formatActivityValue(m.fromPosition) },
    { key: "toPosition", label: "Nouveau poste", value: formatActivityValue(m.toPosition) },
    {
      key: "fromDepartment",
      label: "Département d'origine",
      value: formatActivityValue(m.fromDepartment),
    },
    { key: "toDepartment", label: "Nouveau département", value: formatActivityValue(m.toDepartment) },
    { key: "positionCode", label: "Code poste", value: formatActivityValue(m.positionCode) },
    { key: "approvedBy", label: "Approuvé par", value: formatActivityValue(m.approvedBy) },
  ].filter((r) => r.value !== "—");
  if (rows.length === 0) return null;
  return { title: "Mouvement", rows };
}

function employeeSection(payload: Record<string, unknown> | null): ActivityStateSection | null {
  const emp =
    payload?.employee && typeof payload.employee === "object"
      ? (payload.employee as Record<string, unknown>)
      : null;
  if (!emp) return null;
  const rows: ActivityDisplayRow[] = [
    {
      key: "name",
      label: "Employé",
      value: [emp.prenom, emp.nom, emp.postNom].filter(Boolean).join(" ").trim() || "—",
      highlight: true,
    },
    { key: "matricule", label: "Matricule", value: formatActivityValue(emp.matricule) },
    { key: "department", label: "Département", value: formatActivityValue(emp.department) },
    { key: "position", label: "Poste", value: formatActivityValue(emp.position) },
    { key: "email", label: "E-mail", value: formatActivityValue(emp.email) },
    { key: "telephone", label: "Téléphone", value: formatActivityValue(emp.telephone) },
    { key: "status", label: "Statut", value: formatActivityValue(emp.status) },
  ].filter((r) => r.value !== "—");
  if (rows.length === 0) return null;
  return { title: "Employé", rows };
}

function genericSection(
  payload: Record<string, unknown> | null,
  title: string
): ActivityStateSection | null {
  if (!payload) return null;
  const skip = new Set(["movement", "employee", "permissions", "workflow", "documents", "family"]);
  const rows = Object.entries(payload)
    .filter(([key, value]) => !skip.has(key) && value !== null && value !== undefined && value !== "")
    .slice(0, 24)
    .map(([key, value]) => ({
      key,
      label: humanizeFieldKey(key),
      value: formatActivityValue(value, key),
    }));
  if (rows.length === 0) return null;
  return { title, rows };
}

export function buildActivityStateSections(
  payload: Record<string, unknown> | null,
  entityType: ActivityEntityType
): ActivityStateSection[] {
  if (!payload) return [];

  if (entityType === "mouvement") {
    return [movementSection(payload), employeeSection(payload)].filter(
      (s): s is ActivityStateSection => s !== null
    );
  }

  const emp = employeeSection(payload);
  if (emp) return [emp];

  const generic = genericSection(payload, ACTIVITY_ENTITY_LABELS[entityType] ?? "Données");
  return generic ? [generic] : [];
}

export function getEntryChanges(entry: ActivityLogEntry): ActivityChanges | null {
  return resolveActivityChanges(entry);
}

export function buildEnrichedActivityJson(entry: ActivityLogEntry): Record<string, unknown> {
  const changes = getEntryChanges(entry);
  return {
    meta: {
      id: entry.id,
      action: entry.action,
      actionLabel: ACTIVITY_ACTION_LABELS[entry.action] ?? entry.action,
      entityType: entry.entityType,
      entityTypeLabel: ACTIVITY_ENTITY_LABELS[entry.entityType] ?? entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      summary: entry.summary,
      utilisateur: entry.utilisateur,
      createdAt: entry.createdAt,
      createdBy: entry.createdBy,
      undoneAt: entry.undoneAt,
      undoneBy: entry.undoneBy,
      changedFieldCount: changes ? Object.keys(changes).length : 0,
    },
    resume: {
      avant: buildActivityStateSections(entry.payloadBefore, entry.entityType),
      apres: buildActivityStateSections(entry.payloadAfter, entry.entityType),
    },
    before: entry.payloadBefore,
    after: entry.payloadAfter,
    changes: changes ?? {},
  };
}

export function changeRows(changes: ActivityChanges): Array<{
  field: string;
  label: string;
  before: string;
  after: string;
  change: ActivityFieldChange;
}> {
  return Object.entries(changes).map(([field, change]) => ({
    field,
    label: humanizeFieldKey(field),
    before: formatActivityValue(change.before, field),
    after: formatActivityValue(change.after, field),
    change,
  }));
}
