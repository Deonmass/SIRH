import Link from "next/link";
import { Building2, Calculator, ShieldOff, User } from "lucide-react";
import { Grid8, GridStatsRow, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { computeCnssMonthly } from "@/lib/cnss-compliance";
import { getDatabase } from "@/lib/store";
import { formatSalaryDisplay } from "@/lib/utils";

export default async function CnssOverviewPage() {
  const db = await getDatabase();
  const summary = computeCnssMonthly(db.employees, db.settings);
  const hide = db.settings.hideSalariesFromDisplay === true;

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Caisse Nationale de Sécurité Sociale — cotisation totale 18% (5% travailleur + 13% employeur)
      </p>

      <GridStatsRow className="mb-6">
        <GridStat
          tone="cyan"
          icon={Calculator}
          label="Masse cotisable"
          value={formatSalaryDisplay(summary.totalMasseCotisable, "USD", hide)}
        />
        <GridStat
          tone="sky"
          icon={User}
          label="Part travailleur"
          value={formatSalaryDisplay(summary.totalTravailleur, "USD", hide)}
        />
        <GridStat
          tone="violet"
          icon={Building2}
          label="Part employeur"
          value={formatSalaryDisplay(summary.totalEmployeur, "USD", hide)}
        />
        <GridStat tone="rose" icon={ShieldOff} label="Sans n° CNSS" value={summary.sansNumeroCnss} />
      </GridStatsRow>

      <Grid8 className="!grid-cols-1 sm:!grid-cols-3 lg:!grid-cols-3">
        <Link href="/conformite/cnss/masse-cotisable" className="block">
          <Card className="h-full hover:border-sky-500/40 transition">
            <CardHeader>
              <h3 className="font-semibold text-white">Masse cotisable</h3>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-400">
              Détail par employé — base + primes cotisables
            </CardContent>
          </Card>
        </Link>
        <Link href="/conformite/cnss/checklist-mensuelle" className="block">
          <Card className="h-full hover:border-amber-500/40 transition">
            <CardHeader>
              <h3 className="font-semibold text-white">Checklist mensuelle RH</h3>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-400">
              Rôle du RH — déclaration, DNSIE, paiement
            </CardContent>
          </Card>
        </Link>
        <Link href="/conformite/cnss/delais" className="block">
          <Card className="h-full hover:border-emerald-500/40 transition">
            <CardHeader>
              <h3 className="font-semibold text-white">Délais & calendrier</h3>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-400">
              15 jours déclaration · calendrier paie J-5 à J+15
            </CardContent>
          </Card>
        </Link>
      </Grid8>
    </div>
  );
}
