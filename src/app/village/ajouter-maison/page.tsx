import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function VillageAjouterMaisonPage() {
  return (
    <ModulePlaceholder
      title="Ajouter une maison"
      module="Village — Ajouter maison"
      details={[
        "Numéro / bloc / parcelle",
        "Capacité et type de logement",
        "Affectation employés et état du logement",
      ]}
    />
  );
}
