import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function VillageMaisonsPage() {
  return (
    <ModulePlaceholder
      title="Liste des maisons"
      module="Village — Liste des maisons"
      details={[
        "Inventaire des logements du village",
        "Taux d'occupation et disponibilités",
        "Filtres par bloc, statut et capacité",
      ]}
    />
  );
}
