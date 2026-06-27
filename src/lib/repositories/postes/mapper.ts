import type {
  DbPosteRow,
  PostePaieAvantageJson,
  PostePaieJson,
} from "../../../../database/migrations/001_postes.types";
import { centreDesCoutsIdFromApp } from "@/lib/repositories/centre-des-couts/mapper";
import type { Allowance, Employee, JobPosition, JobPositionPayroll } from "@/lib/types";

export function posteIdToApp(id: number): string {
  return String(id);
}

export function posteIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant de poste invalide : ${id}`);
  }
  return n;
}

export type PosteCodeMaps = {
  codeToId: Map<string, string>;
  idToCode: Map<string, string>;
};

export function buildCodeMaps(rows: DbPosteRow[]): PosteCodeMaps {
  const codeToId = new Map<string, string>();
  const idToCode = new Map<string, string>();
  for (const row of rows) {
    const appId = posteIdToApp(row.id);
    codeToId.set(row.code, appId);
    idToCode.set(appId, row.code);
  }
  return { codeToId, idToCode };
}

function avantageToAllowance(a: PostePaieAvantageJson, index: number): Allowance {
  return {
    id: `av-${index}-${a.type}`,
    type: a.type as Allowance["type"],
    label: a.lib,
    amount: a.montant,
    currency: a.devise,
    taxable: a.impos,
    cotisable: a.cotis,
    startDate: a.deb,
    endDate: a.fin,
  };
}

function allowanceToAvantage(a: Allowance): PostePaieAvantageJson {
  return {
    type: a.type,
    lib: a.label,
    montant: a.amount,
    devise: a.currency,
    impos: a.taxable,
    cotis: a.cotisable,
    deb: a.startDate,
    fin: a.endDate,
  };
}

export function paieFromJson(json: PostePaieJson | Record<string, unknown>): JobPositionPayroll {
  const j = json as PostePaieJson;
  return {
    baseSalary: j.base ?? 0,
    currency: j.devise ?? "CDF",
    category: j.categ ?? 3,
    smigGrade: j.smig_grade,
    smigCategory: j.smig_cat,
    dailyBaseSalary: j.base_j,
    housingAllowance: j.logem,
    transportDaily: j.trans_j,
    unionMember: j.syndic,
    payrollNotes: j.notes ?? "",
    daysPresent: j.j_pres,
    daysSick: j.j_mal,
    daysAnnualLeave: j.j_ca,
    daysHoliday: j.j_fer,
    dependents: j.charges,
    otherDeductions: j.autre_ret,
    allowances: (j.avantages ?? []).map(avantageToAllowance),
  };
}

export function paieToJson(payroll: JobPositionPayroll): PostePaieJson {
  const json: PostePaieJson = {
    base: payroll.baseSalary,
    devise: payroll.currency,
    categ: payroll.smigGrade ?? payroll.category,
    avantages: payroll.allowances.map(allowanceToAvantage),
  };
  if (payroll.dailyBaseSalary != null) json.base_j = payroll.dailyBaseSalary;
  if (payroll.smigGrade != null) json.smig_grade = payroll.smigGrade;
  if (payroll.smigCategory) json.smig_cat = payroll.smigCategory;
  if (payroll.housingAllowance != null) json.logem = payroll.housingAllowance;
  if (payroll.transportDaily != null) json.trans_j = payroll.transportDaily;
  if (payroll.unionMember != null) json.syndic = payroll.unionMember;
  if (payroll.payrollNotes != null && payroll.payrollNotes !== "") json.notes = payroll.payrollNotes;
  if (payroll.daysPresent != null) json.j_pres = payroll.daysPresent;
  if (payroll.daysSick != null) json.j_mal = payroll.daysSick;
  if (payroll.daysAnnualLeave != null) json.j_ca = payroll.daysAnnualLeave;
  if (payroll.daysHoliday != null) json.j_fer = payroll.daysHoliday;
  if (payroll.dependents != null) json.charges = payroll.dependents;
  if (payroll.otherDeductions != null) json.autre_ret = payroll.otherDeductions;
  return json;
}

export function rowToJobPosition(row: DbPosteRow, maps: PosteCodeMaps): JobPosition {
  const id = posteIdToApp(row.id);
  return {
    id,
    code: row.code,
    title: row.titre,
    department: row.dept,
    grade: row.grade,
    reportsToId: row.sup_code ? maps.codeToId.get(row.sup_code) ?? null : null,
    status: row.statut,
    contractType: row.type_contrat,
    typeEmp: row.type_emp ?? "interne",
    centreDesCoutsId: row.centre_des_couts != null ? String(row.centre_des_couts) : null,
    location: row.lieu_affectation ?? undefined,
    headcount: row.effectif,
    description: row.description,
    missions: row.missions,
    requirements: row.exigences,
    competencies: row.competences_cles,
    kpi: row.kpi ?? undefined,
    employeeId: null,
    payroll: paieFromJson(row.poste_paie),
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}

export function jobPositionToRow(
  position: JobPosition,
  maps: PosteCodeMaps
): Omit<DbPosteRow, "id" | "cree_le" | "modif_le" | "cree_par" | "modif_par"> {
  const supCode = position.reportsToId
    ? maps.idToCode.get(position.reportsToId) ?? null
    : null;

  const row = {
    code: position.code,
    titre: position.title,
    dept: position.department,
    grade: position.grade,
    sup_code: supCode,
    statut: position.status,
    type_contrat: position.contractType,
    type_emp: position.typeEmp ?? "interne",
    lieu_affectation: position.location ?? null,
    effectif: position.headcount,
    description: position.description,
    missions: position.missions,
    exigences: position.requirements,
    competences_cles: position.competencies,
    kpi: position.kpi ?? null,
    poste_paie: paieToJson(position.payroll),
  } as Omit<DbPosteRow, "id" | "cree_le" | "modif_le" | "cree_par" | "modif_par">;

  if (position.centreDesCoutsId) {
    row.centre_des_couts = centreDesCoutsIdFromApp(position.centreDesCoutsId);
  }

  return row;
}

export function attachEmployeeIds(
  positions: JobPosition[],
  employees: Employee[]
): JobPosition[] {
  const occupantsByPosteId = new Map<string, Employee[]>();
  for (const employee of employees) {
    if (employee.positionId) {
      const list = occupantsByPosteId.get(employee.positionId) ?? [];
      list.push(employee);
      occupantsByPosteId.set(employee.positionId, list);
    }
  }

  return positions.map((position) => {
    const occupants = occupantsByPosteId.get(position.id) ?? [];
    const employeeId = occupants[0]?.id ?? position.employeeId ?? null;
    const planned = Math.max(1, position.headcount ?? 1);
    let status = position.status;
    if (status !== "archived" && status !== "draft") {
      if (occupants.length === 0) status = "vacant";
      else if (occupants.length >= planned) status = "active";
      else status = "active";
    }
    return { ...position, employeeId, status };
  });
}

/** Résout l'employé affiché sur un poste (id poste ou lien positionId). */
export function employeeOccupyingPosition(
  position: JobPosition,
  employees: Employee[],
  empById?: Map<string, Employee>
): Employee | null {
  if (position.employeeId) {
    const hit =
      empById?.get(position.employeeId) ??
      employees.find((e) => e.id === position.employeeId);
    if (hit) return hit;
  }
  return employees.find((e) => e.positionId === position.id) ?? null;
}

/** Lie positionId depuis la fiche poste (employeeId) si pas déjà résolu par mouvement. */
export function applyPositionLinkFromPostes(
  employee: Employee,
  positions: JobPosition[]
): Employee {
  if (employee.positionId) return employee;

  const pos = positions.find((p) => p.employeeId === employee.id);
  if (!pos) return employee;

  return {
    ...employee,
    positionId: pos.id,
    position: pos.title,
    department: pos.department,
    grade: pos.grade,
    category: pos.payroll.category,
    salary: {
      ...employee.salary,
      baseSalary: pos.payroll.baseSalary,
      currency: pos.payroll.currency,
      category: pos.payroll.category,
    },
  };
}

export function normalizePositionStatus(position: JobPosition): JobPosition {
  const next = { ...position };
  if (!next.employeeId) {
    next.employeeId = null;
    if (next.status !== "archived" && next.status !== "draft") {
      next.status = "vacant";
    }
  } else if (next.status === "vacant") {
    next.status = "active";
  }
  return next;
}
