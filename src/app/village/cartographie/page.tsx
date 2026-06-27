import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function VillageCartographiePage() {
  return (
    <ModulePlaceholder
      title="Cartographie du village"
      module="Village — Cartographie"
      details={[
        "Plan du site et répartition des maisons",
        "Visualisation des zones et voies d'accès",
        "Légende occupation / maintenance",
      ]}
    />
  );
}
