"use client";

import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { Badge } from "@/components/ui/Badge";
import { StickyTable, StickyThead, Th, Td } from "@/components/layout/StickyTable";
import { STATUS_LABELS } from "@/lib/constants";
import type { Employee } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { calculatePayroll } from "@/lib/payroll";
import type { AppSettings } from "@/lib/types";

export function DepartmentTable({
  employees,
  department,
  settings,
}: {
  employees: Employee[];
  department: string;
  settings: AppSettings;
}) {
  const { formatSalary } = useAppSettings();
  const deptEmployees = employees.filter((e) => e.department === department);

  return (
    <StickyTable>
      <StickyThead>
        <tr>
          <Th>Matricule</Th>
          <Th>Nom complet</Th>
          <Th>Poste</Th>
          <Th>Grade</Th>
          <Th>Cat.</Th>
          <Th>Statut</Th>
          <Th>CNSS</Th>
          <Th>Net / mois</Th>
          <Th>Action</Th>
        </tr>
      </StickyThead>
      <tbody>
        {deptEmployees.map((e) => {
          const payroll = calculatePayroll(e.salary, settings, 0, {
            dependents: e.family.filter((m) => m.aCharge).length,
          });
          const status = STATUS_LABELS[e.status];
          return (
            <tr key={e.id} className="hover:bg-white/[0.02]">
              <Td className="font-mono text-xs">{e.matricule}</Td>
              <Td>
                <span className="font-medium text-white">
                  {e.prenom} {e.nom}
                </span>
              </Td>
              <Td>{e.position}</Td>
              <Td className="text-xs">{e.grade}</Td>
              <Td>{e.category}</Td>
              <Td>
                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
              </Td>
              <Td className="text-xs font-mono">{e.numeroCnss ?? "—"}</Td>
              <Td>{formatSalary(payroll.netSalary, e.salary.currency)}</Td>
              <Td>
                <Link href={employeeDossierHref(e.id)} className="text-sky-400 hover:underline text-xs">
                  Dossier
                </Link>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </StickyTable>
  );
}
