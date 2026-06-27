import { PageHeader } from "@/components/layout/PageHeader";
import { PayslipWorkspace } from "@/components/paie/PayslipWorkspace";
import { getSettings } from "@/lib/store";

export default async function DesignTemplatePaiePage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Design Template"
        description="Personnalisation visuelle du modèle de bulletin de paie et aperçu en direct."
      />
      <PayslipWorkspace settings={settings} />
    </>
  );
}
