import { Suspense } from "react";
import { DocumentCheckingPage } from "@/components/employes/DocumentCheckingPage";
import { PageSkeleton } from "@/components/ui/PageSkeletons";
import { getEmployees, getSettings } from "@/lib/store";

export default async function CheckingDocumentsPage() {
  const [employees, settings] = await Promise.all([getEmployees(), getSettings()]);
  return (
    <Suspense fallback={<PageSkeleton variant="checking" />}>
      <DocumentCheckingPage employees={employees} settings={settings} />
    </Suspense>
  );
}
