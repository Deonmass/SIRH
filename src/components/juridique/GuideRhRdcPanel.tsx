import { Grid8, GridCards, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CONGE_CIRCONSTANCE } from "@/lib/constants";

const PARTIES = [
  "Contrat de travail (CDI, CDD, essai)",
  "Calcul salaire brut et net",
  "CNSS — sécurité sociale",
  "INPP — formation professionnelle",
  "ONEM — emploi 0,5%",
  "Congés annuels et circonstance",
  "Heures supplémentaires et nuit",
  "Discipline et sanctions",
  "Licenciement légal",
  "Payroll Excel",
  "Recrutement (7 étapes)",
  "Entretiens RH",
  "Tableau de bord RH",
];

const CHECKLIST_MENSUELLE = [
  "Paie calculée et validée",
  "Bulletins distribués",
  "CNSS déclarée et payée",
  "ONEM déclaré",
  "INPP déclaré (trimestriel)",
  "IPR déclaré (DGI)",
  "Registre du personnel à jour",
  "Contrats archivés (5 ans)",
];

const CALENDRIER_PAIE = [
  { jour: "J-5", action: "Clôture pointages et heures sup" },
  { jour: "J-3", action: "Calcul paie et validation" },
  { jour: "J-2", action: "Déclarations CNSS / ONEM" },
  { jour: "J", action: "Paiement salaires" },
  { jour: "J+15", action: "Paiement cotisations" },
];

export function GuideRhRdcPanel() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
      <Grid8 className="mb-8">
        {PARTIES.map((p, i) => (
          <GridStat key={p}>
            <span className="text-sky-400 font-mono text-xs">{i + 1}</span>
            <p className="text-xs text-slate-300 mt-1 line-clamp-3">{p}</p>
          </GridStat>
        ))}
      </Grid8>

      <GridCards cols={2}>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Checklist mensuelle RH</h2>
          </CardHeader>
          <CardContent className="pt-0">
            <Grid8 className="!grid-cols-2 sm:!grid-cols-4">
              {CHECKLIST_MENSUELLE.map((item) => (
                <GridStat key={item}>
                  <p className="text-xs text-slate-300">{item}</p>
                </GridStat>
              ))}
            </Grid8>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Congés de circonstance (Art. 146)</h2>
          </CardHeader>
          <CardContent className="pt-0">
            <Grid8 className="!grid-cols-2 sm:!grid-cols-4">
              {CONGE_CIRCONSTANCE.map((c) => (
                <GridStat key={c.event}>
                  <p className="text-xs text-slate-300 line-clamp-2">{c.event}</p>
                  <p className="text-sm font-bold text-amber-300 mt-1">{c.days} j.</p>
                </GridStat>
              ))}
            </Grid8>
          </CardContent>
        </Card>
      </GridCards>

      <Card className="mt-6 mb-4">
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
