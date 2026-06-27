import { ChecklistDocumentReport } from "@/components/conformite/ChecklistDocumentReport";
import { getEmployees } from "@/lib/store";

export default async function ConformiteChecklistPage() {
  const employees = await getEmployees();
  return <ChecklistDocumentReport employees={employees} />;
}
