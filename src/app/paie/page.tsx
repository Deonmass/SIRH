import { PageHeader } from "@/components/layout/PageHeader";
import { PaieMassePanel } from "@/components/paie/PaieMassePanel";
import { buildPaieMasse } from "@/lib/paie-masse";
import { getDatabase, getSettings } from "@/lib/store";

export default async function PaieDashboardPage() {
  const db = await getDatabase();
  const settings = await getSettings();
  const masse = buildPaieMasse(db, settings);

  return (
    <>
      <PageHeader
        title="Paie — Dashboard"
        description="Synthèse des paies clôturées — charges et décaissements du mois"
      />

      <PaieMassePanel initialPeriod={masse.period} />
    </>
  );
}
