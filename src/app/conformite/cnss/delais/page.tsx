import { Grid8, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const CALENDRIER_PAIE = [
  { jour: "J-5", action: "Clôture pointages et heures supplémentaires" },
  { jour: "J-3", action: "Calcul paie et validation hiérarchique" },
  { jour: "J-2", action: "Déclarations CNSS / ONEM" },
  { jour: "J", action: "Paiement des salaires" },
  { jour: "J+15", action: "Paiement des cotisations sociales" },
];

export default function CnssDelaisPage() {
  return (
    <div className="space-y-6">
      <Grid8 className="!grid-cols-2 sm:!grid-cols-4 lg:!grid-cols-8">
        <GridStat className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-400">Déclaration CNSS</p>
          <p className="text-sm text-slate-300 mt-1">
            <strong className="text-amber-300">15 jours</strong> après le mois civil · DNSIE
          </p>
        </GridStat>
        <GridStat className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-400">Immatriculation</p>
          <p className="text-sm text-slate-300 mt-1">8 jours à l&apos;embauche · cnss.cd</p>
        </GridStat>
        <GridStat>
          <p className="text-xs text-slate-400">Télédéclaration</p>
          <p className="text-sm text-white mt-1">&gt; 25 sal.</p>
        </GridStat>
        <GridStat>
          <p className="text-xs text-slate-400">Retard</p>
          <p className="text-sm text-red-400 mt-1">Majorations</p>
        </GridStat>
      </Grid8>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Calendrier de paie type</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Grid8 className="!grid-cols-2 sm:!grid-cols-5 lg:!grid-cols-5">
            {CALENDRIER_PAIE.map((c) => (
              <GridStat key={c.jour}>
                <span className="font-mono font-bold text-sky-400">{c.jour}</span>
                <p className="text-xs text-slate-400 mt-1">{c.action}</p>
              </GridStat>
            ))}
          </Grid8>
        </CardContent>
      </Card>
    </div>
  );
}
