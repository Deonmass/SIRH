"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Grid8, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ONEM_CHECKLIST } from "@/lib/cnss-compliance";

export default function OnemPage() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Office National de l&apos;Emploi — contribution patronale{" "}
        <strong className="text-white">0,5%</strong> de la rémunération mensuelle
      </p>

      <Grid8 className="!grid-cols-2 sm:!grid-cols-4 lg:!grid-cols-8 mb-6">
        <GridStat>
          <p className="text-xs text-slate-400">Taux employeur</p>
          <p className="text-lg font-bold text-white">0,5%</p>
        </GridStat>
        <GridStat>
          <p className="text-xs text-slate-400">Déclaration</p>
          <p className="text-xs font-medium text-amber-300">Avant le 10</p>
        </GridStat>
        <GridStat>
          <p className="text-xs text-slate-400">Paiement</p>
          <p className="text-xs text-slate-300">15 j. après paie</p>
        </GridStat>
      </Grid8>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Checklist ONEM</h2>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {ONEM_CHECKLIST.map((item, i) => (
            <button
              key={item}
              type="button"
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              className="flex w-full gap-3 rounded-lg border border-white/10 px-4 py-2 text-left text-sm hover:bg-white/5"
            >
              {checked[i] ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-600 shrink-0" />
              )}
              <span className={checked[i] ? "text-slate-500 line-through" : "text-slate-300"}>
                {item}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <OnemMissingTable />
    </div>
  );
}

function OnemMissingTable() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-white">Employés sans déclaration ONEM / attestation</h2>
        <p className="text-xs text-slate-500">
          <Link href="/conformite/checklist" className="text-sky-400 hover:underline">
            Voir checklist documents complète →
          </Link>
        </p>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-500">
        Consultez l&apos;onglet Checklist documents — filtres « Déclaration ONEM » et « Attestation
        ONEM » pour la liste nominative.
      </CardContent>
    </Card>
  );
}
