import { PostesVacantsClient } from "@/components/postes/PostesVacantsClient";
import { isVacantForListing } from "@/lib/poste-headcount";
import { getEmployees, getPositions } from "@/lib/store";

export default async function PostesVacantsPage() {
  const [positions, employees] = await Promise.all([getPositions(), getEmployees()]);
  const vacant = positions.filter((p) => isVacantForListing(p, employees));

  return <PostesVacantsClient initialPositions={vacant} employees={employees} />;
}
