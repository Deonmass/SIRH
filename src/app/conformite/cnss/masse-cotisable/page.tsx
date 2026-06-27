import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { Card, CardContent } from "@/components/ui/Card";
import { StickyTable, StickyThead, Th, Td } from "@/components/layout/StickyTable";
import { computeCnssMonthly } from "@/lib/cnss-compliance";
import { getDatabase } from "@/lib/store";
import { formatSalaryDisplay } from "@/lib/utils";

export default async function MasseCotisablePage() {
  const db = await getDatabase();
  const summary = computeCnssMonthly(db.employees, db.settings);
  const hide = db.settings.hideSalariesFromDisplay === true;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Masse cotisable = salaire de base + primes cotisables (hors transport non cotisable selon cas).
        Total : <strong className="text-white">{formatSalaryDisplay(summary.totalMasseCotisable, "USD", hide)}</strong>
      </p>

      <StickyTable>
        <StickyThead>
          <tr>
            <Th>Matricule</Th>
            <Th>Employé</Th>
            <Th>Département</Th>
            <Th>N° CNSS</Th>
            <Th>Masse cotisable</Th>
            <Th>5% salarié</Th>
            <Th>13% employeur</Th>
            <Th>Total 18%</Th>
            <Th>Déclaré</Th>
          </tr>
        </StickyThead>
        <tbody>
          {summary.rows.map((r) => (
            <tr key={r.employeeId} className="hover:bg-white/[0.02]">
              <Td className="font-mono text-xs">{r.matricule}</Td>
              <Td>
                <Link href={employeeDossierHref(r.employeeId)} className="text-white hover:text-sky-400">
                  {r.prenom} {r.nom}
                </Link>
              </Td>
              <Td className="text-xs">{r.department}</Td>
              <Td className="font-mono text-xs">{r.numeroCnss ?? "—"}</Td>
              <Td>{formatSalaryDisplay(r.masseCotisable, "USD", hide)}</Td>
              <Td>{formatSalaryDisplay(r.partTravailleur, "USD", hide)}</Td>
              <Td>{formatSalaryDisplay(r.partEmployeur, "USD", hide)}</Td>
              <Td className="font-medium text-amber-300">{formatSalaryDisplay(r.totalCotisation, "USD", hide)}</Td>
              <Td>{r.declared ? "✓" : "✗"}</Td>
            </tr>
          ))}
        </tbody>
      </StickyTable>

      <Card className="border-sky-500/20 bg-sky-500/5">
        <CardContent className="p-4 text-sm text-slate-300">
          <strong className="text-white">Répartition CNSS 18% :</strong> Pensions 10% (5+5) ·
          Prestations familiales 6,5% (employeur) · Risques professionnels 1,5% (employeur)
        </CardContent>
      </Card>
    </div>
  );
}
