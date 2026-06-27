import { redirect } from "next/navigation";
import { employeeDossierHref } from "@/lib/employee-dossier-url";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(employeeDossierHref(id));
}
