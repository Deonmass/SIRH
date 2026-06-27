"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormationsDashboardClient } from "./FormationsDashboardClient";

export function FormationsDashboardView() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <>
      <PageHeader compact title="Formations — Dashboard">
        <label className="text-xs">
          <span className="mb-0.5 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
          <select
            className="input min-w-[5.5rem] py-1 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <FormationsDashboardClient year={year} />
    </>
  );
}
