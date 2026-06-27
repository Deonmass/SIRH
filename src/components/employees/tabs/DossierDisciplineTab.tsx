"use client";

import { Trash2 } from "lucide-react";
import { DisciplinaryEditor } from "../DisciplinaryEditor";
import { HistoryTableView, PanelCard } from "../DossierDataViews";
import {
  DISCIPLINARY_TYPE_CONFIG,
  syncEmployeeDisciplinaryState,
} from "@/lib/disciplinary";
import type { DisciplinaryRecord, Employee } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function DossierDisciplineTab({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (data: Pick<Employee, "disciplinaryRecords" | "warningsCount" | "status">) => void;
}) {
  const records = employee.disciplinaryRecords ?? [];

  function persist(nextRecords: DisciplinaryRecord[]) {
    onSave(syncEmployeeDisciplinaryState(employee, nextRecords));
  }

  function updateStatus(id: string, status: DisciplinaryRecord["status"]) {
    persist(
      records.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              acknowledged: status === "closed" ? true : r.acknowledged,
              acknowledgedAt:
                status === "closed" && !r.acknowledgedAt
                  ? new Date().toISOString()
                  : r.acknowledgedAt,
            }
          : r
      )
    );
  }

  function removeRecord(id: string) {
    persist(records.filter((r) => r.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelCard title="Formulaire discipline">
        <DisciplinaryEditor employee={employee} onSave={onSave} variant="formOnly" />
      </PanelCard>

      <PanelCard title="Historique des sanctions">
        {records.length === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">
            Aucune sanction enregistrée. Utilisez « Enregistrer » dans le formulaire pour ajouter une
            mesure.
          </p>
        ) : (
          <HistoryTableView
            columns={[
              { key: "date", label: "Date" },
              { key: "type", label: "Type" },
              { key: "motif", label: "Motif" },
              { key: "statut", label: "Statut" },
              { key: "act", label: "" },
            ]}
            rows={records.map((r) => {
              const cfg = DISCIPLINARY_TYPE_CONFIG[r.type];
              return {
                id: r.id,
                cells: [
                  formatDate(r.date),
                  cfg.label,
                  <span key="m" className="line-clamp-2 max-w-[200px]">
                    {r.reason}
                  </span>,
                  <select
                    key="s"
                    value={r.status}
                    onChange={(e) =>
                      updateStatus(r.id, e.target.value as DisciplinaryRecord["status"])
                    }
                    className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-input-bg)] px-2 py-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="open">Ouvert</option>
                    <option value="closed">Clôturé</option>
                    <option value="appealed">Contesté</option>
                  </select>,
                  <button
                    key="d"
                    type="button"
                    onClick={() => removeRecord(r.id)}
                    className="rounded p-1 text-red-400 hover:bg-red-500/10"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>,
                ],
              };
            })}
          />
        )}
      </PanelCard>
    </div>
  );
}
