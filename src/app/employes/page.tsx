import { Suspense } from "react";
import { EmployeeListPage } from "@/components/employes/EmployeeListPage";
import { PageSkeleton } from "@/components/ui/PageSkeletons";
import { getEmployees, getPositions, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EmployesPage() {
  const [employees, settings, positions] = await Promise.all([
    getEmployees(),
    getSettings(),
    getPositions(),
  ]);
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <EmployeeListPage employees={employees} settings={settings} positions={positions} />
    </Suspense>
  );
}
