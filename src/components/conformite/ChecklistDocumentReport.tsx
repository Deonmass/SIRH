import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { AlertTriangle, FileWarning, Users } from "lucide-react";
import { GridStatsRow, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StickyTable, StickyThead, Th, Td } from "@/components/layout/StickyTable";
import { computeComplianceReport } from "@/lib/compliance";
import { STATUS_LABELS } from "@/lib/constants";
import type { Employee, EmployeeStatus } from "@/lib/types";

export function ChecklistDocumentReport({
  employees,
}: {
  employees: Employee[];
}) {
  const report = computeComplianceReport(employees);

  return (
    <div className="space-y-8">
      <GridStatsRow className="mb-8">
        <GridStat tone="sky" icon={Users} label="Effectif actif" value={report.totalActive} />
        <GridStat
          tone="rose"
          icon={AlertTriangle}
          label="Dossiers incomplets"
          value={report.employeesWithIncompleteDossier}
        />
        <GridStat
          tone="amber"
          icon={FileWarning}
          label="Types manquants"
          value={report.byDocument.length + report.fieldGaps.length}
        />
      </GridStatsRow>

      {report.fieldGaps.map((gap) => (
        <Card key={gap.type} className="border-amber-500/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-white">{gap.label}</h3>
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                {gap.missingCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <GapTable rows={gap.employees} />
          </CardContent>
        </Card>
      ))}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Par document manquant</h2>
        {report.byDocument.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-emerald-400">
              Tous les documents obligatoires sont à jour.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {report.byDocument.map((row) => (
              <Card key={row.documentId}>
                <CardHeader>
                  <div className="flex justify-between flex-wrap gap-2">
                    <h3 className="font-medium text-white">{row.documentLabel}</h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                      <Users className="h-3 w-3 inline mr-1" />
                      {row.missingCount} manquant(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <GapTable rows={row.employees} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GapTable({
  rows,
}: {
  rows: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    department: string;
    status: string;
  }[];
}) {
  return (
    <StickyTable>
      <StickyThead>
        <tr>
          <Th>Matricule</Th>
          <Th>Nom</Th>
          <Th>Département</Th>
          <Th>Statut</Th>
          <Th>Action</Th>
        </tr>
      </StickyThead>
      <tbody>
        {rows.slice(0, 100).map((e) => (
          <tr key={e.id} className="hover:bg-white/[0.02]">
            <Td className="font-mono text-xs">{e.matricule}</Td>
            <Td>
              {e.prenom} {e.nom}
            </Td>
            <Td>{e.department}</Td>
            <Td>
              <Badge className="text-xs bg-white/5 text-slate-400 border-white/10">
                {STATUS_LABELS[e.status as EmployeeStatus]?.label ?? e.status}
              </Badge>
            </Td>
            <Td>
              <Link href={employeeDossierHref(e.id)} className="text-sky-400 text-xs hover:underline">
                Dossier
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </StickyTable>
  );
}
