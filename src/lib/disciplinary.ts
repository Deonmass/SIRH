import type { DisciplinaryRecord, DisciplinaryType, Employee, EmployeeStatus } from "./types";

export const DISCIPLINARY_TYPE_CONFIG: Record<
  DisciplinaryType,
  {
    label: string;
    legalRef: string;
    severity: 1 | 2 | 3 | 4 | 5;
    countsAsWarning: boolean;
    maxDaysSuspension?: number;
    suggestedStatus?: EmployeeStatus;
  }
> = {
  verbal_warning: {
    label: "Avertissement verbal",
    legalRef: "Art. 54 — Code du travail",
    severity: 1,
    countsAsWarning: true,
  },
  written_warning: {
    label: "Avertissement écrit",
    legalRef: "Art. 54 — Code du travail",
    severity: 2,
    countsAsWarning: true,
  },
  blame: {
    label: "Blâme",
    legalRef: "Art. 54 — Code du travail",
    severity: 3,
    countsAsWarning: true,
  },
  suspension: {
    label: "Mise à pied",
    legalRef: "Art. 54, 57 — max. 2 × 15 j/an",
    severity: 4,
    countsAsWarning: false,
    maxDaysSuspension: 15,
    suggestedStatus: "suspendu",
  },
  demotion: {
    label: "Rétrogradation",
    legalRef: "Art. 54 — Code du travail",
    severity: 4,
    countsAsWarning: false,
  },
  dismissal_procedure: {
    label: "Procédure de licenciement",
    legalRef: "Art. 54, 63, 72 — faute / motif sérieux",
    severity: 5,
    countsAsWarning: false,
    suggestedStatus: "preavis",
  },
  other: {
    label: "Autre mesure",
    legalRef: "Art. 54",
    severity: 2,
    countsAsWarning: false,
  },
};

export function countDisciplinaryWarnings(records: DisciplinaryRecord[]): number {
  return records.filter(
    (r) => r.status !== "appealed" && DISCIPLINARY_TYPE_CONFIG[r.type].countsAsWarning
  ).length;
}

export function getActiveSuspension(
  records: DisciplinaryRecord[],
  asOf = new Date()
): DisciplinaryRecord | null {
  const now = asOf.getTime();
  return (
    records.find((r) => {
      if (r.type !== "suspension" || r.status === "closed" || r.status === "appealed") {
        return false;
      }
      const start = new Date(r.effectiveDate ?? r.date).getTime();
      const end = r.endDate ? new Date(r.endDate).getTime() : start;
      return now >= start && now <= end + 86400000;
    }) ?? null
  );
}

export function suspensionDaysUsedThisYear(records: DisciplinaryRecord[], year?: number): number {
  const y = year ?? new Date().getFullYear();
  return records
    .filter((r) => r.type === "suspension" && r.status !== "appealed")
    .filter((r) => new Date(r.date).getFullYear() === y)
    .reduce((sum, r) => {
      if (!r.endDate) return sum + 1;
      const start = new Date(r.effectiveDate ?? r.date);
      const end = new Date(r.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
      return sum + Math.max(0, days);
    }, 0);
}

export interface DisciplinarySummary {
  total: number;
  warnings: number;
  openCount: number;
  activeSuspension: DisciplinaryRecord | null;
  suspensionDaysUsed: number;
  escalationLevel: "none" | "watch" | "formal" | "critical";
  recommendation?: string;
}

export function getDisciplinarySummary(records: DisciplinaryRecord[]): DisciplinarySummary {
  const warnings = countDisciplinaryWarnings(records);
  const openCount = records.filter((r) => r.status === "open").length;
  const activeSuspension = getActiveSuspension(records);
  const suspensionDaysUsed = suspensionDaysUsedThisYear(records);

  let escalationLevel: DisciplinarySummary["escalationLevel"] = "none";
  let recommendation: string | undefined;

  if (warnings >= 3 || records.some((r) => r.type === "dismissal_procedure" && r.status === "open")) {
    escalationLevel = "critical";
    recommendation =
      "3 avertissements ou procédure ouverte : convocation, PV disciplinaire, avis juridique avant rupture.";
  } else if (warnings >= 2) {
    escalationLevel = "formal";
    recommendation = "2e avertissement : lettre motivée, délai de réponse, archivage dossier discipline.";
  } else if (warnings >= 1 || openCount > 0) {
    escalationLevel = "watch";
    recommendation = "Suivi RH : entretien, plan d'amélioration, pièces jointes au dossier.";
  }

  if (suspensionDaysUsed >= 30) {
    recommendation =
      "Plafond annuel de mise à pied (2 × 15 j) atteint ou dépassé — vérifier Art. 57.";
    escalationLevel = "critical";
  }

  return {
    total: records.length,
    warnings,
    openCount,
    activeSuspension,
    suspensionDaysUsed,
    escalationLevel,
    recommendation,
  };
}

export function syncEmployeeDisciplinaryState(
  employee: Employee,
  records: DisciplinaryRecord[]
): Pick<Employee, "disciplinaryRecords" | "warningsCount" | "status"> {
  const warningsCount = countDisciplinaryWarnings(records);
  const activeSuspension = getActiveSuspension(records);
  let status = employee.status;

  if (activeSuspension && status === "actif") {
    status = "suspendu";
  }

  return { disciplinaryRecords: records, warningsCount, status };
}

export function createDisciplinaryRecord(
  partial: Omit<DisciplinaryRecord, "id" | "severity"> & { severity?: number }
): DisciplinaryRecord {
  const config = DISCIPLINARY_TYPE_CONFIG[partial.type];
  return {
    ...partial,
    id: crypto.randomUUID(),
    severity: (partial.severity as DisciplinaryRecord["severity"]) ?? config.severity,
    status: partial.status ?? "open",
    acknowledged: partial.acknowledged ?? false,
  };
}
