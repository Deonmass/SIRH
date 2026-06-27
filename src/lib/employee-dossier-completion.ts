import { getEmployeeDossier, type DossierTabId } from "./employee-dossier";
import type { Employee } from "./types";

export const DOSSIER_TAB_LABELS: Record<DossierTabId, string> = {
  profil: "Profil",
  coordonnees: "Coordonnées",
  postes_mouvements: "Postes et mouvements",
  remuneration: "Rémunération",
  conges: "Congés",
  documents: "Documents",
  formations: "Formations",
  discipline: "Discipline",
  paie: "Bulletins de paie",
  historique: "Historique",
};

export interface TabCompletion {
  filled: number;
  total: number;
  percent: number;
}

/** Onglets sans % dans la navigation du dossier. */
export const DOSSIER_TABS_WITHOUT_PERCENT: DossierTabId[] = [
  "formations",
  "conges",
  "discipline",
  "remuneration",
  "paie",
  "historique",
];

/** Onglets pris en compte pour le % global du dossier — documents obligatoires uniquement. */
export const DOSSIER_PROGRESS_TAB_IDS: DossierTabId[] = ["documents"];

export function computeDossierProgressPercent(
  completions: Record<DossierTabId, TabCompletion>
): number {
  return completions.documents.percent;
}

/** Couleurs alignées sur les barres d'onglet du dossier (≥80 vert, ≥40 orange, sinon gris). */
export function dossierCompletionBadgeClass(percent: number): string {
  if (percent >= 100 || percent >= 80) {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  }
  if (percent >= 40) {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  }
  return "bg-slate-500/15 text-slate-500 dark:text-slate-400";
}

export function dossierCompletionTextClass(percent: number): string {
  if (percent >= 100 || percent >= 80) return "text-emerald-500";
  if (percent >= 40) return "text-amber-500";
  return "text-slate-500";
}

export interface DossierGapCategory {
  tabId: DossierTabId;
  label: string;
  items: string[];
}

function filled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

function ratio(checks: boolean[]): TabCompletion {
  const total = checks.length;
  const filledCount = checks.filter(Boolean).length;
  const percent = total === 0 ? 100 : Math.round((filledCount / total) * 100);
  return { filled: filledCount, total, percent };
}

export function computeDossierTabCompletions(employee: Employee): Record<DossierTabId, TabCompletion> {
  const d = getEmployeeDossier(employee);
  const docsRequired = employee.documents.filter((doc) => doc.required);
  const docsReceived = docsRequired.filter(
    (doc) => doc.received || Boolean(doc.fileRef || doc.fileName)
  ).length;
  const workflowDone = employee.workflow.filter((s) => s.completed).length;
  const workflowTotal = employee.workflow.length || 1;

  const profil = ratio([
    filled(employee.nom),
    filled(employee.prenom),
    filled(employee.postNom),
    filled(employee.dateNaissance),
    filled(employee.lieuNaissance),
    filled(employee.nationalite),
    employee.maritalStatus !== "celibataire" ? employee.family.length > 0 : true,
  ]);

  const coordonnees = ratio([
    filled(employee.adresse),
    filled(employee.telephone),
    filled(employee.email),
  ]);

  const postes_mouvements = ratio([
    filled(employee.position),
    filled(employee.department),
    filled(d.lieuAffectation) || filled(employee.positionId),
    filled(employee.hireDate) || employee.movements.some((m) => m.type === "embauche" || m.type === "affectation"),
    employee.movements.length > 0,
    filled(employee.numeroCnss),
  ]);

  const hasOvertime =
    (employee.overtime?.hours130 ?? 0) > 0 ||
    (employee.overtime?.hours160 ?? 0) > 0 ||
    (employee.overtime?.hours200 ?? 0) > 0;

  const remuneration = ratio([
    employee.salary.baseSalary > 0 || Boolean(employee.positionId),
    filled(d.modePaiement),
    filled(d.banque),
    (d.remunerationHistory?.length ?? 0) > 0 || employee.movements.some((m) => m.toSalary != null),
    employee.salary.allowances.length > 0,
    hasOvertime || employee.salary.allowances.some((a) => a.amount > 0),
  ]);

  const conges = ratio([
    employee.leaveBalance.acquired > 0 || employee.leaveBalance.taken > 0,
    (d.leaveHistory?.length ?? 0) > 0,
    filled(d.absencesJustifiees) || (d.absencesJustifiees ?? 0) === 0,
    filled(d.congesMaladie) || (d.congesMaladie ?? 0) === 0,
  ]);

  const documentsTotal = docsRequired.length;
  const documentsFilled = docsReceived;
  const documents: TabCompletion = {
    filled: documentsFilled,
    total: documentsTotal,
    percent:
      documentsTotal === 0 ? 100 : Math.round((documentsFilled / documentsTotal) * 100),
  };

  const formations = ratio([
    filled(d.niveauEtudes),
    filled(d.competences),
    (d.formationHistory?.length ?? 0) > 0,
    d.formationHistory?.some((f) => f.completed && filled(f.evaluationNote)) ?? false,
  ]);

  const discipline = ratio([
    (employee.disciplinaryRecords?.length ?? 0) > 0,
    (employee.disciplinaryRecords?.some((r) => r.status === "closed") ?? false),
    filled(d.recompenses),
  ]);

  const paie = { filled: 0, total: 0, percent: 100 };

  const historique = ratio([
    workflowDone / workflowTotal >= 0.5,
    filled(d.createdBy),
    filled(d.updatedBy),
    filled(d.compteUtilisateur),
  ]);

  return {
    profil,
    coordonnees,
    postes_mouvements,
    remuneration,
    conges,
    documents,
    formations,
    discipline,
    paie,
    historique,
  };
}

function gaps(tabId: DossierTabId, checks: { label: string; ok: boolean }[]): DossierGapCategory | null {
  const items = checks.filter((c) => !c.ok).map((c) => c.label);
  if (items.length === 0) return null;
  return { tabId, label: DOSSIER_TAB_LABELS[tabId], items };
}

/** Champs non remplis du dossier, regroupés par onglet. */
export function computeDossierGaps(employee: Employee): DossierGapCategory[] {
  const d = getEmployeeDossier(employee);
  const docsRequired = employee.documents.filter((doc) => doc.required);
  const workflowDone = employee.workflow.filter((s) => s.completed).length;
  const workflowTotal = employee.workflow.length || 1;
  const hasOvertime =
    (employee.overtime?.hours130 ?? 0) > 0 ||
    (employee.overtime?.hours160 ?? 0) > 0 ||
    (employee.overtime?.hours200 ?? 0) > 0;

  const categories: (DossierGapCategory | null)[] = [
    gaps("profil", [
      { label: "Nom", ok: filled(employee.nom) },
      { label: "Prénom", ok: filled(employee.prenom) },
      { label: "Post-nom", ok: filled(employee.postNom) },
      { label: "Date de naissance", ok: filled(employee.dateNaissance) },
      { label: "Lieu de naissance", ok: filled(employee.lieuNaissance) },
      { label: "Nationalité", ok: filled(employee.nationalite) },
      {
        label: "Membres de famille (si non célibataire)",
        ok: employee.maritalStatus === "celibataire" || employee.family.length > 0,
      },
    ]),
    gaps("coordonnees", [
      { label: "Adresse", ok: filled(employee.adresse) },
      { label: "Téléphone", ok: filled(employee.telephone) },
      { label: "E-mail professionnel", ok: filled(employee.email) },
    ]),
    gaps("postes_mouvements", [
      { label: "Poste", ok: filled(employee.position) },
      { label: "Département", ok: filled(employee.department) },
      { label: "Lieu d'affectation", ok: filled(d.lieuAffectation) || Boolean(employee.positionId) },
      { label: "Date d'embauche", ok: filled(employee.hireDate) },
      { label: "Au moins un mouvement", ok: employee.movements.length > 0 },
      { label: "N° CNSS", ok: filled(employee.numeroCnss) },
    ]),
    gaps("remuneration", [
      { label: "Salaire de base", ok: employee.salary.baseSalary > 0 },
      { label: "Mode de paiement", ok: filled(d.modePaiement) },
      { label: "Banque", ok: filled(d.banque) },
      { label: "Historique de rémunération", ok: (d.remunerationHistory?.length ?? 0) > 0 },
      { label: "Indemnités", ok: employee.salary.allowances.length > 0 },
      {
        label: "Heures sup. ou primes",
        ok: hasOvertime || employee.salary.allowances.some((a) => a.amount > 0),
      },
    ]),
    gaps("conges", [
      {
        label: "Solde de congés renseigné",
        ok: employee.leaveBalance.acquired > 0 || employee.leaveBalance.taken > 0,
      },
      { label: "Historique des congés", ok: (d.leaveHistory?.length ?? 0) > 0 },
      {
        label: "Absences justifiées",
        ok: filled(d.absencesJustifiees) || (d.absencesJustifiees ?? 0) === 0,
      },
      { label: "Congés maladie", ok: filled(d.congesMaladie) || (d.congesMaladie ?? 0) === 0 },
    ]),
    gaps("documents", docsRequired.map((doc) => ({
      label: doc.label,
      ok: doc.received || Boolean(doc.fileRef || doc.fileName),
    }))),
    gaps("formations", [
      { label: "Niveau d'études", ok: filled(d.niveauEtudes) },
      { label: "Compétences", ok: filled(d.competences) },
      { label: "Au moins une formation", ok: (d.formationHistory?.length ?? 0) > 0 },
      {
        label: "Évaluation d'une formation terminée",
        ok: d.formationHistory?.some((f) => f.completed && filled(f.evaluationNote)) ?? false,
      },
    ]),
    gaps("discipline", [
      { label: "Au moins une mesure disciplinaire", ok: (employee.disciplinaryRecords?.length ?? 0) > 0 },
      {
        label: "Mesure clôturée",
        ok: employee.disciplinaryRecords?.some((r) => r.status === "closed") ?? false,
      },
      { label: "Récompenses", ok: filled(d.recompenses) },
    ]),
    gaps("historique", [
      { label: "Workflow à 50 % minimum", ok: workflowDone / workflowTotal >= 0.5 },
      { label: "Créé par", ok: filled(d.createdBy) },
      { label: "Mis à jour par", ok: filled(d.updatedBy) },
      { label: "Compte utilisateur", ok: filled(d.compteUtilisateur) },
    ]),
  ];

  return categories.filter((c): c is DossierGapCategory => c !== null);
}
