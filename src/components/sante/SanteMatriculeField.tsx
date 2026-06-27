"use client";

import { useEffect, useState } from "react";
import { MatriculeEmployeeField } from "@/components/utilisateurs/MatriculeEmployeeField";
import type { Employee } from "@/lib/types";

export function SanteMatriculeField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (matricule: string) => void;
  disabled?: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Employee[]) => setEmployees(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <label className="block text-sm">
        <span className="text-[var(--shell-text-muted)]">Matricule agent *</span>
        <div className="mt-1 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-xs text-[var(--shell-text-muted)]">
          Chargement des agents…
        </div>
      </label>
    );
  }

  return (
    <MatriculeEmployeeField
      employees={employees}
      value={value}
      onChange={onChange}
      disabled={disabled}
      label="Matricule agent *"
      dropdownClassName="bg-[var(--shell-bg)]"
    />
  );
}
