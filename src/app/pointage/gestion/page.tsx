import { Suspense } from "react";
import { PointageGestionClient } from "@/components/pointage/PointageGestionClient";
import { PageSkeleton } from "@/components/ui/PageSkeletons";

export default function PointageGestionPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <PointageGestionClient />
    </Suspense>
  );
}
