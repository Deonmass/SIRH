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
