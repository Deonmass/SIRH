import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export default function CharroiFileAttentePage() {
  return (
    <ModulePlaceholder
      title="File d'attente d'affectation"
      module="Charroi automobile — File d'attente"
      details={[
        "Demandes de véhicule en attente",
        "Priorisation et validation des affectations",
        "Suivi des demandes traitées / refusées",
      ]}
    />
  );
}
