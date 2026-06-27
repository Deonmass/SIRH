"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PointageDashboardClient } from "./PointageDashboardClient";

export function PointageDashboardView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <>
      <PageHeader
        title="Pointage — Dashboard"
        description="Présences, retards et heures supplémentaires par mois"
      >
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input py-1.5 text-sm"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setYear(y);
              setMonth(m);
            }}
          />
        </div>
      </PageHeader>
      <PointageDashboardClient year={year} month={month} />
    </>
  );
}
