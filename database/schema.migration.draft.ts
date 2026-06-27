/**
 * =============================================================================
 * SIRH RDC — BROUILLON DE MIGRATION BASE DE DONNÉES
 * =============================================================================
 *
 * Statut        : EN ATTENTE DE VALIDATION (ne pas exécuter en production)
 * Source actuelle : `data/db.json` (JSON monolithique)
 * Cible proposée  : PostgreSQL 15+ (compatible SQLite en dev si besoin)
 * Version brouillon : 1.0.0-draft
 *
 * Ce fichier regroupe :
 *   1. Les enums SQL / TypeScript
 *   2. Les interfaces de lignes (`Db*Row`) — une par table
 *   3. Le DDL SQL complet (`SQL_MIGRATION_DRAFT`)
 *   4. Le plan de correspondance JSON → tables (`JSON_TO_TABLE_MAP`)
 *
 * Après votre validation, étapes suivantes (hors scope de ce brouillon) :
 *   - Choix ORM (Prisma / Drizzle) ou SQL brut
 *   - Script d'import depuis db.json
 *   - Bascule du `store.ts` vers le client DB
 * =============================================================================
 */

export const MIGRATION_DRAFT = {
  version: "1.0.0-draft",
  status: "pending_review" as const,
  source: "data/db.json",
  target: "postgresql",
  generatedAt: "2026-06-03",
  tableCount: 28,
};

// -----------------------------------------------------------------------------
// Enums (PostgreSQL + TypeScript)
// -----------------------------------------------------------------------------

export type DbEmployeeStatus =
  | "candidat"
  | "pre_embauche"
  | "essai"
  | "actif"
  | "conge"
  | "suspendu"
  | "preavis"
  | "sorti"
  | "licencie";

export type DbSexe = "M" | "F";

export type DbGrade =
  | "Direction"
  | "Cadre supérieur"
  | "Cadre"
  | "Agent maîtrise"
  | "Agent"
  | "Ouvrier";

export type DbContractType = "CDI" | "CDD" | "apprentissage" | "stage" | "consultant";
export type DbCurrency = "USD" | "CDF";
export type DbEmployeeKind = "interne" | "externe" | "journalier";
export type DbMaritalStatus = "celibataire" | "marie" | "divorce" | "veuf";
export type DbPaymentMode = "virement" | "cheque" | "especes";
export type DbWorkTimeType = "plein_temps" | "temps_partiel";
export type DbWorkMonthMode = 22 | 26;

export type DbMovementType =
  | "embauche"
  | "promotion"
  | "mutation"
  | "changement_poste"
  | "augmentation"
  | "avenant_avantages"
  | "suspension"
  | "reintegration"
  | "licenciement"
  | "demission"
  | "fin_cdd";

export type DbWorkflowStepId =
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

export type DbDocumentCategory =
  | "identite"
  | "contrat"
  | "social"
  | "medical"
  | "bancaire"
  | "formation"
  | "famille"
  | "paie";

export type DbFamilyRelation = "pere" | "mere" | "conjoint" | "enfant" | "autre";

export type DbAllowanceType =
  | "transport"
  | "logement"
  | "panier"
  | "fonction"
  | "anciennete"
  | "familiale"
  | "autre";

export type DbLeaveType =
  | "annuel"
  | "maladie"
  | "exceptionnel"
  | "maternite"
  | "sans_solde"
  | "autre";

export type DbLeaveRequestStatus = "demande" | "approuve" | "refuse" | "termine";

export type DbDisciplinaryType =
  | "verbal_warning"
  | "written_warning"
  | "blame"
  | "suspension"
  | "demotion"
  | "dismissal_procedure"
  | "other";

export type DbDisciplinaryStatus = "open" | "closed" | "appealed";

export type DbJobPositionStatus = "draft" | "active" | "vacant" | "archived";

export type DbNamedOrgRefType = "subcontractor" | "journalier_provider";

export type DbPayslipLayout = "classic" | "modern" | "minimal" | "compact";
export type DbPayslipTableStyle = "plain" | "striped" | "bordered";
export type DbPayslipHeaderStyle = "dark" | "accent" | "light";

export type DbUserRole = "admin" | "rh" | "manager" | "paie" | "lecture_seule";

export type DbAuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "archive";

// -----------------------------------------------------------------------------
// Tables — métadonnées & interfaces lignes
// -----------------------------------------------------------------------------

/** Registre des tables (ordre de création FK) */
export const SCHEMA_TABLES = [
  "app_meta",
  "organization_settings",
  "departments",
  "category_configs",
  "overtime_rate_configs",
  "inpp_tier_configs",
  "irpp_bracket_configs",
  "smig_bareme_rows",
  "named_org_refs",
  "job_positions",
  "employees",
  "employee_dossiers",
  "employee_allowances",
  "employee_documents",
  "employee_family_members",
  "employee_workflow_steps",
  "employee_leave_records",
  "employee_remuneration_history",
  "employee_formation_records",
  "employee_disciplinary_records",
  "job_position_allowances",
  "movements",
  "payslip_template",
  "payslip_archives",
  "users",
  "user_permissions",
  "audit_logs",
  "file_assets",
] as const;

export type SchemaTableName = (typeof SCHEMA_TABLES)[number];

export interface DbAppMetaRow {
  id: 1;
  seed_version: number;
  migrated_from_json_at: string | null;
  schema_version: string;
  updated_at: string;
}

/** Singleton — remplace `Database.settings` (partie scalaire) */
export interface DbOrganizationSettingsRow {
  id: 1;
  company_name: string;
  company_rccm: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  matricule_prefix: string;
  smig_usd: number;
  smig_cdf: number;
  exchange_rate: number;
  cnss_employee_rate: number;
  cnss_employer_rate: number;
  cnss_pension_employer_rate: number;
  cnss_pension_employee_rate: number;
  cnss_family_rate: number;
  cnss_risk_rate: number;
  inpp_rate: number;
  onem_rate: number;
  irpp_min_monthly_cdf: number;
  irpp_max_rate_of_taxable: number;
  legal_weekly_hours: number;
  legal_daily_hours: number;
  notice_base_days: number;
  notice_days_per_year: number;
  annual_leave_days_per_month: number;
  annual_leave_days_per_month_minor: number;
  conge_circonstance_max_days: number;
  hide_salaries_from_display: boolean;
  smig_bareme_date: string | null;
  updated_at: string;
}

/** Remplace `settings.departments[]` */
export interface DbDepartmentRow {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

/** Remplace `settings.categories[]` */
export interface DbCategoryConfigRow {
  id: string;
  value: number;
  label: string;
  min_salary: number;
  sort_order: number;
}

/** Remplace `settings.overtimeRates[]` */
export interface DbOvertimeRateConfigRow {
  id: string;
  label: string;
  rate: number;
  sort_order: number;
}

/** Remplace `settings.inppTiers[]` */
export interface DbInppTierConfigRow {
  id: string;
  label: string;
  rate: number;
  sort_order: number;
}

/** Remplace `settings.irppBrackets[]` */
export interface DbIrppBracketConfigRow {
  id: string;
  rate: number;
  from_annual_cdf: number;
  to_annual_cdf: number | null;
  sort_order: number;
}

/** Remplace `settings.smigBareme[]` */
export interface DbSmigBaremeRow {
  id: string;
  category_label: string;
  category_code: string;
  echelon: string;
  grade: number;
  tension: number;
  daily_base_salary: number;
  monthly_base_26: number;
  housing_allowance: number;
  transport_daily: number;
  transport_monthly: number;
  total_remuneration: number;
}

/** Remplace `settings.subcontractors[]` + `settings.journalierProviders[]` */
export interface DbNamedOrgRefRow {
  id: string;
  ref_type: DbNamedOrgRefType;
  name: string;
  code: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Remplace `Database.positions[]` (noyau + paie inline) */
export interface DbJobPositionRow {
  id: string;
  code: string;
  title: string;
  department_id: string | null;
  department_name: string;
  grade: DbGrade;
  reports_to_id: string | null;
  status: DbJobPositionStatus;
  contract_type: DbContractType;
  location: string | null;
  headcount: number;
  description: string;
  missions: string;
  requirements: string;
  competencies: string;
  kpi: string | null;
  employee_id: string | null;
  payroll_base_salary: number;
  payroll_currency: DbCurrency;
  payroll_category: number;
  payroll_smig_grade: number | null;
  payroll_smig_category: string | null;
  payroll_housing_allowance: number | null;
  payroll_transport_daily: number | null;
  payroll_union_member: boolean;
  payroll_notes: string | null;
  payroll_days_present: number | null;
  payroll_days_sick: number | null;
  payroll_days_annual_leave: number | null;
  payroll_days_holiday: number | null;
  payroll_dependents: number | null;
  payroll_other_deductions: number | null;
  created_at: string;
  updated_at: string;
}

/** Remplace `Database.employees[]` (noyau — champs plats) */
export interface DbEmployeeRow {
  id: string;
  matricule: string;
  nom: string;
  post_nom: string | null;
  prenom: string;
  photo_url: string | null;
  sexe: DbSexe;
  grade: DbGrade;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string;
  adresse: string | null;
  numero_cnss: string | null;
  numero_onem: string | null;
  status: DbEmployeeStatus;
  employee_kind: DbEmployeeKind;
  subcontractor_id: string | null;
  journalier_provider_id: string | null;
  contract_type: DbContractType;
  contract_end_date: string | null;
  department_id: string | null;
  department_name: string;
  position_label: string;
  position_id: string | null;
  category: number;
  hire_date: string | null;
  trial_end_date: string | null;
  marital_status: DbMaritalStatus;
  children_count: number;
  salary_base: number;
  salary_currency: DbCurrency;
  salary_category: number;
  leave_acquired: number;
  leave_taken: number;
  leave_remaining: number;
  overtime_hours_130: number;
  overtime_hours_160: number;
  overtime_hours_200: number;
  work_month_mode: DbWorkMonthMode;
  extra_housing: number;
  extra_mileage: number;
  extra_children_education: number;
  extra_travel: number;
  extra_variables: number;
  extra_costs_currency: DbCurrency;
  warnings_count: number;
  performance_score: number | null;
  performance_review_date: string | null;
  recruitment_start_date: string | null;
  created_at: string;
  updated_at: string;
}

/** Remplace `employees[].dossier` (1:1) */
export interface DbEmployeeDossierRow {
  employee_id: string;
  ville: string | null;
  province: string | null;
  pays: string | null;
  telephone_secondaire: string | null;
  email_personnel: string | null;
  contact_urgence: string | null;
  telephone_urgence: string | null;
  numero_employe: string | null;
  service: string | null;
  categorie_professionnelle: string | null;
  superieur_hierarchique: string | null;
  lieu_affectation: string | null;
  date_confirmation: string | null;
  numero_contrat: string | null;
  contract_start_date: string | null;
  periode_essai_mois: number | null;
  temps_travail: DbWorkTimeType | null;
  horaires_travail: string | null;
  conditions_particulieres: string | null;
  mode_paiement: DbPaymentMode | null;
  banque: string | null;
  numero_compte: string | null;
  centre_cout: string | null;
  numero_fiscal: string | null;
  numero_securite_sociale: string | null;
  numero_passeport: string | null;
  numero_carte_identite: string | null;
  expiration_carte_identite: string | null;
  expiration_passeport: string | null;
  niveau_etudes: string | null;
  diplomes: string | null;
  certifications: string | null;
  langues: string | null;
  competences: string | null;
  absences_justifiees: number | null;
  absences_non_justifiees: number | null;
  conges_maladie: number | null;
  conges_exceptionnels: number | null;
  objectifs: string | null;
  resultats_evaluations: string | null;
  notation_detail: string | null;
  promotions_notes: string | null;
  recompenses: string | null;
  created_by: string | null;
  updated_by: string | null;
  compte_utilisateur: string | null;
  roles_permissions: string | null;
  updated_at: string;
}

/** Remplace `employees[].salary.allowances[]` */
export interface DbEmployeeAllowanceRow {
  id: string;
  employee_id: string;
  allowance_type: DbAllowanceType;
  label: string;
  amount: number;
  currency: DbCurrency;
  taxable: boolean;
  cotisable: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
}

/** Remplace `employees[].documents[]` */
export interface DbEmployeeDocumentRow {
  id: string;
  employee_id: string;
  label: string;
  category: DbDocumentCategory;
  required: boolean;
  received: boolean;
  received_at: string | null;
  expiry_date: string | null;
  file_ref: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  legal_ref: string | null;
}

/** Remplace `employees[].family[]` */
export interface DbEmployeeFamilyMemberRow {
  id: string;
  employee_id: string;
  relation: DbFamilyRelation;
  sexe: DbSexe | null;
  nom: string;
  prenom: string;
  date_naissance: string;
  a_charge: boolean;
  scolarise: boolean | null;
  jugement_recu: boolean | null;
  jugement_file_ref: string | null;
  jugement_file_name: string | null;
}

/** Remplace `employees[].workflow[]` */
export interface DbEmployeeWorkflowStepRow {
  employee_id: string;
  step_id: DbWorkflowStepId;
  label: string;
  description: string;
  legal_ref: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
}

/** Remplace `employees[].dossier.leaveHistory[]` */
export interface DbEmployeeLeaveRecordRow {
  id: string;
  employee_id: string;
  leave_type: DbLeaveType;
  start_date: string;
  end_date: string;
  days: number;
  status: DbLeaveRequestStatus;
  notes: string | null;
}

/** Remplace `employees[].dossier.remunerationHistory[]` */
export interface DbEmployeeRemunerationHistoryRow {
  id: string;
  employee_id: string;
  effective_date: string;
  base_salary: number;
  currency: DbCurrency;
  reason: string;
  allowances_total: number | null;
}

/** Remplace `employees[].dossier.formationHistory[]` */
export interface DbEmployeeFormationRecordRow {
  id: string;
  employee_id: string;
  label: string;
  provider: string | null;
  start_date: string | null;
  end_date: string | null;
  completed: boolean;
  evaluation_note: number | null;
  evaluation_scale: "5" | "20" | null;
  evaluation_comment: string | null;
  certificate_received: boolean | null;
}

/** Remplace `employees[].disciplinaryRecords[]` */
export interface DbEmployeeDisciplinaryRecordRow {
  id: string;
  employee_id: string;
  record_type: DbDisciplinaryType;
  date: string;
  effective_date: string | null;
  end_date: string | null;
  reason: string;
  facts: string;
  legal_basis: string | null;
  issued_by: string | null;
  employee_response: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  linked_document_id: string | null;
  severity: 1 | 2 | 3 | 4 | 5;
  status: DbDisciplinaryStatus;
}

/** Remplace `positions[].payroll.allowances[]` */
export interface DbJobPositionAllowanceRow {
  id: string;
  job_position_id: string;
  allowance_type: DbAllowanceType;
  label: string;
  amount: number;
  currency: DbCurrency;
  taxable: boolean;
  cotisable: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
}

/** Remplace `Database.movements[]` (source canonique — dédoublonnée des mouvements embarqués employé) */
export interface DbMovementRow {
  id: string;
  employee_id: string;
  movement_type: DbMovementType;
  date: string;
  from_position: string | null;
  to_position: string | null;
  from_department: string | null;
  to_department: string | null;
  from_salary: number | null;
  to_salary: number | null;
  reason: string;
  legal_basis: string | null;
  approved_by: string | null;
  effective_date: string;
  created_at: string;
}

/** Singleton — remplace `Database.payslipTemplate` */
export interface DbPayslipTemplateRow {
  id: 1;
  title: string;
  accent_color: string;
  header_bg: string;
  border_color: string;
  body_bg: string;
  text_color: string;
  header_text_color: string;
  footer_note: string;
  layout: DbPayslipLayout;
  table_style: DbPayslipTableStyle;
  header_style: DbPayslipHeaderStyle;
  font_family: string;
  font_size: number;
  border_radius: number;
  max_width: number;
  show_situation: boolean;
  show_pointage: boolean;
  show_cnss_block: boolean;
  show_company_logo: boolean;
  updated_at: string;
}

/** Remplace `Database.payslipArchives[]` */
export interface DbPayslipArchiveRow {
  id: string;
  employee_id: string;
  period: string;
  generated_at: string;
  archived_at: string;
  file_ref: string;
  file_name: string;
  net_salary: number;
  currency: DbCurrency;
}

/** Futur module Utilisateurs — non présent dans db.json aujourd'hui */
export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  prenom: string;
  nom: string;
  poste: string | null;
  department_id: string | null;
  telephone: string | null;
  avatar_color: string | null;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Futur module Permissions */
export interface DbUserPermissionRow {
  id: string;
  user_id: string;
  role: DbUserRole;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_export: boolean;
  granted_at: string;
  granted_by: string | null;
}

/** Futur module Logs */
export interface DbAuditLogRow {
  id: string;
  user_id: string | null;
  action: DbAuditAction;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Index des fichiers uploadés (documents, bulletins, logos) */
export interface DbFileAssetRow {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  byte_size: number | null;
  owner_type: "employee" | "company" | "payslip" | "user";
  owner_id: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

// -----------------------------------------------------------------------------
// Union utilitaire — toutes les lignes
// -----------------------------------------------------------------------------

export type DbRow =
  | DbAppMetaRow
  | DbOrganizationSettingsRow
  | DbDepartmentRow
  | DbCategoryConfigRow
  | DbOvertimeRateConfigRow
  | DbInppTierConfigRow
  | DbIrppBracketConfigRow
  | DbSmigBaremeRow
  | DbNamedOrgRefRow
  | DbJobPositionRow
  | DbEmployeeRow
  | DbEmployeeDossierRow
  | DbEmployeeAllowanceRow
  | DbEmployeeDocumentRow
  | DbEmployeeFamilyMemberRow
  | DbEmployeeWorkflowStepRow
  | DbEmployeeLeaveRecordRow
  | DbEmployeeRemunerationHistoryRow
  | DbEmployeeFormationRecordRow
  | DbEmployeeDisciplinaryRecordRow
  | DbJobPositionAllowanceRow
  | DbMovementRow
  | DbPayslipTemplateRow
  | DbPayslipArchiveRow
  | DbUserRow
  | DbUserPermissionRow
  | DbAuditLogRow
  | DbFileAssetRow;

// -----------------------------------------------------------------------------
// Correspondance db.json → tables relationnelles
// -----------------------------------------------------------------------------

export const JSON_TO_TABLE_MAP: Record<string, string> = {
  "Database.employees[]": "employees + employee_* (7 tables enfants)",
  "employees[].salary": "employees.salary_* + employee_allowances[]",
  "employees[].salary.allowances[]": "employee_allowances",
  "employees[].dossier": "employee_dossiers + employee_leave_records + …",
  "employees[].documents[]": "employee_documents",
  "employees[].family[]": "employee_family_members",
  "employees[].workflow[]": "employee_workflow_steps",
  "employees[].movements[]": "movements (fusion avec Database.movements[])",
  "employees[].leaveBalance": "employees.leave_*",
  "employees[].overtime": "employees.overtime_hours_*",
  "employees[].extraCosts": "employees.extra_*",
  "Database.positions[]": "job_positions + job_position_allowances",
  "positions[].payroll": "job_positions.payroll_*",
  "Database.settings": "organization_settings + tables de référence",
  "settings.departments[]": "departments",
  "settings.categories[]": "category_configs",
  "settings.smigBareme[]": "smig_bareme_rows",
  "settings.subcontractors[]": "named_org_refs (ref_type=subcontractor)",
  "settings.journalierProviders[]": "named_org_refs (ref_type=journalier_provider)",
  "Database.movements[]": "movements",
  "Database.payslipTemplate": "payslip_template",
  "Database.payslipArchives[]": "payslip_archives",
  "Database.seedVersion": "app_meta.seed_version",
  "public/uploads/**": "file_assets (+ file_ref dans documents / archives)",
};

// -----------------------------------------------------------------------------
// DDL SQL — brouillon complet (PostgreSQL)
// -----------------------------------------------------------------------------

export const SQL_MIGRATION_DRAFT = `
-- =============================================================================
-- SIRH RDC — Migration v1.0.0-draft
-- NE PAS EXÉCUTER SANS VALIDATION MÉTIER
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE employee_status AS ENUM (
  'candidat','pre_embauche','essai','actif','conge','suspendu','preavis','sorti','licencie'
);
CREATE TYPE sexe AS ENUM ('M','F');
CREATE TYPE grade AS ENUM (
  'Direction','Cadre supérieur','Cadre','Agent maîtrise','Agent','Ouvrier'
);
CREATE TYPE contract_type AS ENUM ('CDI','CDD','apprentissage','stage','consultant');
CREATE TYPE currency AS ENUM ('USD','CDF');
CREATE TYPE employee_kind AS ENUM ('interne','externe','journalier');
CREATE TYPE marital_status AS ENUM ('celibataire','marie','divorce','veuf');
CREATE TYPE movement_type AS ENUM (
  'embauche','promotion','mutation','changement_poste','augmentation',
  'avenant_avantages','suspension','reintegration','licenciement','demission','fin_cdd'
);
CREATE TYPE job_position_status AS ENUM ('draft','active','vacant','archived');
CREATE TYPE named_org_ref_type AS ENUM ('subcontractor','journalier_provider');
CREATE TYPE document_category AS ENUM (
  'identite','contrat','social','medical','bancaire','formation','famille','paie'
);
CREATE TYPE user_role AS ENUM ('admin','rh','manager','paie','lecture_seule');

-- ── Métadonnées application ─────────────────────────────────────────────────

CREATE TABLE app_meta (
  id              SMALLINT PRIMARY KEY CHECK (id = 1),
  seed_version    INTEGER NOT NULL DEFAULT 0,
  migrated_from_json_at TIMESTAMPTZ,
  schema_version  TEXT NOT NULL DEFAULT '1.0.0-draft',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Paramètres organisation (singleton) ───────────────────────────────────────

CREATE TABLE organization_settings (
  id                              SMALLINT PRIMARY KEY CHECK (id = 1),
  company_name                    TEXT NOT NULL,
  company_rccm                    TEXT,
  company_address                 TEXT,
  company_phone                   TEXT,
  company_email                   TEXT,
  company_logo_url                TEXT,
  matricule_prefix                TEXT NOT NULL DEFAULT 'RDC',
  smig_usd                        NUMERIC(12,2) NOT NULL,
  smig_cdf                        NUMERIC(14,0) NOT NULL,
  exchange_rate                   NUMERIC(12,4) NOT NULL,
  cnss_employee_rate              NUMERIC(6,4) NOT NULL,
  cnss_employer_rate              NUMERIC(6,4) NOT NULL,
  cnss_pension_employer_rate      NUMERIC(6,4) NOT NULL,
  cnss_pension_employee_rate      NUMERIC(6,4) NOT NULL,
  cnss_family_rate                NUMERIC(6,4) NOT NULL,
  cnss_risk_rate                  NUMERIC(6,4) NOT NULL,
  inpp_rate                       NUMERIC(6,4) NOT NULL,
  onem_rate                       NUMERIC(6,4) NOT NULL,
  irpp_min_monthly_cdf            NUMERIC(14,0) NOT NULL,
  irpp_max_rate_of_taxable        NUMERIC(6,4) NOT NULL,
  legal_weekly_hours              NUMERIC(5,2) NOT NULL,
  legal_daily_hours               NUMERIC(5,2) NOT NULL,
  notice_base_days                INTEGER NOT NULL,
  notice_days_per_year            INTEGER NOT NULL,
  annual_leave_days_per_month     NUMERIC(5,2) NOT NULL,
  annual_leave_days_per_month_minor NUMERIC(5,2) NOT NULL,
  conge_circonstance_max_days     INTEGER NOT NULL,
  hide_salaries_from_display      BOOLEAN NOT NULL DEFAULT FALSE,
  smig_bareme_date                TEXT,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE category_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value       INTEGER NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  min_salary  NUMERIC(12,2) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE overtime_rate_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  rate        NUMERIC(6,4) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE inpp_tier_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  rate        NUMERIC(6,4) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE irpp_bracket_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate            NUMERIC(6,4) NOT NULL,
  from_annual_cdf NUMERIC(16,0) NOT NULL,
  to_annual_cdf   NUMERIC(16,0),
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE smig_bareme_rows (
  id                  TEXT PRIMARY KEY,
  category_label      TEXT NOT NULL,
  category_code       TEXT NOT NULL,
  echelon             TEXT NOT NULL,
  grade               INTEGER NOT NULL,
  tension             NUMERIC(8,4) NOT NULL,
  daily_base_salary   NUMERIC(14,0) NOT NULL,
  monthly_base_26     NUMERIC(14,0) NOT NULL,
  housing_allowance   NUMERIC(14,0) NOT NULL,
  transport_daily     NUMERIC(14,0) NOT NULL,
  transport_monthly   NUMERIC(14,0) NOT NULL,
  total_remuneration  NUMERIC(14,0) NOT NULL
);

CREATE TABLE named_org_refs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type    named_org_ref_type NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT,
  contact     TEXT,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Postes & employés ───────────────────────────────────────────────────────

CREATE TABLE job_positions (
  id                      UUID PRIMARY KEY,
  code                    TEXT NOT NULL UNIQUE,
  title                   TEXT NOT NULL,
  department_id           UUID REFERENCES departments(id) ON DELETE SET NULL,
  department_name         TEXT NOT NULL,
  grade                   grade NOT NULL,
  reports_to_id           UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  status                  job_position_status NOT NULL DEFAULT 'draft',
  contract_type           contract_type NOT NULL,
  location                TEXT,
  headcount               INTEGER NOT NULL DEFAULT 1,
  description             TEXT NOT NULL DEFAULT '',
  missions                TEXT NOT NULL DEFAULT '',
  requirements            TEXT NOT NULL DEFAULT '',
  competencies            TEXT NOT NULL DEFAULT '',
  kpi                     TEXT,
  employee_id             UUID,
  payroll_base_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  payroll_currency        currency NOT NULL DEFAULT 'USD',
  payroll_category        INTEGER NOT NULL DEFAULT 1,
  payroll_smig_grade      INTEGER,
  payroll_smig_category   TEXT,
  payroll_housing_allowance NUMERIC(12,2),
  payroll_transport_daily NUMERIC(12,2),
  payroll_union_member    BOOLEAN NOT NULL DEFAULT FALSE,
  payroll_notes           TEXT,
  payroll_days_present    INTEGER,
  payroll_days_sick       INTEGER,
  payroll_days_annual_leave INTEGER,
  payroll_days_holiday    INTEGER,
  payroll_dependents      INTEGER,
  payroll_other_deductions NUMERIC(12,2),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
  id                      UUID PRIMARY KEY,
  matricule               TEXT NOT NULL UNIQUE,
  nom                     TEXT NOT NULL,
  post_nom                TEXT,
  prenom                  TEXT NOT NULL,
  photo_url               TEXT,
  sexe                    sexe NOT NULL,
  grade                   grade NOT NULL,
  email                   TEXT,
  telephone               TEXT,
  date_naissance          DATE,
  lieu_naissance          TEXT,
  nationalite             TEXT NOT NULL,
  adresse                 TEXT,
  numero_cnss             TEXT,
  numero_onem             TEXT,
  status                  employee_status NOT NULL,
  employee_kind           employee_kind NOT NULL DEFAULT 'interne',
  subcontractor_id        UUID REFERENCES named_org_refs(id) ON DELETE SET NULL,
  journalier_provider_id  UUID REFERENCES named_org_refs(id) ON DELETE SET NULL,
  contract_type           contract_type NOT NULL,
  contract_end_date       DATE,
  department_id           UUID REFERENCES departments(id) ON DELETE SET NULL,
  department_name         TEXT NOT NULL,
  position_label          TEXT NOT NULL,
  position_id             UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  category                INTEGER NOT NULL,
  hire_date               DATE,
  trial_end_date          DATE,
  marital_status          marital_status NOT NULL,
  children_count          INTEGER NOT NULL DEFAULT 0,
  salary_base             NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_currency         currency NOT NULL DEFAULT 'USD',
  salary_category         INTEGER NOT NULL DEFAULT 1,
  leave_acquired          NUMERIC(8,2) NOT NULL DEFAULT 0,
  leave_taken             NUMERIC(8,2) NOT NULL DEFAULT 0,
  leave_remaining         NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours_130      NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours_160      NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours_200      NUMERIC(8,2) NOT NULL DEFAULT 0,
  work_month_mode         SMALLINT NOT NULL DEFAULT 26 CHECK (work_month_mode IN (22, 26)),
  extra_housing           NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_mileage           NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_children_education NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_travel            NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_variables         NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_costs_currency    currency NOT NULL DEFAULT 'USD',
  warnings_count          INTEGER NOT NULL DEFAULT 0,
  performance_score       NUMERIC(3,2),
  performance_review_date DATE,
  recruitment_start_date  DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_positions
  ADD CONSTRAINT fk_job_positions_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

CREATE TABLE employee_dossiers (
  employee_id               UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  ville                     TEXT,
  province                  TEXT,
  pays                      TEXT,
  telephone_secondaire      TEXT,
  email_personnel           TEXT,
  contact_urgence           TEXT,
  telephone_urgence         TEXT,
  numero_employe            TEXT,
  service                   TEXT,
  categorie_professionnelle TEXT,
  superieur_hierarchique    TEXT,
  lieu_affectation          TEXT,
  date_confirmation         DATE,
  numero_contrat            TEXT,
  contract_start_date       DATE,
  periode_essai_mois        INTEGER,
  temps_travail             TEXT,
  horaires_travail          TEXT,
  conditions_particulieres  TEXT,
  mode_paiement             TEXT,
  banque                    TEXT,
  numero_compte             TEXT,
  centre_cout               TEXT,
  numero_fiscal             TEXT,
  numero_securite_sociale   TEXT,
  numero_passeport          TEXT,
  numero_carte_identite     TEXT,
  expiration_carte_identite DATE,
  expiration_passeport      DATE,
  niveau_etudes             TEXT,
  diplomes                  TEXT,
  certifications            TEXT,
  langues                   TEXT,
  competences               TEXT,
  absences_justifiees       INTEGER,
  absences_non_justifiees   INTEGER,
  conges_maladie            INTEGER,
  conges_exceptionnels      INTEGER,
  objectifs                 TEXT,
  resultats_evaluations     TEXT,
  notation_detail           TEXT,
  promotions_notes          TEXT,
  recompenses               TEXT,
  created_by                TEXT,
  updated_by                TEXT,
  compte_utilisateur        TEXT,
  roles_permissions         TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_allowances (
  id              UUID PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  allowance_type  TEXT NOT NULL,
  label           TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  currency        currency NOT NULL,
  taxable         BOOLEAN NOT NULL DEFAULT TRUE,
  cotisable       BOOLEAN NOT NULL DEFAULT TRUE,
  start_date      DATE,
  end_date        DATE,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE employee_documents (
  id           TEXT PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  category     document_category NOT NULL,
  required     BOOLEAN NOT NULL DEFAULT FALSE,
  received     BOOLEAN NOT NULL DEFAULT FALSE,
  received_at  TIMESTAMPTZ,
  expiry_date  DATE,
  file_ref     TEXT,
  file_name    TEXT,
  file_size    BIGINT,
  uploaded_at  TIMESTAMPTZ,
  legal_ref    TEXT
);

CREATE TABLE employee_family_members (
  id                  UUID PRIMARY KEY,
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  relation            TEXT NOT NULL,
  sexe                sexe,
  nom                 TEXT NOT NULL,
  prenom              TEXT NOT NULL,
  date_naissance      DATE NOT NULL,
  a_charge            BOOLEAN NOT NULL DEFAULT FALSE,
  scolarise           BOOLEAN,
  jugement_recu       BOOLEAN,
  jugement_file_ref   TEXT,
  jugement_file_name  TEXT
);

CREATE TABLE employee_workflow_steps (
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  step_id       TEXT NOT NULL,
  label         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  legal_ref     TEXT,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (employee_id, step_id)
);

CREATE TABLE employee_leave_records (
  id           UUID PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type   TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  days         NUMERIC(8,2) NOT NULL,
  status       TEXT NOT NULL,
  notes        TEXT
);

CREATE TABLE employee_remuneration_history (
  id               UUID PRIMARY KEY,
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date   DATE NOT NULL,
  base_salary      NUMERIC(12,2) NOT NULL,
  currency         currency NOT NULL,
  reason           TEXT NOT NULL,
  allowances_total NUMERIC(12,2)
);

CREATE TABLE employee_formation_records (
  id                   UUID PRIMARY KEY,
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  label                TEXT NOT NULL,
  provider             TEXT,
  start_date           DATE,
  end_date             DATE,
  completed            BOOLEAN NOT NULL DEFAULT FALSE,
  evaluation_note      NUMERIC(5,2),
  evaluation_scale     TEXT,
  evaluation_comment   TEXT,
  certificate_received BOOLEAN
);

CREATE TABLE employee_disciplinary_records (
  id                  UUID PRIMARY KEY,
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_type         TEXT NOT NULL,
  date                DATE NOT NULL,
  effective_date      DATE,
  end_date            DATE,
  reason              TEXT NOT NULL,
  facts               TEXT NOT NULL,
  legal_basis         TEXT,
  issued_by           TEXT,
  employee_response   TEXT,
  acknowledged        BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at     TIMESTAMPTZ,
  linked_document_id  TEXT REFERENCES employee_documents(id) ON DELETE SET NULL,
  severity            SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  status              TEXT NOT NULL
);

CREATE TABLE job_position_allowances (
  id               UUID PRIMARY KEY,
  job_position_id  UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  allowance_type   TEXT NOT NULL,
  label            TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  currency         currency NOT NULL,
  taxable          BOOLEAN NOT NULL DEFAULT TRUE,
  cotisable        BOOLEAN NOT NULL DEFAULT TRUE,
  start_date       DATE,
  end_date         DATE,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE movements (
  id              UUID PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  movement_type   movement_type NOT NULL,
  date            DATE NOT NULL,
  from_position   TEXT,
  to_position     TEXT,
  from_department TEXT,
  to_department   TEXT,
  from_salary     NUMERIC(12,2),
  to_salary       NUMERIC(12,2),
  reason          TEXT NOT NULL,
  legal_basis     TEXT,
  approved_by     TEXT,
  effective_date  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Paie ──────────────────────────────────────────────────────────────────────

CREATE TABLE payslip_template (
  id                  SMALLINT PRIMARY KEY CHECK (id = 1),
  title               TEXT NOT NULL,
  accent_color        TEXT NOT NULL,
  header_bg           TEXT NOT NULL,
  border_color        TEXT NOT NULL,
  body_bg             TEXT NOT NULL,
  text_color          TEXT NOT NULL,
  header_text_color   TEXT NOT NULL,
  footer_note         TEXT NOT NULL DEFAULT '',
  layout              TEXT NOT NULL DEFAULT 'classic',
  table_style         TEXT NOT NULL DEFAULT 'plain',
  header_style        TEXT NOT NULL DEFAULT 'dark',
  font_family         TEXT NOT NULL,
  font_size           INTEGER NOT NULL DEFAULT 13,
  border_radius       INTEGER NOT NULL DEFAULT 8,
  max_width           INTEGER NOT NULL DEFAULT 720,
  show_situation      BOOLEAN NOT NULL DEFAULT TRUE,
  show_pointage       BOOLEAN NOT NULL DEFAULT TRUE,
  show_cnss_block     BOOLEAN NOT NULL DEFAULT TRUE,
  show_company_logo   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payslip_archives (
  id           UUID PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  archived_at  TIMESTAMPTZ NOT NULL,
  file_ref     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  net_salary   NUMERIC(12,2) NOT NULL,
  currency     currency NOT NULL,
  UNIQUE (employee_id, period)
);

-- ── Utilisateurs & audit (futur) ──────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  prenom        TEXT NOT NULL,
  nom           TEXT NOT NULL,
  poste         TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  telephone     TEXT,
  avatar_color  TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  module      TEXT NOT NULL,
  can_read    BOOLEAN NOT NULL DEFAULT TRUE,
  can_write   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  can_export  BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, module, role)
);

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  summary       TEXT NOT NULL,
  metadata_json JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE file_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type     TEXT,
  byte_size     BIGINT,
  owner_type    TEXT NOT NULL,
  owner_id      TEXT,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index principaux ──────────────────────────────────────────────────────────

CREATE INDEX idx_employees_matricule ON employees(matricule);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department_name);
CREATE INDEX idx_employees_position_id ON employees(position_id);
CREATE INDEX idx_movements_employee_date ON movements(employee_id, date DESC);
CREATE INDEX idx_payslip_archives_period ON payslip_archives(period);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMIT;

-- ── Données initiales ───────────────────────────────────────────────────────

INSERT INTO app_meta (id, seed_version, schema_version)
VALUES (1, 0, '1.0.0-draft')
ON CONFLICT (id) DO NOTHING;
`;

// -----------------------------------------------------------------------------
// Points ouverts pour validation
// -----------------------------------------------------------------------------

export const MIGRATION_OPEN_QUESTIONS = [
  "PostgreSQL confirmé ? (SQLite possible en dev local)",
  "Conserver department_name en texte sur employees/job_positions (dénormalisé) ou FK strict uniquement ?",
  "Fusionner employees[].movements[] et Database.movements[] — quelle source fait foi ?",
  "grades : enum PostgreSQL ou table de référence modifiable ?",
  "Bulletins calculés : stocker PayrollResult en JSON ou recalculer à la volée ?",
  "Authentification users : email/mot de passe, SSO, ou les deux ?",
  "Rétention audit_logs : durée légale / archivage froid ?",
] as const;
