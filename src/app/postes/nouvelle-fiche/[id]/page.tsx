import { notFound } from "next/navigation";
import { PosteFormClient } from "@/components/postes/PosteFormClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPosition, getPositions, getSettings } from "@/lib/store";

export default async function EditFichePostePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [position, positions, settings] = await Promise.all([
    getPosition(id),
    getPositions(),
    getSettings(),
  ]);

  if (!position) notFound();

  const { payroll, ...rest } = position;

  return (
    <>
      <PageHeader
        title="Modifier la fiche de poste"
        description={`${position.code} — ${position.title}`}
      />
      <PosteFormClient
        settings={settings}
        positions={positions.filter((p) => p.id !== id)}
        initial={{ ...rest, payroll, id: position.id, code: position.code }}
        mode="edit"
      />
    </>
  );
}
