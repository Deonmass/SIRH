"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Grid8, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { INPP_CHECKLIST } from "@/lib/cnss-compliance";
import { formatInppRatePct, resolveInppHeadcount } from "@/lib/inpp-rate";
import type { InppSector, InppTierConfig } from "@/lib/types";

export function InppClient({
  inppTiers,
  inppRate,
  inppSector,
  inppHeadcountForfait,
  inppLastAutoHeadcount,
}: {
  inppTiers: InppTierConfig[];
  inppRate: number;
  inppSector: InppSector;
  inppHeadcountForfait: number | null;
  inppLastAutoHeadcount?: number;
}) {
  const effectiveHeadcount = resolveInppHeadcount(
    { inppHeadcountForfait, inppLastAutoHeadcount },
    inppHeadcountForfait == null ? inppLastAutoHeadcount : undefined
  );
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        INPP — taux applicable :{" "}
        <strong className="text-white">{formatInppRatePct(inppRate)} %</strong>
        {" · "}
        secteur <strong className="text-white">{inppSector === "public" ? "public" : "privé"}</strong>
        {" · "}
        effectif retenu <strong className="text-white">{effectiveHeadcount}</strong>
        {inppHeadcountForfait != null ? " (forfait)" : " (auto)"}
      </p>

      <Grid8 className="mb-6">
        {inppTiers.map((tier) => (
          <GridStat key={tier.label}>
            <p className="text-xs text-slate-400 line-clamp-2">{tier.label}</p>
            <p className="text-lg font-bold text-violet-300">
              {(tier.rate * 100).toLocaleString("fr-CD", {
                maximumFractionDigits: 1,
                minimumFractionDigits: Number.isInteger(tier.rate * 100) ? 0 : 1,
              })}
              %
            </p>
          </GridStat>
        ))}
      </Grid8>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Checklist INPP (trimestriel)</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Grid8 className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4">
            {INPP_CHECKLIST.map((item, i) => (
              <button
                key={item}
                type="button"
                onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                className="flex gap-2 rounded-lg border border-white/10 p-3 text-left text-xs hover:bg-white/5"
              >
                {checked[i] ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-600 shrink-0" />
                )}
                <span className={checked[i] ? "line-through text-slate-500" : "text-slate-300"}>
                  {item}
                </span>
              </button>
            ))}
          </Grid8>
        </CardContent>
      </Card>
    </div>
  );
}
