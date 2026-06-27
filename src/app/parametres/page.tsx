import { ParametresForm } from "@/components/parametres/ParametresForm";
import { countInppHeadcount } from "@/lib/inpp-rate";
import { getDepartements, getEmployees, getSettings } from "@/lib/store";

export default async function ParametresPage() {
  const [settings, departements, employees] = await Promise.all([
    getSettings(),
    getDepartements(),
    getEmployees(),
  ]);
  const inppAutoHeadcount = countInppHeadcount(employees);
  return (
    <ParametresForm
      initial={settings}
      initialDepartements={departements}
      inppAutoHeadcount={inppAutoHeadcount}
    />
  );
}
