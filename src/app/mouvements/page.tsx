import { MouvementsClient } from "./MouvementsClient";
import { getEmployees, getPositions } from "@/lib/store";

export default async function MouvementsPage() {
  const [employees, positions] = await Promise.all([getEmployees(), getPositions()]);
  return <MouvementsClient employees={employees} positions={positions} />;
}
