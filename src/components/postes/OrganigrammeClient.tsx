"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import {
  DepartmentOrganigramModal,
  DEPT_CARD_TONES,
  groupPositionsByDepartment,
} from "@/components/postes/DepartmentOrganigramCard";
import { DashboardMetricsRow, MetricCard, type MetricTone } from "@/components/dashboard/DashboardMetricsRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { attachEmployeeIds } from "@/lib/poste-linking";
import { countFilledSlots, countVacantSlots } from "@/lib/poste-headcount";
import type { Employee, JobPosition } from "@/lib/types";

export function OrganigrammeClient({
  positions: initialPositions,
  employees,
  initialDepartment,
}: {
  positions: JobPosition[];
  employees: Employee[];
  initialDepartment?: string | null;
}) {
  const [positions, setPositions] = useState(initialPositions);
  const [openDepartment, setOpenDepartment] = useState<string | null>(null);

  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  const linkedPositions = useMemo(
    () => attachEmployeeIds(positions, employees),
    [positions, employees]
  );

  const byDepartment = useMemo(
    () => groupPositionsByDepartment(linkedPositions),
    [linkedPositions]
  );

  useEffect(() => {
    if (!initialDepartment) return;
    const match = byDepartment.find(([dept]) => dept === initialDepartment);
    if (match) setOpenDepartment(match[0]);
  }, [initialDepartment, byDepartment]);

  const empById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const positionsByDept = useMemo(
    () => new Map(byDepartment),
    [byDepartment]
  );

  const openPositions = openDepartment ? positionsByDept.get(openDepartment) : undefined;

  return (
    <>
      <PageHeader
        title="Organigramme"
        description="Cliquez sur un département, puis sur un poste pour le visualiser (clic droit pour plus d'actions)"
      />

      {byDepartment.length === 0 ? (
        <p className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] py-16 text-center text-[var(--shell-text-muted)]">
          Aucune fiche de poste. Créez des postes pour alimenter l&apos;organigramme.
        </p>
      ) : (
        <DashboardMetricsRow className="[grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
          {byDepartment.map(([department, deptPositions], index) => {
            const filled = countFilledSlots(deptPositions, employees);
            const vacant = countVacantSlots(deptPositions, employees);
            const tone = DEPT_CARD_TONES[index % DEPT_CARD_TONES.length] as MetricTone;

            return (
              <MetricCard
                key={department}
                tone={tone}
                icon={Building2}
                label={department}
                value={deptPositions.length}
                hint={`${filled} occupé(s) · ${vacant} vacant(s)`}
                className="min-h-[132px] !p-5"
                onClick={() => setOpenDepartment(department)}
              />
            );
          })}
        </DashboardMetricsRow>
      )}

      {openDepartment && openPositions && (
        <DepartmentOrganigramModal
          department={openDepartment}
          positions={openPositions}
          allPositions={linkedPositions}
          employees={employees}
          empById={empById}
          onClose={() => setOpenDepartment(null)}
          onPositionsChange={(next) =>
            setPositions(attachEmployeeIds(next.filter((p) => p.status !== "archived"), employees))
          }
        />
      )}
    </>
  );
}
