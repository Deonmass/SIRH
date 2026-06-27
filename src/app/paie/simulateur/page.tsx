import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { getSettings } from "@/lib/store";

export default async function SimulateurPage() {
  const settings = await getSettings();
  return <SalarySimulator params={settings} settings={settings} />;
}
