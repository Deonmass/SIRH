import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function KpiCampagnesPage() {
  return (
    <ModulePlaceholder
      title="Campagnes d'évaluation"
      module="KPI & Performance — Campagnes"
      details={[
        "Lancement d'une campagne (annuelle, essai, 360°, etc.)",
        "Sélection des populations et des évaluateurs",
        "Suivi des taux de complétion et relances automatiques",
      ]}
    />
  );
}
