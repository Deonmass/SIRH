"use client";

import { useEffect, useState } from "react";
import { MatriculeEmployeeField } from "@/components/utilisateurs/MatriculeEmployeeField";
import type { Employee } from "@/lib/types";

export function CharroiMatriculeField({
  value,
  onChange,
  disabled = false,
  label = "Agent demandeur *",
}: {
  value: string;
  onChange: (matricule: string) => void;
  disabled?: boolean;
  label?: string;
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
        <span className="text-[var(--shell-text-muted)]">{label}</span>
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
      label={label}
      dropdownClassName="bg-[var(--shell-bg)]"
    />
  );
}
