import { Suspense } from "react";
import { PointageDashboardView } from "@/components/pointage/PointageDashboardView";
import { PageSkeleton } from "@/components/ui/PageSkeletons";

export default function PointageDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <PointageDashboardView />
    </Suspense>
  );
}
