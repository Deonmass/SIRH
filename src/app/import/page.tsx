import { Suspense } from "react";
import { ExcelImportClient } from "@/components/import/ExcelImportClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeletons";

export const dynamic = "force-dynamic";

function ImportContent({ tab }: { tab: "employes" | "postes" }) {
  return <ExcelImportClient defaultTab={tab} />;
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "postes" ? "postes" : "employes";

  return (
    <>
      <PageHeader
        title="Import Excel"
        description="Charger une base agents ou postes depuis un fichier Excel — insertion ligne par ligne"
      />
      <Suspense fallback={<PageSkeleton variant="form" />}>
        <ImportContent tab={defaultTab} />
      </Suspense>
    </>
  );
}
