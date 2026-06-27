import type { CentreDesCouts, Database } from "./types";
import type { EmployeeKind } from "./types";
import { centreDesCoutsLabel } from "@/lib/centre-des-couts-utils";
import {
  countFilledSlots,
  countVacantSlots,
  isVacantForListing,
  occupiedCount,
  plannedHeadcount,
  remainingSlots,
} from "./poste-headcount";

export interface PostesDashboardStats {
  total: number;
  activeWithAssignment: number;
  totalSlots: number;
  vacant: number;
  occupied: number;
  departmentCount: number;
  archived: number;
  interne: { total: number; totalSlots: number; vacant: number; occupied: number };
  externe: { total: number; totalSlots: number; vacant: number; occupied: number };
  centreDesCoutsCount: number;
  byDepartment: {
    department: string;
    total: number;
    totalSlots: number;
    vacant: number;
    occupied: number;
  }[];
  topVacant: {
    id: string;
    title: string;
    department: string;
    code: string;
    headcount: number;
    occupied: number;
    remaining: number;
  }[];
  byCentreDesCouts: {
    centreId: string | null;
    label: string;
    totalFiches: number;
    totalSlots: number;
    vacant: number;
    occupied: number;
  }[];
}

function posteKind(position: { typeEmp?: EmployeeKind | null }): EmployeeKind {
  return position.typeEmp ?? "interne";
}

function isInterneCategory(kind: EmployeeKind): boolean {
  return kind === "interne" || kind === "journalier";
}

function kindStats(
  positions: ReturnType<typeof filterActive>,
  employees: Database["employees"],
  mode: "interne" | "externe"
) {
  const subset = positions.filter((p) =>
    mode === "externe" ? posteKind(p) === "externe" : isInterneCategory(posteKind(p))
  );
  return {
    total: subset.length,
    totalSlots: subset.reduce((sum, p) => sum + plannedHeadcount(p), 0),
    occupied: countFilledSlots(subset, employees),
    vacant: countVacantSlots(subset, employees),
  };
}

function filterActive(positions: Database["positions"]) {
  return positions.filter((p) => p.status !== "archived" && p.status !== "draft");
}

export function buildPostesDashboard(
  db: Database,
  centresCouts: CentreDesCouts[] = []
): PostesDashboardStats {
  const { positions, employees } = db;
  const activePositions = filterActive(positions);
  const archived = positions.filter((p) => p.status === "archived").length;

  const totalSlots = activePositions.reduce((sum, p) => sum + plannedHeadcount(p), 0);
  const occupied = countFilledSlots(activePositions, employees);
  const vacant = countVacantSlots(activePositions, employees);
  const activeWithAssignment = activePositions.filter(
    (p) => occupiedCount(p, employees) > 0
  ).length;

  const deptMap = new Map<
    string,
    { total: number; totalSlots: number; vacant: number; occupied: number }
  >();
  activePositions.forEach((p) => {
    const entry = deptMap.get(p.department) ?? {
      total: 0,
      totalSlots: 0,
      vacant: 0,
      occupied: 0,
    };
    entry.total++;
    entry.totalSlots += plannedHeadcount(p);
    entry.occupied += occupiedCount(p, employees);
    entry.vacant += remainingSlots(p, employees);
    deptMap.set(p.department, entry);
  });

  const topVacant = activePositions
    .filter((p) => isVacantForListing(p, employees))
    .map((p) => ({
      id: p.id,
      title: p.title,
      department: p.department,
      code: p.code,
      headcount: plannedHeadcount(p),
      occupied: occupiedCount(p, employees),
      remaining: remainingSlots(p, employees),
    }))
    .sort((a, b) => {
      const aFull = a.occupied === 0 ? 0 : 1;
      const bFull = b.occupied === 0 ? 0 : 1;
      if (aFull !== bFull) return aFull - bFull;
      return b.remaining - a.remaining || a.title.localeCompare(b.title, "fr");
    })
    .slice(0, 8);

  const centreLabelById = new Map(centresCouts.map((c) => [c.id, centreDesCoutsLabel(c)]));
  const centreMap = new Map<
    string,
    { centreId: string | null; label: string; totalFiches: number; totalSlots: number; vacant: number; occupied: number }
  >();

  for (const p of activePositions) {
    const key = p.centreDesCoutsId ?? "__none__";
    const label = p.centreDesCoutsId
      ? centreLabelById.get(p.centreDesCoutsId) ?? `Centre #${p.centreDesCoutsId}`
      : "Sans centre de coûts";
    const entry = centreMap.get(key) ?? {
      centreId: p.centreDesCoutsId ?? null,
      label,
      totalFiches: 0,
      totalSlots: 0,
      vacant: 0,
      occupied: 0,
    };
    entry.totalFiches++;
    entry.totalSlots += plannedHeadcount(p);
    entry.occupied += occupiedCount(p, employees);
    entry.vacant += remainingSlots(p, employees);
    centreMap.set(key, entry);
  }

  const byCentreDesCouts = [...centreMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fr")
  );

  return {
    total: activePositions.length,
    activeWithAssignment,
    totalSlots,
    vacant,
    occupied,
    departmentCount: deptMap.size,
    archived,
    interne: kindStats(activePositions, employees, "interne"),
    externe: kindStats(activePositions, employees, "externe"),
    centreDesCoutsCount: byCentreDesCouts.length,
    byDepartment: [...deptMap.entries()]
      .map(([department, stats]) => ({ department, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
    topVacant,
    byCentreDesCouts,
  };
}
