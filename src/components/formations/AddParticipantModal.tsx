"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Employee, FormationParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function employeeToParticipant(employee: Employee): FormationParticipant {
  return {
    employe_id: employee.id,
    matricule: employee.matricule,
    nom: employee.nom,
    prenom: employee.prenom,
    departement: employee.department || "—",
    cote: null,
    point_a_atteindre: null,
  };
}

export function AddParticipantModal({
  employees,
  existingIds,
  onAdd,
  onClose,
}: {
  employees: Employee[];
  existingIds: Set<string>;
  onAdd: (participant: FormationParticipant) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.filter(
      (e) => !existingIds.has(e.id) && !["sorti", "licencie"].includes(e.status)
    );
    if (!q) return list.slice(0, 40);
    return list
      .filter(
        (e) =>
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [employees, existingIds, search]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--shell-border)] px-4 py-3">
          <h4 className="font-semibold">Ajouter un participant</h4>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--shell-surface)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-[var(--shell-border)] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              className="input w-full pl-9"
              placeholder="Rechercher par nom, matricule, département…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--shell-text-muted)]">
              Aucun employé trouvé.
            </li>
          ) : (
            filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(employeeToParticipant(e));
                    onClose();
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--shell-surface)]"
                  )}
                >
                  <span className="font-medium">
                    {e.prenom} {e.nom}
                  </span>
                  <span className="ml-2 text-xs text-[var(--shell-text-muted)]">
                    {e.matricule} · {e.department || "—"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
