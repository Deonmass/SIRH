"use client";

import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { EmployeeKindBadge } from "@/components/employees/EmployeeKindFields";
import { STATUS_LABELS } from "@/lib/constants";
import { employeeKindDetail } from "@/lib/employee-kind";
import { computeDossierProgressPercent, computeDossierTabCompletions } from "@/lib/employee-dossier-completion";
import { computeEmployeeTotalEmployeeCost } from "@/lib/employee-total-cost";
import type { AppSettings, Employee, JobPosition } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

export function EmployeeTableView({
  employees,
  settings,
  positions,
  onOpen,
  onMenuClick,
}: {
  employees: Employee[];
  settings: AppSettings;
  positions: JobPosition[];
  onOpen: (employee: Employee) => void;
  onMenuClick?: (ev: React.MouseEvent, employee: Employee) => void;
}) {
  const { formatSalary, convertAmount } = useAppSettings();
  const positionById = new Map(positions.map((p) => [p.id, p]));

  return (
    <StickyTable className="max-h-[calc(100vh-220px)]">
      <StickyThead>
        <tr>
          <Th>Matricule</Th>
          <Th>Nom complet</Th>
          <Th>Type</Th>
          <Th>Poste</Th>
          <Th>Département</Th>
          <Th>Statut</Th>
          <Th>Contrat</Th>
          <Th>Total employé</Th>
          <Th>Dossier</Th>
          <Th className="w-24"> </Th>
        </tr>
      </StickyThead>
      <tbody>
        {employees.map((e) => {
          const status = STATUS_LABELS[e.status];
          const position = e.positionId ? positionById.get(e.positionId) : undefined;
          const { totalEmployee, currency } = computeEmployeeTotalEmployeeCost(
            e,
            settings,
            convertAmount,
            position
          );
          const completions = computeDossierTabCompletions(e);
          const globalPct = computeDossierProgressPercent(completions);
          const docsDone = e.documents.filter((d) => d.required && d.received).length;
          const docsReq = e.documents.filter((d) => d.required).length;

          return (
            <tr
              key={e.id}
              className="cursor-pointer transition hover:bg-[var(--shell-hover)]"
              onClick={() => onOpen(e)}
            >
              <Td>
                <span className="font-mono text-xs text-[var(--shell-text-muted)]">{e.matricule}</span>
              </Td>
              <Td>
                <span className="font-medium text-[var(--shell-text)]">
                  {e.prenom} {e.postNom ? `${e.postNom} ` : ""}
                  {e.nom}
                </span>
              </Td>
              <Td>
                <EmployeeKindBadge
                  kind={e.employeeKind}
                  detail={employeeKindDetail(e, settings)}
                />
              </Td>
              <Td>{e.position || "—"}</Td>
              <Td>{e.department}</Td>
              <Td>
                <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
              </Td>
              <Td>{e.contractType}</Td>
              <Td className="font-medium text-sky-600 dark:text-sky-400">
                {formatSalary(totalEmployee, currency)}
              </Td>
              <Td>
                <span className="text-xs tabular-nums">{globalPct}%</span>
                <span className="ml-2 text-[10px] text-[var(--shell-text-muted)]">
                  Docs {docsDone}/{docsReq}
                </span>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onOpen(e);
                    }}
                    className="text-xs text-sky-500 hover:underline"
                  >
                    Dossier
                  </button>
                  {onMenuClick && (
                    <button
                      type="button"
                      aria-label="Actions employé"
                      title="Actions"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onMenuClick(ev, e);
                      }}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        "text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                      )}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </StickyTable>
  );
}
