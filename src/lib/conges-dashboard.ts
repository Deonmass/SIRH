import { LEAVE_TYPE_LABELS } from "./employee-dossier";
import type { CongeWithEmployee, Employee, LeaveRequestStatus, LeaveType } from "./types";

export type CongesMonthlyPoint = {
  month: string;
  monthKey: string;
  enConge: number;
  demandes: number;
  approuves: number;
};

export type CongesDeptAgentLeave = {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveRequestStatus;
};

export type CongesDeptAgent = {
  employeeId: string;
  employeeName: string;
  matricule: string;
  leaves: CongesDeptAgentLeave[];
};

export type CongesDeptRow = {
  department: string;
  count: number;
  onLeave: number;
  agents: CongesDeptAgent[];
};

export type CongesTypeRow = {
  type: LeaveType;
  label: string;
  count: number;
  days: number;
};

export type CongesCalendarDay = {
  date: string;
  leaves: { id: string; employeeName: string; type: LeaveType; status: LeaveRequestStatus }[];
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function overlapsMonth(c: CongeWithEmployee, year: number, month: number): boolean {
  const start = new Date(`${c.startDate}T12:00:00`);
  const end = new Date(`${c.endDate}T12:00:00`);
  const mStart = new Date(year, month, 1);
  const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
  return start <= mEnd && end >= mStart;
}

function dateInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function computeCongesDashboard(
  conges: CongeWithEmployee[],
  employees: Employee[],
  year: number,
  month: number
) {
  const activeStatuses: LeaveRequestStatus[] = [
    "demande",
    "validation_1",
    "validation_2",
    "approuve",
    "termine",
  ];
  const inMonth = conges.filter(
    (c) => activeStatuses.includes(c.status) && overlapsMonth(c, year, month)
  );

  const monthlyTrend: CongesMonthlyPoint[] = Array.from({ length: 12 }, (_, m) => {
    const key = monthKey(year, m);
    const monthLeaves = conges.filter(
      (c) => activeStatuses.includes(c.status) && overlapsMonth(c, year, m)
    );
    const uniqueAgents = new Set(monthLeaves.map((c) => c.matriculeEmploye));
    return {
      month: MONTH_LABELS[m]!,
      monthKey: key,
      enConge: uniqueAgents.size,
      demandes: monthLeaves.filter((c) => c.status === "demande").length,
      approuves: monthLeaves.filter((c) => c.status === "approuve").length,
    };
  });

  const deptMap = new Map<
    string,
    { count: number; onLeave: number; agents: Map<string, CongesDeptAgent> }
  >();

  employees
    .filter((e) => !["sorti", "licencie"].includes(e.status))
    .forEach((e) => {
      const dept = e.department || "Non affecté";
      const cur = deptMap.get(dept) ?? { count: 0, onLeave: 0, agents: new Map() };
      cur.count++;
      deptMap.set(dept, cur);
    });

  inMonth.forEach((c) => {
    const dept = c.department || "Non affecté";
    const cur = deptMap.get(dept) ?? { count: 0, onLeave: 0, agents: new Map() };
    if (!["refuse"].includes(c.status)) {
      cur.onLeave++;
      const key = c.employeeId ?? c.matriculeEmploye;
      const agent =
        cur.agents.get(key) ??
        ({
          employeeId: c.employeeId ?? "",
          employeeName: c.employeeName ?? c.matriculeEmploye,
          matricule: c.matriculeEmploye,
          leaves: [],
        } satisfies CongesDeptAgent);
      agent.leaves.push({
        id: c.id,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        days: c.days,
        status: c.status,
      });
      cur.agents.set(key, agent);
    }
    deptMap.set(dept, cur);
  });

  const byDepartment: CongesDeptRow[] = Array.from(deptMap.entries())
    .map(([department, v]) => ({
      department,
      count: v.count,
      onLeave: v.onLeave,
      agents: Array.from(v.agents.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName, "fr")
      ),
    }))
    .sort((a, b) => b.count - a.count);

  const typeMap = new Map<LeaveType, { count: number; days: number }>();
  inMonth.forEach((c) => {
    const cur = typeMap.get(c.type) ?? { count: 0, days: 0 };
    cur.count++;
    cur.days += c.days;
    typeMap.set(c.type, cur);
  });

  const byType: CongesTypeRow[] = (Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => {
    const v = typeMap.get(type) ?? { count: 0, days: 0 };
    return { type, label: LEAVE_TYPE_LABELS[type], count: v.count, days: v.days };
  });

  const calYear = year;
  const calMonth = month;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarDays: CongesCalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const leaves = conges
      .filter(
        (c) =>
          activeStatuses.includes(c.status) &&
          dateInRange(iso, c.startDate, c.endDate)
      )
      .map((c) => ({
        id: c.id,
        employeeName: c.employeeName ?? c.matriculeEmploye,
        type: c.type,
        status: c.status,
      }));
    calendarDays.push({ date: iso, leaves });
  }

  return { monthlyTrend, byDepartment, byType, calendarDays };
}
