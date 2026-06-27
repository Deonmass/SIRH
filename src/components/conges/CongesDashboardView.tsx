"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CongesDashboardClient } from "./CongesDashboardClient";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function CongesDashboardView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  return (
    <>
      <PageHeader compact title="Congés — Dashboard">
        <div className="flex items-end gap-2">
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
          <label className="text-xs">
            <span className="mb-0.5 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
            <select
              className="input min-w-[7.5rem] py-1 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>
      <CongesDashboardClient year={year} month={month} />
    </>
  );
}
