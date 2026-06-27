import { PosteFormClient } from "@/components/postes/PosteFormClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { emptyJobPosition } from "@/lib/postes";
import { getPositions, getSettings } from "@/lib/store";

export default async function NouvelleFichePostePage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; reportsTo?: string }>;
}) {
  const params = await searchParams;
  const [settings, positions] = await Promise.all([
    getSettings(),
    getPositions(),
  ]);
  const initial = {
    ...emptyJobPosition(settings),
    ...(params.department
      ? { department: decodeURIComponent(params.department) }
      : {}),
    ...(params.reportsTo
      ? { reportsToId: decodeURIComponent(params.reportsTo) }
      : {}),
  };

  return (
    <>
      <PageHeader
        title="Nouvelle fiche de poste"
        description="Définissez le poste, la hiérarchie et le package salarial de référence"
      />
      <PosteFormClient
        settings={settings}
        positions={positions}
        initial={initial}
        mode="create"
      />
    </>
  );
}
