import type { DbTypeMouvement } from "../../database/migrations/004_mouvements.types";

export type EmployeeStatus =
  | "candidat"
  | "pre_embauche"
  | "essai"
  | "actif"
  | "conge"
  | "suspendu"
  | "preavis"
  | "sorti"
  | "licencie";

export type Sexe = "M" | "F";
export type Grade =
  | "Direction"
  | "Cadre supérieur"
  | "Cadre"
  | "Agent maîtrise"
  | "Agent"
  | "Ouvrier";

export type ContractType = "CDI" | "CDD" | "apprentissage" | "stage" | "consultant";
export type PaymentMode = "virement" | "cheque" | "especes";
export type WorkTimeType = "plein_temps" | "temps_partiel";

/** @deprecated — migré vers EmployeeFormationRecord */
export interface EmployeeFormation {
  id: string;
  label: string;
  date?: string;
}

export type LeaveType =
  | "annuel"
  | "maladie"
  | "exceptionnel"
  | "maternite"
  | "sans_solde"
  | "autre";

export type LeaveRequestStatus =
  | "demande"
  | "validation_1"
  | "validation_2"
  | "approuve"
  | "refuse"
  | "termine";

export interface LeaveRecord {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveRequestStatus;
  notes?: string;
  validateur1?: string | null;
  validateur2?: string | null;
  validation1At?: string | null;
  validation2At?: string | null;
  matriculeEmploye?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Congé enrichi (liste globale / API) */
export interface CongeWithEmployee extends LeaveRecord {
  matriculeEmploye: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
}

export type FormationStatus = "a_venir" | "en_cours" | "terminee";

export interface FormationParticipant {
  employe_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  departement: string;
  cote?: number | null;
  point_a_atteindre?: number | null;
}

export interface FormationRecord {
  id: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  niveau?: string;
  instructeur?: string;
  commentaire?: string;
  participants: FormationParticipant[];
  participantCount: number;
  status: FormationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type PointageJourStatut =
  | "present"
  | "retard"
  | "absent_justifie"
  | "absent_non_justifie"
  | "maladie"
  | "conge"
  | "ferie"
  | "mission"
  | "repos";

export interface PointageJour {
  date: string;
  statut: PointageJourStatut;
  heure_arrivee?: string | null;
  heure_depart?: string | null;
  minutes_retard?: number | null;
  heures_sup?: number | null;
  commentaire?: string | null;
}

export interface PointageSynthese {
  jours_presents: number;
  jours_maladie: number;
  jours_conge: number;
  jours_feries: number;
  jours_mission: number;
  jours_repos: number;
  absences_justifiees: number;
  absences_non_justifiees: number;
  retards: number;
  minutes_retard_total: number;
  heures_sup_total: number;
  jours_prestes_paie: number;
  jours_maladie_paie: number;
  jours_conge_paie: number;
  jours_feries_paie: number;
}

export interface PointageRecord {
  id: string;
  matriculeEmploye: string;
  moisAnnee: string;
  jours: PointageJour[];
  synthese: PointageSynthese;
  verrouille: boolean;
  commentaireMois?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PointageListRow extends PointageRecord {
  employeId?: string;
  nom?: string;
  prenom?: string;
  departement?: string;
  paieCloture?: boolean;
  /** Net bulletin */
  paieNet?: number;
  paieCurrency?: Currency;
  paieExtraTotal?: number;
  /** Net bulletin + coûts extra */
  paieTotalAvecExtras?: number;
}

export interface PaiePayrollResultSnapshot {
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  totalEmployerCost: number;
  cnssEmployee: number;
  cnssEmployer: number;
  ipr: number;
  inpp: number;
  onem: number;
  overtimePay: number;
  transportAllowance: number;
  housingAllowance: number;
  currency: Currency;
  totalLegalDeductions?: number;
}

export interface PaieRecord {
  id: string;
  matriculeEmploye: string;
  moisAnnee: string;
  statut: "cloture";
  synthese: PointageSynthese;
  payrollConfig: JobPositionPayroll;
  payrollResult: PaiePayrollResultSnapshot;
  heuresSup: number;
  extraCosts?: EmployeeExtraCosts;
  extraCostsTotal?: number;
  totalAPayer?: number;
  pointageId?: string;
  clotureLe?: string;
  cloturePar?: string;
  commentaire?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PaieListRow extends PaieRecord {
  employeId?: string;
  nom?: string;
  prenom?: string;
  departement?: string;
}

export interface RemunerationHistoryEntry {
  id: string;
  effectiveDate: string;
  baseSalary: number;
  currency: Currency;
  reason: string;
  allowancesTotal?: number;
}

export interface EmployeeFormationRecord {
  id: string;
  label: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  completed: boolean;
  /** Note sur 5 ou sur 20 selon evaluationScale */
  evaluationNote?: number;
  evaluationScale?: "5" | "20";
  evaluationComment?: string;
  certificateReceived?: boolean;
}

/** Champs complémentaires du dossier (style Sage RH) */
export interface EmployeeDossier {
  ville?: string;
  province?: string;
  pays?: string;
  telephoneSecondaire?: string;
  emailPersonnel?: string;
  contactUrgence?: string;
  telephoneUrgence?: string;
  numeroEmploye?: string;
  service?: string;
  categorieProfessionnelle?: string;
  superieurHierarchique?: string;
  lieuAffectation?: string;
  dateConfirmation?: string;
  numeroContrat?: string;
  contractStartDate?: string;
  periodeEssaiMois?: number;
  tempsTravail?: WorkTimeType;
  horairesTravail?: string;
  conditionsParticulieres?: string;
  modePaiement?: PaymentMode;
  banque?: string;
  numeroCompte?: string;
  centreCout?: string;
  numeroFiscal?: string;
  numeroSecuriteSociale?: string;
  numeroPasseport?: string;
  numeroCarteIdentite?: string;
  expirationCarteIdentite?: string;
  expirationPasseport?: string;
  niveauEtudes?: string;
  diplomes?: string;
  certifications?: string;
  langues?: string;
  competences?: string;
  /** @deprecated — voir formationHistory */
  formations?: EmployeeFormation[];
  leaveHistory?: LeaveRecord[];
  remunerationHistory?: RemunerationHistoryEntry[];
  formationHistory?: EmployeeFormationRecord[];
  absencesJustifiees?: number;
  absencesNonJustifiees?: number;
  congesMaladie?: number;
  congesExceptionnels?: number;
  objectifs?: string;
  resultatsEvaluations?: string;
  notationDetail?: string;
  promotionsNotes?: string;
  recompenses?: string;
  createdBy?: string;
  updatedBy?: string;
  compteUtilisateur?: string;
  rolesPermissions?: string;
}
export type Currency = "USD" | "CDF";
export type EmployeeKind = "interne" | "externe" | "journalier";

/** Sous-traitant ou profil journalier (paramètres) */
export interface NamedOrgRef {
  id: string;
  name: string;
  code?: string;
  contact?: string;
  notes?: string;
  active: boolean;
}

export type MaritalStatus = "celibataire" | "marie" | "divorce" | "veuf";
export type MovementType = DbTypeMouvement;

export type WorkflowStepId =
  | "analyse_besoin"
  | "validation_interne"
  | "sourcing"
  | "preselection"
  | "entretiens"
  | "verifications"
  | "proposition_integration"
  | "contrat_signature"
  | "declaration_cnss"
  | "declaration_onem"
  | "onboarding_j1"
  | "onboarding_j30";

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  description: string;
  legalRef?: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  label: string;
  category: "identite" | "contrat" | "social" | "medical" | "bancaire" | "formation" | "famille" | "paie";
  required: boolean;
  received: boolean;
  receivedAt?: string;
  expiryDate?: string;
  fileRef?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  legalRef?: string;
}

export interface FamilyMember {
  id: string;
  relation: "pere" | "mere" | "conjoint" | "enfant" | "autre";
  sexe?: Sexe;
  nom: string;
  prenom: string;
  dateNaissance: string;
  aCharge: boolean;
  scolarise?: boolean;
  /** Jugement / décision pour enfant à charge (garde, adoption) */
  jugementRecu?: boolean;
  jugementFileRef?: string;
  jugementFileName?: string;
}

export interface Allowance {
  id: string;
  type:
    | "transport"
    | "logement"
    | "panier"
    | "fonction"
    | "anciennete"
    | "familiale"
    | "autre";
  label: string;
  amount: number;
  currency: Currency;
  taxable: boolean;
  cotisable: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SalaryPackage {
  baseSalary: number;
  currency: Currency;
  category: number;
  allowances: Allowance[];
}

/** Grille des coûts extra (par employé) — alignée paie / affectation */
export interface EmployeeExtraCosts {
  housing: number;
  mileage: number;
  childrenEducation: number;
  travel: number;
  variables: number;
  currency: Currency;
}

export type WorkMonthMode = 22 | 26;

export interface EmployeeOvertime {
  /** Heures sup. jour ouvrable — 2 premières h à 130 % */
  hours130?: number;
  /** Heures sup. jour ouvrable — au-delà de 2 h à 160 % */
  hours160?: number;
  /** Dimanche, férié, samedi (22 j) à 200 % */
  hours200?: number;
}

/** Heures sup. enregistrées par mois — impactent la paie du mois concerné */
export interface OvertimeMonthlyRecord {
  id: string;
  /** Format YYYY-MM */
  moisAnnee: string;
  hours130: number;
  hours160: number;
  hours200: number;
  workMonthMode?: WorkMonthMode;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DisciplinaryType =
  | "verbal_warning"
  | "written_warning"
  | "blame"
  | "suspension"
  | "demotion"
  | "dismissal_procedure"
  | "other";

export type DisciplinaryStatus = "open" | "closed" | "appealed";

export interface DisciplinaryRecord {
  id: string;
  type: DisciplinaryType;
  date: string;
  effectiveDate?: string;
  endDate?: string;
  reason: string;
  facts: string;
  legalBasis?: string;
  issuedBy?: string;
  employeeResponse?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  linkedDocumentId?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  status: DisciplinaryStatus;
}

export interface Movement {
  id: string;
  employeeId: string;
  code?: string;
  type: MovementType;
  date: string;
  fromPosition?: string;
  toPosition?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromSalary?: number;
  toSalary?: number;
  reason: string;
  legalBasis?: string;
  approvedBy?: string;
  effectiveDate: string;
  positionCode?: string | null;
  extraCosts?: EmployeeExtraCosts;
  documentAnnexe?: string | null;
  documentAnnexes?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CoordinatesHistoryEntry {
  id: string;
  effectiveDate: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  ville?: string;
  province?: string;
  pays?: string;
  telephoneSecondaire?: string;
  emailPersonnel?: string;
  contactUrgence?: string;
  telephoneUrgence?: string;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

/** Solde congé annuel (art. 141 — initialisé à l'affectation) */
export interface LeaveBalance {
  acquired: number;
  taken: number;
  remaining: number;
  reinitAt?: string;
  referenceDate?: string;
  grade?: string;
  category?: number;
  serviceYear?: number;
}

export interface Employee {
  id: string;
  matricule: string;
  nom: string;
  postNom?: string;
  prenom: string;
  photoUrl?: string;
  sexe: Sexe;
  grade: Grade;
  email?: string;
  telephone?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite: string;
  adresse?: string;
  numeroCnss?: string;
  numeroOnem?: string;
  status: EmployeeStatus;
  /** Interne, externe (sous-traitant) ou journalier */
  employeeKind: EmployeeKind;
  /** Obligatoire si employeeKind === externe */
  subcontractorId?: string | null;
  /** Obligatoire si employeeKind === journalier */
  journalierProviderId?: string | null;
  contractType: ContractType;
  contractEndDate?: string;
  department: string;
  position: string;
  /** Fiche de poste liée (affectation) */
  positionId?: string | null;
  /** Coûts extra mensuels (grille paie) */
  extraCosts?: EmployeeExtraCosts;
  category: number;
  hireDate?: string;
  trialEndDate?: string;
  maritalStatus: MaritalStatus;
  childrenCount: number;
  salary: SalaryPackage;
  workflow: WorkflowStep[];
  documents: DocumentItem[];
  family: FamilyMember[];
  movements: Movement[];
  /** Historique coordonnées (JSON Supabase `employes.coordonnees`) */
  coordinatesHistory?: CoordinatesHistoryEntry[];
  leaveBalance: LeaveBalance;
  /** Heures supplémentaires du mois en cours */
  overtime?: EmployeeOvertime;
  /** Historique mensuel des heures sup. (colonne `employes.mouvement`) */
  overtimeMonthlyRecords?: OvertimeMonthlyRecord[];
  workMonthMode?: WorkMonthMode;
  disciplinaryRecords?: DisciplinaryRecord[];
  warningsCount: number;
  /** Score performance annuel 1-5 */
  performanceScore?: number;
  performanceReviewDate?: string;
  /** Date entrée pipeline recrutement */
  recruitmentStartDate?: string;
  dossier?: EmployeeDossier;
  createdAt: string;
  updatedAt: string;
}

/** Tranche barème IRPP (revenus annuels en CDF) */
export interface IrppBracketConfig {
  rate: number;
  fromAnnualCdf: number;
  /** Plafond annuel inclus ; null = surplus (dernière tranche) */
  toAnnualCdf: number | null;
}

export interface PayrollParams {
  smigUsd: number;
  smigCdf: number;
  exchangeRate: number;
  cnssEmployeeRate: number;
  cnssEmployerRate: number;
  inppRate: number;
  onemRate: number;
  /** Barème IRPP (ex-IPR) — tranches annuelles FC */
  irppBrackets?: IrppBracketConfig[];
  /** Plancher IRPP mensuel après abattements (FC) */
  irppMinMonthlyCdf?: number;
  /** Plafond : l'IRPP ne peut excéder ce % du revenu imposable */
  irppMaxRateOfTaxable?: number;
}

export interface CategoryConfig {
  value: number;
  label: string;
  minSalary: number;
}

/** Ligne barème SMIG / tarif transport (Décret n° 25/22 — janvier 2026) */
export interface SmigBaremeRow {
  id: string;
  categoryLabel: string;
  categoryCode: string;
  echelon: string;
  grade: number;
  tension: number;
  dailyBaseSalary: number;
  monthlyBase26: number;
  housingAllowance: number;
  /** Transport journalier (barème) */
  transportDaily: number;
  /** Transport mensuel = transport journalier × 26 */
  transportMonthly: number;
  totalRemuneration: number;
}

export interface OvertimeRateConfig {
  id: string;
  label: string;
  rate: number;
}

export interface InppTierConfig {
  label: string;
  rate: number;
}

/** Secteur employeur pour le barème INPP (article 1er). */
export type InppSector = "public" | "prive";

export interface PayrollResult {
  baseSalary: number;
  allowancesTotal: number;
  /** Total gains (imposable + logement + transport) */
  grossSalary: number;
  brutContractuel?: number;
  totalRemunerationImposable?: number;
  totalGains?: number;
  totalLegalDeductions?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  overtimePay?: number;
  nightPay?: number;
  costOfLivingPrime?: number;
  interimPrime?: number;
  unionContribution?: number;
  baseCnss?: number;
  cnssEmployee: number;
  taxableBase: number;
  baseIpr?: number;
  iprBeforeAbatement?: number;
  iprAbatementPercent?: number;
  /** Taux de barème effectivement appliqués (ex. 3 % + 15 %) */
  iprAppliedRates?: number[];
  /** Détail par tranche (montants dans la devise du bulletin) */
  iprBracketBreakdown?: { rate: number; taxableAmount: number; taxAmount: number }[];
  ipr: number;
  otherDeductions: number;
  netSalary: number;
  cnssEmployer: number;
  inpp: number;
  onem: number;
  totalEmployerCost: number;
  familyAllowanceEstimate: number;
  hourlyRate?: number;
  currency: Currency;
}

/** Jours de congé annuel configurés par grade hiérarchique */
export interface GradeLeaveDaysConfig {
  grade: string;
  annualDays: number;
}

export interface AppSettings extends PayrollParams {
  companyName: string;
  companyRccm?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  /** Logo société — chemin local (/uploads/company/…) ou URL https:// (JSON Entreprise) */
  companyLogoUrl?: string | null;
  /** Couleur principale (hex) — en-têtes rapports PDF */
  companyBrandColor?: string;
  /** Couleur secondaire (hex) — accents rapports PDF */
  companyBrandColorSecondary?: string;
  /** Détail CNSS (total 18%) */
  cnssPensionEmployerRate: number;
  cnssPensionEmployeeRate: number;
  cnssFamilyRate: number;
  cnssRiskRate: number;
  /** Libellés départements actifs — hydratés depuis Supabase si configuré */
  departments: string[];
  grades: Grade[];
  categories: CategoryConfig[];
  overtimeRates: OvertimeRateConfig[];
  inppTiers: InppTierConfig[];
  /** Secteur INPP : public 4 % ; privé selon paliers d'effectif */
  inppSector: InppSector;
  /** Effectif forfaitaire pour le barème INPP (null = effectif actif auto) */
  inppHeadcountForfait: number | null;
  /** Dernier effectif auto compté (employés en paie) */
  inppLastAutoHeadcount?: number;
  legalWeeklyHours: number;
  legalDailyHours: number;
  /** Jours ouvrés de référence pour le prorata mensuel (22 ou 26) */
  workMonthMode: WorkMonthMode;
  noticeBaseDays: number;
  noticeDaysPerYear: number;
  annualLeaveDaysPerMonth: number;
  annualLeaveDaysPerMonthMinor: number;
  congeCirconstanceMaxDays: number;
  /** Congé annuel (jours) par grade — initialisation à l'affectation */
  gradeLeaveDays: GradeLeaveDaysConfig[];
  matriculePrefix: string;
  /** Masque les montants salariaux dans l'interface (listes, fiches, tableau de bord) */
  hideSalariesFromDisplay?: boolean;
  /** Barème SMIG — catégories professionnelles, grades, transport */
  smigBareme: SmigBaremeRow[];
  smigBaremeDate?: string;
  /** Sous-traitants pour employés externes */
  subcontractors: NamedOrgRef[];
  /** Profils / chantiers pour employés journaliers */
  journalierProviders: NamedOrgRef[];
  /** Référentiel centres de coûts — table `configuration` (titre « Centres de coûts ») */
  centresCouts: CentreDesCouts[];
}

/** Département / direction — table `departements` Supabase */
export interface Departement {
  id: string;
  code: string;
  libelle: string;
  ordre: number;
  actif: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type JobPositionStatus = "draft" | "active" | "vacant" | "archived";

/** Configuration paie rattachée à la fiche de poste (alignée simulateur) */
export interface JobPositionPayroll {
  baseSalary: number;
  currency: Currency;
  category: number;
  smigGrade?: number;
  smigCategory?: string;
  housingAllowance?: number;
  transportDaily?: number;
  /** Salaire de base journalier (devise payroll) — source de vérité pour le pointage */
  dailyBaseSalary?: number;
  unionMember?: boolean;
  allowances: Allowance[];
  payrollNotes?: string;
  /** Pointage & IRPP — mêmes champs que le simulateur de paie */
  daysPresent?: number;
  daysSick?: number;
  daysAnnualLeave?: number;
  daysHoliday?: number;
  dependents?: number;
  otherDeductions?: number;
}

export interface CentreDesCouts {
  id: string;
  denommination: string;
  autreInfo: string;
  text: string;
}

export interface JobPosition {
  id: string;
  /** Ex. POSTE-RH-2026-0042 */
  code: string;
  title: string;
  department: string;
  grade: Grade;
  /** Supérieur hiérarchique (fiche de poste parente) */
  reportsToId: string | null;
  status: JobPositionStatus;
  contractType: ContractType;
  /** Type d'employé cible pour ce poste (interne, externe, journalier) */
  typeEmp?: EmployeeKind | null;
  /** Centre de coûts (référence centre_des_couts.id) */
  centreDesCoutsId?: string | null;
  location?: string;
  headcount: number;
  description: string;
  missions: string;
  requirements: string;
  competencies: string;
  kpi?: string;
  /** Salarié affecté — vide = poste vacant */
  employeeId?: string | null;
  payroll: JobPositionPayroll;
  createdAt: string;
  updatedAt: string;
}

/** Compte applicatif (sans mot de passe exposé côté client). */
export interface Utilisateur {
  id: string;
  username: string;
  matriculAgent: string | null;
  permissions: import("./permissions").PermissionMatrix;
  /** Compte actif — si false, connexion refusée */
  actif: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/** Enregistrement local db.json (mot de passe hashé). */
export interface UtilisateurRecord extends Utilisateur {
  passeword: string;
}

/** Entrée du journal d'activité (xlog). */
export interface ActivityLogEntry {
  id: string;
  utilisateur: string | null;
  action: import("../../database/migrations/025_xlog.types").ActivityAction;
  createdAt: string;
  createdBy: string | null;
  entityType: import("../../database/migrations/025_xlog.types").ActivityEntityType;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  /** Champs modifiés (avant / après) — persisté dans `details.changes`. */
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  undoneAt: string | null;
  undoneBy: string | null;
  canUndo: boolean;
}

export interface Database {
  employees: Employee[];
  positions: JobPosition[];
  settings: AppSettings;
  utilisateurs?: UtilisateurRecord[];
  /** Horodatage de dernière persistance des paramètres (cache client / révision locale) */
  settingsRevision?: string;
  movements: Movement[];
  /** Congés locaux (fallback sans Supabase) */
  conges?: CongeWithEmployee[];
  seedVersion?: number;
  /** Modèle visuel bulletin de paie */
  payslipTemplate?: PayslipTemplateConfig;
  /** Bulletins archivés (historique mensuel) */
  payslipArchives?: PayslipArchiveRecord[];
  /** Journal d'activité (mode local sans Supabase) */
  activityLogs?: ActivityLogEntry[];
}

/** Design du template bulletin de paie */
export type PayslipLayout = "classic" | "modern" | "minimal" | "compact";
export type PayslipTableStyle = "plain" | "striped" | "bordered";
export type PayslipHeaderStyle = "dark" | "accent" | "light";

export interface PayslipTemplateConfig {
  title: string;
  accentColor: string;
  headerBg: string;
  borderColor: string;
  bodyBg: string;
  textColor: string;
  headerTextColor: string;
  footerNote: string;
  layout: PayslipLayout;
  tableStyle: PayslipTableStyle;
  headerStyle: PayslipHeaderStyle;
  fontFamily: string;
  fontSize: number;
  borderRadius: number;
  maxWidth: number;
  showSituation: boolean;
  showPointage: boolean;
  showCnssBlock: boolean;
  showCompanyLogo: boolean;
}

/** Données situation salarié sur le bulletin */
export interface PayslipEmployeeSituation {
  matricule: string;
  fullName: string;
  department: string;
  position: string;
  grade: string;
  cnssNumber?: string;
  contractType: string;
  hireDate?: string;
  dependents: number;
  leaveRemaining: number;
  status: string;
  workMonthMode?: number;
  pointageSummary?: string;
}

/** Bulletin calculé pour un salarié */
export interface PayslipData {
  id: string;
  employeeId: string;
  period: string;
  periodLabel: string;
  generatedAt: string;
  situation: PayslipEmployeeSituation;
  payroll: PayrollResult;
  currency: Currency;
  /** Config pointage / SMIG — bulletin détaillé PDF */
  payrollConfig?: JobPositionPayroll;
}

export interface PayslipArchiveRecord {
  id: string;
  employeeId: string;
  period: string;
  generatedAt: string;
  archivedAt: string;
  fileRef: string;
  fileName: string;
  netSalary: number;
  currency: Currency;
}

export interface PaieMasseBreakdown {
  period: string;
  periodLabel: string;
  isCurrentMonth: boolean;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalCnssEmployee: number;
  totalCnssEmployer: number;
  totalIpr: number;
  totalOnem: number;
  totalInpp: number;
  totalEmployerCost: number;
  totalExtraCosts: number;
  currency: Currency;
  byDepartment: {
    department: string;
    count: number;
    net: number;
    employerCost: number;
  }[];
}
