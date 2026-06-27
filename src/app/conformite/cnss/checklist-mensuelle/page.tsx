"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CNSS_CHECKLIST_MENSUELLE } from "@/lib/cnss-compliance";

export default function CnssChecklistMensuellePage() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        <strong className="text-amber-300">Rôle du RH — Checklist CNSS mensuelle</strong> (Guide RH
        RDC — Partie 3.6)
      </p>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Tâches du mois</h2>
          <p className="text-xs text-slate-500">
            {Object.values(checked).filter(Boolean).length} / {CNSS_CHECKLIST_MENSUELLE.length}{" "}
            complétées
          </p>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {CNSS_CHECKLIST_MENSUELLE.map((item, i) => (
            <button
              key={item}
              type="button"
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              className="flex w-full items-start gap-3 rounded-xl border border-white/10 px-4 py-3 text-left hover:bg-white/5"
            >
              {checked[i] ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-slate-600 shrink-0" />
              )}
              <span className={checked[i] ? "text-slate-400 line-through" : "text-slate-200"}>
                {item}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
