import { calculatePayroll } from "./payroll";
import type { Employee, PayrollParams } from "./types";

export interface CnssMonthlyRow {
  employeeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  department: string;
  numeroCnss?: string;
  masseCotisable: number;
  partTravailleur: number;
  partEmployeur: number;
  totalCotisation: number;
  declared: boolean;
}

export interface CnssMonthlySummary {
  rows: CnssMonthlyRow[];
  totalMasseCotisable: number;
  totalTravailleur: number;
  totalEmployeur: number;
  totalGlobal: number;
  sansNumeroCnss: number;
  delaiDeclaration: string;
  delaiPaiement: string;
}

const ACTIVE = ["actif", "essai", "conge", "preavis"];

export function computeCnssMonthly(
  employees: Employee[],
  params: PayrollParams
): CnssMonthlySummary {
  const rows: CnssMonthlyRow[] = [];

  employees
    .filter((e) => ACTIVE.includes(e.status))
    .forEach((e) => {
      const p = calculatePayroll(e.salary, params, 0, {
        dependents: e.family.filter((m) => m.aCharge).length,
      });
      const masseCotisable = p.baseCnss ?? p.totalRemunerationImposable ?? p.baseSalary;
      rows.push({
        employeeId: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        department: e.department,
        numeroCnss: e.numeroCnss,
        masseCotisable,
        partTravailleur: p.cnssEmployee,
        partEmployeur: p.cnssEmployer,
        totalCotisation: p.cnssEmployee + p.cnssEmployer,
        declared: !!e.numeroCnss && e.documents.some((d) => d.id === "doc_cnss" && d.received),
      });
    });

  return {
    rows,
    totalMasseCotisable: rows.reduce((s, r) => s + r.masseCotisable, 0),
    totalTravailleur: rows.reduce((s, r) => s + r.partTravailleur, 0),
    totalEmployeur: rows.reduce((s, r) => s + r.partEmployeur, 0),
    totalGlobal: rows.reduce((s, r) => s + r.totalCotisation, 0),
    sansNumeroCnss: rows.filter((r) => !r.numeroCnss).length,
    delaiDeclaration: "15 jours calendaires après la fin du mois civil",
    delaiPaiement: "Selon calendrier CNSS (vérifier cnss.cd)",
  };
}

export const CNSS_CHECKLIST_MENSUELLE = [
  "Mettre à jour les entrées/sorties du personnel",
  "Calculer la masse salariale cotisable (base + primes cotisables)",
  "Vérifier les numéros d'affiliation CNSS de chaque travailleur",
  "Produire la déclaration nominative (DNSIE / formulaire CNSS)",
  "Télédéclaration obligatoire si > 25 travailleurs",
  "Verser les cotisations dans les délais",
  "Conserver les accusés de réception",
  "Archiver le journal de paie et état des cotisations",
];

export const ONEM_CHECKLIST = [
  "Déclarer tout engagement et cessation de contrat",
  "Déclaration mensuelle avant le 10e jour du mois suivant",
  "Contribution 0,5% de la rémunération mensuelle (employeur)",
  "Paiement dans les 15 jours suivant le mois de paie",
  "Conserver preuves de déclaration",
  "Mettre à jour les postes vacants si requis",
];

export const INPP_CHECKLIST = [
  "Calculer la contribution sur la masse salariale brute",
  "Taux 1% à 3% selon effectif (secteur privé)",
  "Déclaration et paiement trimestriel (ou calendrier INPP)",
  "Intégrer la ligne INPP au budget paie",
  "Identifier les besoins de formation alignés INPP",
];
