"use client";

import type { DbTypeMouvement } from "../../../../database/migrations/004_mouvements.types";
import {
  TYPE_MOUVEMENT_LABELS,
  typeMouvementRequiertPoste,
} from "../../../../database/migrations/004_mouvements.types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

const GROUPS: { title: string; types: DbTypeMouvement[] }[] = [
  {
    title: "Poste & carrière",
    types: ["affectation", "desaffectation", "changement_poste", "promotion", "mutation", "reclassement", "embauche"],
  },
  {
    title: "Contrat",
    types: [
      "confirmation_contrat",
      "avenant_contrat",
      "renouvellement_cdd",
      "fin_periode_essai",
      "fin_cdd",
    ],
  },
  {
    title: "Rémunération & statut",
    types: [
      "augmentation",
      "avenant_salaire",
      "avenant_avantages",
      "suspension",
      "reintegration",
    ],
  },
  {
    title: "Sortie",
    types: ["demission", "licenciement", "retraite", "fin_mission"],
  },
];

export function TypesMouvementClient() {
  return (
    <>
      <PageHeader
        title="Types de mouvement"
        description="Référentiel des natures de mouvement enregistrables dans le journal RH"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <Card key={group.title} className="border-[var(--shell-border)]">
            <CardContent className="pt-4">
              <h2 className="mb-3 text-sm font-semibold text-[var(--shell-text)]">{group.title}</h2>
              <ul className="space-y-2">
                {group.types.map((type) => (
                  <li
                    key={type}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--shell-border)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--shell-text)]">
                        {TYPE_MOUVEMENT_LABELS[type]}
                      </p>
                      <p className="text-[10px] text-[var(--shell-text-muted)]">{type}</p>
                    </div>
                    <Badge
                      className={
                        typeMouvementRequiertPoste(type)
                          ? "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-300"
                          : "bg-[var(--shell-surface)] text-[var(--shell-text-muted)] border-[var(--shell-border)]"
                      }
                    >
                      {typeMouvementRequiertPoste(type) ? "Poste requis" : "Sans poste"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
