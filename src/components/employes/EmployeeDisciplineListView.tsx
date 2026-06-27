"use client";

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DISCIPLINARY_TYPE_CONFIG } from "@/lib/disciplinary";
import type { DisciplineListRow } from "@/lib/discipline-list";
import { cn, formatDate } from "@/lib/utils";

const STATUS_LABELS = {
  open: "Ouvert",
  closed: "Clôturé",
  appealed: "Contesté",
} as const;

const STATUS_CLASS = {
  open: "bg-amber-500/20 text-amber-600",
  closed: "bg-emerald-500/20 text-emerald-600",
  appealed: "bg-sky-500/20 text-sky-600",
} as const;

export function EmployeeDisciplineListView({
  rows,
  onOpenEmployee,
}: {
  rows: DisciplineListRow[];
  onOpenEmployee: (employeeId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-[var(--shell-text-muted)]">
        Aucune sanction enregistrée.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/40">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] text-[10px] uppercase tracking-wide text-[var(--shell-text-muted)]">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Employé</th>
            <th className="px-4 py-3">Département</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Motif</th>
            <th className="px-4 py-3">Faits</th>
            <th className="px-4 py-3">Émis par</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3 w-16" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ sanctionId, employee, record, sortDate }) => {
            const cfg = DISCIPLINARY_TYPE_CONFIG[record.type];
            return (
              <tr
                key={`${employee.id}-${sanctionId}`}
                className="border-t border-[var(--shell-border)]/60 hover:bg-[var(--shell-hover)]/40"
              >
                <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--shell-text-muted)]">
                  {formatDate(sortDate)}
                  {record.endDate && record.type === "suspension" && (
                    <span className="block text-[10px]">→ {formatDate(record.endDate)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--shell-text)]">
                    {employee.prenom} {employee.nom}
                  </p>
                  <p className="text-xs text-[var(--shell-text-muted)]">{employee.matricule}</p>
                </td>
                <td className="px-4 py-3 text-xs">{employee.department || "—"}</td>
                <td className="px-4 py-3">
                  <Badge className="text-[10px] bg-[var(--shell-surface)] text-[var(--shell-text)]">
                    {cfg.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="line-clamp-2 text-xs">{record.reason}</p>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="line-clamp-2 text-xs text-[var(--shell-text-muted)]">{record.facts}</p>
                </td>
                <td className="px-4 py-3 text-xs">{record.issuedBy || "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-[10px]", STATUS_CLASS[record.status])}>
                    {STATUS_LABELS[record.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenEmployee(employee.id)}
                    className="rounded-md p-1.5 text-sky-400 transition hover:bg-[var(--shell-hover)]"
                    title="Ouvrir le dossier"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
