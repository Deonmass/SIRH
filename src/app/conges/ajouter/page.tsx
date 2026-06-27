import { PageHeader } from "@/components/layout/PageHeader";
import { CongeAjouterClient } from "@/components/conges/CongeAjouterClient";
import { getEmployees } from "@/lib/store";

export default async function CongesAjouterPage() {
  const employees = await getEmployees();
  return (
    <>
      <PageHeader compact title="Ajouter un congé" />
      <CongeAjouterClient employees={employees} />
    </>
  );
}
