import { OrganigrammeClient } from "@/components/postes/OrganigrammeClient";
import { attachEmployeeIds } from "@/lib/poste-linking";
import { getEmployees, getPositions } from "@/lib/store";

export default async function OrganigrammePage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;
  const employees = await getEmployees();
  const positions = attachEmployeeIds(
    (await getPositions()).filter((p) => p.status !== "archived"),
    employees
  );

  return (
    <OrganigrammeClient
      positions={positions}
      employees={employees}
      initialDepartment={department ? decodeURIComponent(department) : null}
    />
  );
}
