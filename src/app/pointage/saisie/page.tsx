import { Suspense } from "react";
import { PointageSaisieClient } from "@/components/pointage/PointageSaisieClient";
import { PageSkeleton } from "@/components/ui/PageSkeletons";

export default function PointageSaisiePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="form" />}>
      <PointageSaisieClient />
    </Suspense>
  );
}
