import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function KpiDashboardPage() {
  return (
    <ModulePlaceholder
      title="Dashboard KPI"
      module="KPI & Performance — Tableau de bord"
      details={[
        "Vue synthétique : performance par département et par manager",
        "Indicateurs issus du pointage, des formations et des évaluations",
        "Alertes : sous-performance, dossiers incomplets, fins de période d'essai",
      ]}
    />
  );
}
