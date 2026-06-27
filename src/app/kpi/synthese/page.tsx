import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function KpiSynthesePage() {
  return (
    <ModulePlaceholder
      title="Synthèse performance"
      module="KPI & Performance — Synthèse"
      details={[
        "Historique des évaluations par employé",
        "Matrices potentiel / performance (9-box)",
        "Exports direction et plans d'actions consolidés",
      ]}
    />
  );
}
