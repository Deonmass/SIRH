import { ExtraCostsGrille } from "@/components/paie/ExtraCostsGrille";
import { getEmployees, getPositions } from "@/lib/store";

export default async function GrilleCoutsExtraPage() {
  const [employees, positions] = await Promise.all([getEmployees(), getPositions()]);
  const active = employees.filter((e) =>
    ["actif", "essai", "conge", "preavis", "pre_embauche"].includes(e.status)
  );

  return <ExtraCostsGrille initialEmployees={active} initialPositions={positions} />;
}
