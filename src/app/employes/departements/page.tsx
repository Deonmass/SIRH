import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { departmentToSlug } from "@/lib/departments";
import { getEmployees, getSettings } from "@/lib/store";

export default async function DepartementsPage() {
  const [employees, settings] = await Promise.all([getEmployees(), getSettings()]);

  const cards = settings.departments.map((dept) => {
    const list = employees.filter(
      (e) => e.department === dept && !["sorti", "licencie"].includes(e.status)
    );
    const actifs = list.filter((e) => e.status === "actif").length;
    return { dept, count: list.length, actifs, slug: departmentToSlug(dept) };
  });

  return (
    <>
      <PageHeader
        title="Départements"
        description="Services de l'entreprise — ouvrez une carte pour le tableau des employés"
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ dept, count, actifs, slug }) => (
          <Link key={dept} href={`/employes/departements/${slug}`} className="group block h-full">
            <Card className="h-full transition hover:border-sky-500/40 hover:bg-sky-500/5">
              <CardContent className="flex h-full flex-col pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-600/20">
                  <Building2 className="h-6 w-6 text-sky-400" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white line-clamp-2 group-hover:text-sky-300">
                  {dept}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>
                    {count} collaborateur{count !== 1 ? "s" : ""} · {actifs} actif
                    {actifs !== 1 ? "s" : ""}
                  </span>
                </p>
                <p className="mt-auto pt-5 flex items-center gap-1 text-sm font-medium text-sky-400/90 group-hover:text-sky-300">
                  Voir le tableau
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
