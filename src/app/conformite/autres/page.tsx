import Link from "next/link";
import { Grid8, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const CHECKLIST_MENSUELLE_RH = [
  "Paie calculée et validée",
  "Bulletins distribués",
  "CNSS déclarée et payée",
  "ONEM déclaré",
  "INPP déclaré (trimestriel)",
  "IPR déclaré (DGI)",
  "Registre du personnel à jour",
  "Contrats et avenants archivés (5 ans)",
];

export default function AutresControlesPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">Annexe B — Guide RH RDC · Contrôles transverses</p>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Checklist mensuelle RH globale</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Grid8 className="!grid-cols-2 sm:!grid-cols-4">
            {CHECKLIST_MENSUELLE_RH.map((item) => (
              <GridStat key={item}>
                <p className="text-xs text-slate-300">{item}</p>
              </GridStat>
            ))}
          </Grid8>
        </CardContent>
      </Card>

      <Grid8 className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-medium text-white">IPR — Impôt professionnel</h3>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-slate-400">
            Déclaration auprès de la DGI. Barème progressif sur revenu imposable (brut − CNSS 5%).
            Utilisez le{" "}
            <Link href="/paie/simulateur" className="text-sky-400 hover:underline">
              simulateur de paie
            </Link>
            .
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-medium text-white">Registre du personnel</h3>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-slate-400">
            Tenue obligatoire. Cohérence avec déclarations CNSS/ONEM et contrats signés.
          </CardContent>
        </Card>
      </Grid8>
    </div>
  );
}
