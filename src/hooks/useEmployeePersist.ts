"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeEmployeePatch } from "@/lib/employee-dossier";
import type { Employee } from "@/lib/types";

/** État employé + sauvegarde avec mise à jour optimiste (pourcentages, UI). */
export function useEmployeePersist(initial: Employee) {
  const [employee, setEmployee] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(true);
  const employeeRef = useRef(initial);

  useEffect(() => {
    setEmployee(initial);
    employeeRef.current = initial;
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    setDossierLoading(true);
    fetch(`/api/employees/${encodeURIComponent(initial.id)}/dossier`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { employee?: Employee } | null) => {
        if (cancelled || !data?.employee) return;
        employeeRef.current = data.employee;
        setEmployee(data.employee);
      })
      .finally(() => {
        if (!cancelled) setDossierLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial.id]);

  const setFamily = useCallback((family: Employee["family"]) => {
    const next = mergeEmployeePatch(employeeRef.current, {
      family,
      childrenCount: family.filter((m) => m.relation === "enfant").length,
    });
    employeeRef.current = next;
    setEmployee(next);
  }, []);

  const save = useCallback(async (data: Partial<Employee>) => {
    const next = mergeEmployeePatch(employeeRef.current, data);
    employeeRef.current = next;
    setEmployee(next);

    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${next.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const updated = (await res.json()) as Employee;
        employeeRef.current = updated;
        setEmployee(updated);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { employee, save, saving, setFamily, dossierLoading };
}
