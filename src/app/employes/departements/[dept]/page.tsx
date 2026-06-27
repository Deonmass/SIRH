import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DepartmentTable } from "@/components/employes/DepartmentTable";
import { slugToDepartment } from "@/lib/departments";
import { getEmployees, getSettings } from "@/lib/store";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept: slug } = await params;
  const settings = await getSettings();
  const department = slugToDepartment(slug, settings.departments);
  if (!department) notFound();

  const employees = await getEmployees();
  const count = employees.filter((e) => e.department === department).length;

  return (
    <>
      <PageHeader title={department} description={`${count} employé(s) — tableau avec en-têtes figés`}>
        <Link
          href="/employes/departements"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Départements
        </Link>
      </PageHeader>

      <DepartmentTable employees={employees} department={department} settings={settings} />
    </>
  );
}
