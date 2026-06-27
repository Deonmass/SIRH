import type {
  DbEmployeMouvementJson,
  DbMouvementJsonEntry,
  DbOvertimeMonthlyEntryJson,
} from "../../../../database/migrations/006_employes_mouvement.types";
import { EMPTY_EMPLOYE_MOUVEMENT_JSON } from "../../../../database/migrations/006_employes_mouvement.types";
import { TYPE_MOUVEMENT_LABELS } from "../../../../database/migrations/004_mouvements.types";
import type { DbTypeMouvement } from "../../../../database/migrations/004_mouvements.types";
import { parseMovementAttachments } from "@/lib/movement-attachments";
import type { Employee, EmployeeExtraCosts, JobPosition, Movement } from "@/lib/types";
import type { DbEmployeExtraCostsJson } from "../../../../database/migrations/006_employes_mouvement.types";

function parseMovementExtraCosts(raw: unknown): EmployeeExtraCosts | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as DbEmployeExtraCostsJson;
  const total =
    (Number(o.housing) || 0) +
    (Number(o.mileage) || 0) +
    (Number(o.childrenEducation) || 0) +
    (Number(o.travel) || 0) +
    (Number(o.variables) || 0);
  if (total <= 0) return undefined;
  return {
    housing: Number(o.housing) || 0,
    mileage: Number(o.mileage) || 0,
    childrenEducation: Number(o.childrenEducation) || 0,
    travel: Number(o.travel) || 0,
    variables: Number(o.variables) || 0,
    currency: o.currency === "CDF" ? "CDF" : "USD",
  };
}

function movementExtraCostsToJson(costs?: EmployeeExtraCosts): DbEmployeExtraCostsJson | null {
  if (!costs) return null;
  const total =
    costs.housing + costs.mileage + costs.childrenEducation + costs.travel + costs.variables;
  if (total <= 0) return null;
  return {
    housing: costs.housing,
    mileage: costs.mileage,
    childrenEducation: costs.childrenEducation,
    travel: costs.travel,
    variables: costs.variables,
    currency: costs.currency,
  };
}

export function parseEmployeMouvementJson(
  raw: unknown
): DbEmployeMouvementJson {
  if (!raw) return { historique: [] };
  if (Array.isArray(raw)) {
    return { historique: raw as DbMouvementJsonEntry[] };
  }
  if (typeof raw === "object" && raw !== null && "historique" in raw) {
    const parsed = raw as DbEmployeMouvementJson;
    return {
      historique: Array.isArray(parsed.historique) ? parsed.historique : [],
      couts_extra: parsed.couts_extra ?? null,
      heures_sup_mensuelles: Array.isArray(parsed.heures_sup_mensuelles)
        ? parsed.heures_sup_mensuelles
        : undefined,
    };
  }
  return { historique: [] };
}

export function parseExtraCostsFromMouvementJson(raw: unknown): EmployeeExtraCosts | undefined {
  return parseMovementExtraCosts(raw);
}

export function extraCostsToMouvementJson(costs?: EmployeeExtraCosts): DbEmployeExtraCostsJson | null {
  return movementExtraCostsToJson(costs);
}

export function sortMovementsDesc(movements: Movement[]): Movement[] {
  return [...movements].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return (b.updatedAt ?? b.createdAt ?? "").localeCompare(
      a.updatedAt ?? a.createdAt ?? ""
    );
  });
}

export function jsonEntryToMovement(entry: DbMouvementJsonEntry, employeeId: string): Movement {
  return {
    id: entry.id,
    employeeId,
    code: entry.code_mouvement,
    type: entry.type_mouvement,
    date: entry.date_mouvement,
    effectiveDate: entry.effective_date ?? entry.date_mouvement,
    positionCode: entry.code_poste,
    documentAnnexe: entry.document_annexe,
    documentAnnexes: parseMovementAttachments(entry.document_annexe),
    reason: entry.motif || TYPE_MOUVEMENT_LABELS[entry.type_mouvement as DbTypeMouvement],
    legalBasis: entry.legal_basis ?? undefined,
    approvedBy: entry.approved_by ?? undefined,
    fromPosition: entry.from_position ?? undefined,
    toPosition: entry.to_position ?? undefined,
    fromDepartment: entry.from_department ?? undefined,
    toDepartment: entry.to_department ?? undefined,
    fromSalary: entry.from_salary ?? undefined,
    toSalary: entry.to_salary ?? undefined,
    extraCosts: parseMovementExtraCosts(entry.couts_extra),
    createdAt: entry.cree_le,
    updatedAt: entry.modif_le,
    createdBy: entry.cree_par,
    updatedBy: entry.modif_par,
  };
}

export function movementToJsonEntry(movement: Movement): DbMouvementJsonEntry {
  const now = new Date().toISOString();
  return {
    id: movement.id,
    code_mouvement: movement.code ?? movement.id,
    type_mouvement: movement.type,
    date_mouvement: movement.date,
    code_poste: movement.positionCode ?? null,
    document_annexe: movement.documentAnnexe ?? null,
    motif: movement.reason,
    legal_basis: movement.legalBasis ?? null,
    approved_by: movement.approvedBy ?? null,
    from_position: movement.fromPosition ?? null,
    to_position: movement.toPosition ?? null,
    from_department: movement.fromDepartment ?? null,
    to_department: movement.toDepartment ?? null,
    from_salary: movement.fromSalary ?? null,
    to_salary: movement.toSalary ?? null,
    effective_date: movement.effectiveDate ?? movement.date,
    couts_extra: movementExtraCostsToJson(movement.extraCosts),
    cree_le: movement.createdAt ?? now,
    cree_par: movement.createdBy ?? null,
    modif_le: movement.updatedAt ?? now,
    modif_par: movement.updatedBy ?? null,
  };
}

export function movementsToEmployeMouvementJson(
  movements: Movement[],
  currentExtraCosts?: EmployeeExtraCosts,
  opts?: { heures_sup_mensuelles?: DbOvertimeMonthlyEntryJson[] }
): DbEmployeMouvementJson {
  const rootExtras =
    movementExtraCostsToJson(currentExtraCosts) ??
    movementExtraCostsToJson(
      sortMovementsDesc(movements).find((m) => m.extraCosts)?.extraCosts
    );
  return {
    historique: sortMovementsDesc(movements).map(movementToJsonEntry),
    ...(rootExtras ? { couts_extra: rootExtras } : {}),
    ...(opts?.heures_sup_mensuelles?.length
      ? { heures_sup_mensuelles: opts.heures_sup_mensuelles }
      : {}),
  };
}

export function employeMouvementJsonToMovements(
  raw: unknown,
  employeeId: string
): Movement[] {
  const parsed = parseEmployeMouvementJson(raw);
  return sortMovementsDesc(
    parsed.historique.map((entry) => jsonEntryToMovement(entry, employeeId))
  );
}

/** Dernier mouvement chronologique (poste actuel si code_poste présent). */
export function latestMovement(movements: Movement[]): Movement | null {
  return sortMovementsDesc(movements)[0] ?? null;
}

export function applyPosteFromLatestMovement(
  employee: Employee,
  positions: JobPosition[]
): Employee {
  const latest = latestMovement(employee.movements ?? []);
  if (!latest) {
    return employee;
  }

  if (latest.type === "desaffectation") {
    return {
      ...employee,
      positionId: null,
      position: "",
    };
  }

  if (!latest.positionCode) {
    return {
      ...employee,
      position: latest.toPosition ?? employee.position,
      department: latest.toDepartment ?? employee.department,
      salary:
        latest.toSalary != null
          ? { ...employee.salary, baseSalary: latest.toSalary }
          : employee.salary,
    };
  }

  const pos = positions.find((p) => p.code === latest.positionCode);
  if (!pos) {
    return {
      ...employee,
      positionId: null,
      position: latest.toPosition ?? employee.position,
      department: latest.toDepartment ?? employee.department,
    };
  }

  return {
    ...employee,
    positionId: pos.id,
    position: latest.toPosition ?? pos.title,
    department: latest.toDepartment ?? pos.department,
    grade: pos.grade,
    salary:
      latest.toSalary != null
        ? {
            ...employee.salary,
            baseSalary: latest.toSalary,
            currency: pos.payroll.currency,
            category: pos.payroll.category,
          }
        : {
            ...employee.salary,
            baseSalary: pos.payroll.baseSalary,
            currency: pos.payroll.currency,
            category: pos.payroll.category,
          },
  };
}

export function nextMouvementCodeFromHistorique(
  rows: { mouvement?: unknown }[]
): string {
  const year = new Date().getFullYear();
  const prefix = `MVT-RH-${year}-`;
  let max = 0;
  for (const row of rows) {
    const { historique } = parseEmployeMouvementJson(row.mouvement);
    for (const entry of historique) {
      const code = entry.code_mouvement;
      if (code?.startsWith(prefix)) {
        const n = Number.parseInt(code.slice(prefix.length), 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export { EMPTY_EMPLOYE_MOUVEMENT_JSON };
