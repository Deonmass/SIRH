# SIRH RDC — Documentation technique

Système de Gestion des Ressources Humaines pour la **République Démocratique du Congo**, conforme au Code du travail (Loi n°015/2002, modifiée par la Loi n°16/010/2016) et au Guide Complet RH RDC (édition 2026).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture applicative](#3-architecture-applicative)
4. [Modules fonctionnels](#4-modules-fonctionnels)
5. [Authentification et permissions](#5-authentification-et-permissions)
6. [Structure du projet](#6-structure-du-projet)
7. [Base de données](#7-base-de-données)
8. [Migrations SQL](#8-migrations-sql)
9. [Variables d'environnement](#9-variables-denvironnement)
10. [Développement local](#10-développement-local)
11. [Déploiement en production](#11-déploiement-en-production)
12. [Scripts utilitaires](#12-scripts-utilitaires)
13. [Fichiers et stockage](#13-fichiers-et-stockage)
14. [API REST](#14-api-rest)
15. [Avertissements](#15-avertissements)

---

## 1. Vue d'ensemble

L'application couvre l'ensemble du cycle de vie RH :

| Domaine | Fonctionnalités |
|---------|-----------------|
| **Tableau de bord** | KPIs effectifs, masse salariale, alertes (CDD, essai, dossiers incomplets, congés) |
| **Employés** | Statuts (candidat → actif → sorti), fiche dossier complète, parcours en 12 étapes |
| **Postes** | Fiches de poste, organigramme, postes vacants, types de mouvement |
| **Mouvements** | Affectation, promotion, mutation, avenants, sorties |
| **Documents** | Checklist CNSS, ONEM, contrat, identité, pièces jointes |
| **Paie** | Simulateur RDC (CNSS, IPR, INPP, ONEM, heures sup), bulletins PDF, clôture mensuelle |
| **Congés** | Demandes, validation, soldes (art. 141 Code du travail), calendrier |
| **Pointage** | Feuilles mensuelles, présences, retards, heures supplémentaires |
| **Formations** | Catalogue, participants, évaluations |
| **Conformité** | CNSS, ONEM, INPP, checklists réglementaires |
| **Juridique** | Articles du Code du travail consultables, cas juridiques |
| **Utilisateurs** | Comptes, matrice de permissions granulaire, journal d'activité |
| **Paramètres** | Entreprise, barèmes SMIG, taux sociaux, départements, grades |

### Deux modes de persistance

L'application bascule automatiquement selon la configuration :

| Mode | Condition | Stockage |
|------|-----------|----------|
| **Local (développement)** | Variables Supabase absentes | Fichier `data/db.json` (créé automatiquement avec ~100 employés démo) |
| **Production (Supabase)** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` définis | PostgreSQL hébergé sur Supabase |

La détection se fait via `isSupabaseConfigured()` dans `src/lib/supabase/env.ts`.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Langage | TypeScript 5 |
| Base de données | PostgreSQL (Supabase) ou JSON local |
| Auth | Cookie signé HMAC (`sirh-session`), sessions 7 jours |
| Graphiques | Recharts |
| Export | jsPDF, html2canvas-pro, ExcelJS |
| Dates | date-fns |
| Client DB | `@supabase/supabase-js`, `@supabase/ssr` |

---

## 3. Architecture applicative

```
┌─────────────────────────────────────────────────────────────┐
│  Navigateur (React Client Components)                       │
│  ├── AuthContext, PermissionGate, RoutePermissionGuard      │
│  └── Modules UI (employés, paie, congés, …)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch / navigation
┌──────────────────────────▼──────────────────────────────────┐
│  Next.js Middleware (src/middleware.ts)                     │
│  ├── Vérification cookie session                          │
│  ├── Contrôle accès pages (permissions)                   │
│  └── Contrôle accès API (méthode HTTP + section)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  API Routes (src/app/api/**/route.ts)                     │
│  └── Logique métier via src/lib/store.ts                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐              ┌──────────────────────┐
│  data/db.json    │              │  Supabase PostgreSQL │
│  (mode local)    │              │  (mode production)   │
└──────────────────┘              └──────────────────────┘
```

### Couches logiques (`src/lib/`)

| Dossier | Rôle |
|---------|------|
| `repositories/` | Accès données Supabase (CRUD par entité) |
| `auth/` | Sessions, mots de passe, contrôle d'accès |
| `payroll*.ts`, `payslip*.ts` | Moteur de paie et bulletins RDC |
| `conges-*.ts` | Soldes, validation, jours ouvrables |
| `permissions.ts` | Catalogue des modules et matrice |
| `store.ts` | Façade unifiée local / Supabase |
| `types.ts` | Types TypeScript partagés |
| `supabase/` | Client serveur et configuration |

---

## 4. Modules fonctionnels

### 4.1 Employés (`/employes`)

- **Dashboard** : effectifs par statut, alertes dossiers
- **Liste** : recherche, filtres, masquage salaires selon permissions
- **Nouvel employé** : création avec workflow 12 étapes (recrutement + intégration légale)
- **Fiche dossier** (`/employes/[id]`) : onglets Profil, Coordonnées, Documents, Famille, Congés, Formations, Discipline, Paie, Postes/Mouvements, Historique
- **Checking documents** : conformité documentaire globale
- **Départements** : référentiel et vue par département

**Statuts employé** : `candidat`, `pre_embauche`, `essai`, `actif`, `conge`, `suspendu`, `preavis`, `sorti`, `licencie`

### 4.2 Postes (`/postes`)

- Fiches de poste avec package paie JSON (`poste_paie`)
- Organigramme hiérarchique (`sup_code`)
- Postes vacants et affectation
- Types de mouvement configurables

### 4.3 Mouvements (`/mouvements`)

Journal des événements RH : embauche, promotion, mutation, avenants, suspension, licenciement, etc.

En mode Supabase, l'historique est stocké dans `employes.mouvement` (JSONB) ; la table `mouvements` existe en parallèle pour certains flux API.

### 4.4 Paie (`/paie`)

- **Simulateur** : calcul brut → net (CNSS 5 %/13 %, IPR, INPP, ONEM, prime de vie chère, heures sup 130 %/160 %/200 %)
- **Exploitation** : runs mensuels, clôture pointage → paie
- **Bulletins** : génération PDF personnalisable (template)
- **Grille coûts extra** : logement, transport, enfants, etc.

### 4.5 Congés (`/conges`)

- Demandes avec double validation (`validateur_1`, `validateur_2`)
- Soldes acquis/pris/restant (art. 141)
- Calendrier et dashboard

### 4.6 Pointage (`/pointage`)

Feuilles mensuelles par employé (`YYYY-MM`) : jours prestés, maladie, congés, fériés, heures sup.

### 4.7 Formations (`/formations`)

Sessions avec participants en JSONB, évaluations et certificats.

### 4.8 Conformité (`/conformite`)

Sous-modules CNSS (masse cotisable, délais, checklist mensuelle), ONEM, INPP, checklists générales.

### 4.9 Juridique & Guide (`/juridique`, `/guide`)

Référentiel articles Code du travail (`public/data/code-travail-articles.json`), PDFs de référence dans `public/docs/`.

### 4.10 Paramètres (`/parametres`)

Configuration par sections stockées dans la table `configuration` (JSONB) :

- Entreprise (nom, RCCM, logo, SMIG, taux de change)
- CNSS / INPP / ONEM / IRPP (barèmes)
- Départements, grades, catégories
- Congés & préavis, heures supplémentaires
- Externes & journaliers

### 4.11 Utilisateurs (`/utilisateurs`)

- Comptes avec username / mot de passe hashé
- Matrice de permissions par module et action (read, write, delete, export)
- Permission transversale `salaires.montants` pour masquer les montants
- Compte **Admin** : accès total automatique (insensible à la casse)

---

## 5. Authentification et permissions

### Connexion

1. POST `/api/auth/login` avec `{ username, password }`
2. Vérification en base (`utilisateurs` ou `db.json`)
3. Cookie `sirh-session` signé HMAC-SHA256 (durée : 7 jours)
4. Redirection vers la première page autorisée

### Compte par défaut (développement local)

| Champ | Valeur |
|-------|--------|
| Identifiant | `Admin` |
| Mot de passe | `123` |

> **Important** : changer ce mot de passe et définir `AUTH_SECRET` en production.

### Middleware

Fichier : `src/middleware.ts`

- Pages publiques : `/login`, `/api/auth/login`
- Assets statiques : `/_next`, `/uploads`, fichiers avec extension
- Non authentifié → redirection `/login?next=...`
- Authentifié sans permission → `/access-denied`
- API protégée par règles dans `src/lib/auth/access-control.ts`

### Matrice de permissions

Définie dans `src/lib/permissions.ts`. Chaque section (ex. `employes.liste`, `paie.bulletins`) accepte les actions :

- `read` — Consulter
- `write` — Modifier
- `delete` — Supprimer
- `export` — Exporter (PDF, tableaux)

---

## 6. Structure du projet

```
app/
├── database/
│   ├── migration.sql          # Schéma cible normalisé (draft, UUID + FK)
│   └── migrations/            # Migrations incrémentales Supabase (001–024)
├── data/
│   └── db.json                # Base locale (gitignored, auto-généré)
├── public/
│   ├── data/                  # Articles Code du travail (JSON)
│   ├── docs/                  # PDFs juridiques
│   └── uploads/               # Documents uploadés (gitignored)
├── scripts/
│   ├── check-supabase.mjs     # Test connexion Supabase
│   ├── run-sql-migration.mjs  # Exécution SQL sur Postgres
│   └── extract-code-travail.py
├── src/
│   ├── app/                   # Pages et API Routes (App Router)
│   ├── components/            # Composants React par module
│   ├── contexts/              # AuthContext, etc.
│   ├── lib/                   # Logique métier, repositories, auth
│   └── middleware.ts          # Garde d'authentification
├── package.json
├── next.config.ts
└── DOCUMENTATION.md           # Ce fichier
```

---

## 7. Base de données

### 7.1 Schéma en production (migrations 001–024)

Le schéma Supabase actuel utilise des **liaisons logiques par TEXT** (matricule, code poste) plutôt que des clés étrangères strictes, avec des colonnes **JSONB/TEXT** pour les données riches.

#### Diagramme des relations logiques

```
departements ──(libelle/code)──► postes.dept
                                    │
                                    │ code_poste
                                    ▼
employes ◄──(matricule)── mouvements / famille / conges / pointage / paie
    │
    ├── mouvement (JSONB)     — historique RH + poste actuel
    ├── coordonnees (JSONB)   — historique adresses/contacts
    ├── document (JSONB)      — checklist documents
    ├── solde_conge (TEXT)    — soldes JSON
    ├── conges (TEXT)         — demandes/historique JSON
    ├── formations (TEXT)     — formations individuelles JSON
    └── discipline (TEXT)     — sanctions JSON

formations (table)            — catalogue sessions + participation JSONB
configuration (table)         — paramètres par section JSONB
utilisateurs (table)          — comptes + permissions JSONB
```

#### Table `departements`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `code` | TEXT UNIQUE | Code court (ex. `RH`) |
| `libelle` | TEXT UNIQUE | Intitulé affiché |
| `ordre` | INTEGER | Ordre d'affichage |
| `actif` | BOOLEAN | Actif/inactif |
| `description` | TEXT | Description |
| `cree_le`, `modif_le` | TIMESTAMPTZ | Audit |
| `cree_par`, `modif_par` | TEXT | Auteur |

**Données initiales** : DG, RH, FIN, COM, OPS, IT, LOG, JUR (migration 002).

#### Table `postes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `code` | TEXT UNIQUE | Ex. `POSTE-RH-2026-0042` |
| `titre` | TEXT | Intitulé du poste |
| `dept` | TEXT | Département (lien logique) |
| `grade` | ENUM | Direction → Ouvrier |
| `sup_code` | TEXT | Code poste supérieur |
| `statut` | ENUM | draft, active, vacant, archived |
| `type_contrat` | ENUM | CDI, CDD, apprentissage, stage, consultant |
| `type_emp` | TEXT | interne, externe, journalier |
| `effectif` | INTEGER | Nombre de postes |
| `description`, `missions`, `exigences`, `competences_cles`, `kpi` | TEXT | Fiche de poste |
| `poste_paie` | JSONB | Package rémunération (base, devise, avantages…) |
| Audit | TIMESTAMPTZ/TEXT | cree_le, modif_le, cree_par, modif_par |

#### Table `employes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `matricule` | TEXT UNIQUE | Ex. `RDC-2026-0003` |
| `nom`, `post_nom`, `prenom` | TEXT | Identité |
| `sexe` | ENUM | M, F |
| `date_naiss`, `lieu_naiss` | DATE/TEXT | Naissance |
| `nationalite` | TEXT | Défaut : Congolaise (RDC) |
| `statut_mat` | ENUM | État civil |
| `statut` | TEXT | Statut RH (candidat → licencié) |
| `adresse`, `email_pro`, `tel` | TEXT | Coordonnées de base |
| `mouvement` | JSONB | Journal mouvements + coûts extra |
| `coordonnees` | JSONB | Historique coordonnées |
| `document` | JSONB | Checklist documents |
| `solde_conge` | TEXT | Soldes congé JSON |
| `conges` | TEXT | Demandes congés JSON |
| `formations` | TEXT | Formations individuelles JSON |
| `discipline` | TEXT | Historique disciplinaire JSON |
| Audit | TIMESTAMPTZ/TEXT | cree_le, modif_le, cree_par, modif_par |

#### Table `famille`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `matricule_employe` | TEXT | Lien → employes.matricule |
| `lien` | ENUM | pere, mere, conjoint, enfant, autre |
| `sexe`, `nom`, `prenom`, `date_naiss` | | Identité membre |
| `a_charge`, `scolarise` | BOOLEAN | Charges familiales |
| `jugement_recu`, `jugement_fichier`, `jugement_nom` | | Pièces garde d'enfants |

#### Table `mouvements`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `code_mouvement` | TEXT UNIQUE | Ex. `MVT-RH-2026-0042` |
| `matricule_employe` | TEXT | Lien employé |
| `code_poste` | TEXT | Lien poste (nullable) |
| `type_mouvement` | ENUM | 20 types (affectation, promotion, licenciement…) |
| `date_mouvement` | DATE | Date d'effet |
| `document_annexe` | TEXT | Chemin/URL pièce jointe |

#### Table `conges`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGSERIAL | Clé primaire |
| `matricule_employe` | TEXT | Lien employé |
| `type` | TEXT | annuel, maladie, maternité, etc. |
| `date_debut`, `date_fin` | DATE | Période |
| `jours` | INTEGER | Nombre de jours |
| `statut` | TEXT | demande, approuve, refuse, etc. |
| `validateur_1`, `validateur_2` | TEXT | Validateurs RH |
| `notes` | TEXT | Commentaires |

#### Table `formations`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire |
| `titre` | TEXT | Intitulé session |
| `date_debut`, `date_fin` | DATE | Période |
| `niveau`, `instructeur`, `commentaire` | TEXT | Métadonnées |
| `participation` | JSONB | Liste participants + évaluations |

#### Table `pointage`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire |
| `matricul_employe` | TEXT | Lien employé |
| `mois_annee` | TEXT | Format `YYYY-MM` (unique par employé/mois) |
| `pointage` | TEXT | JSON : jours[], synthèse, verrouillage |
| `cree_le`, `modif_le` | TIMESTAMPTZ | Audit |

#### Table `paie`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire |
| `matricul_employe` | TEXT | Lien employé |
| `paie` | TEXT | JSON : mois, statut, synthèse, config paie, résultat |
| `created_at`, `updated_at` | TIMESTAMPTZ | Audit |
| `created_by`, `updated_by` | TEXT | Auteur |

#### Table `configuration`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire |
| `titre_config` | TEXT UNIQUE | Ex. `Entreprise`, `CNSS / INPP / ONEM / IRPP` |
| `params` | JSONB | Paramètres de la section |
| `updated_at`, `updated_by` | TIMESTAMPTZ/TEXT | Audit |

#### Table `utilisateurs`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire |
| `username` | TEXT UNIQUE | Identifiant de connexion |
| `passeword` | TEXT | Hash scrypt ou sha256 |
| `matricul_agent` | TEXT | Lien optionnel vers un employé |
| `permissions` | JSONB | Matrice de permissions |
| `statut` | TEXT | `actif` ou `inactif` |
| `created_at`, `updated_at` | TIMESTAMPTZ | Audit |
| `created_by`, `updated_by` | TEXT | Auteur |

### 7.2 Schéma cible (`database/migration.sql`)

Fichier **draft** décrivant un modèle normalisé futur avec :

- Types ENUM PostgreSQL complets
- Clés étrangères UUID entre entités
- Tables relationnelles : `employees`, `job_positions`, `movements`, `employee_documents`, `payslip_archives`, `users`, `audit_logs`, etc.
- Singletons : `organization_settings`, `payslip_template`, `app_meta`

> Ce schéma n'est **pas** celui actuellement utilisé par l'application en production. Il sert de référence pour une migration future vers un modèle relationnel complet.

### 7.3 Mode local (`data/db.json`)

Structure JSON monolithique :

```json
{
  "employees": [],
  "positions": [],
  "movements": [],
  "settings": {},
  "payslipTemplate": {},
  "payslipArchives": [],
  "utilisateurs": [],
  "seedVersion": 4
}
```

Créé automatiquement au premier démarrage avec 100 employés et postes de démonstration.

---

## 8. Migrations SQL

### Ordre d'exécution (Supabase)

Exécuter les fichiers **dans l'ordre numérique** :

| # | Fichier | Objet |
|---|---------|-------|
| 001 | `001_postes.sql` | Table postes + enums |
| 002 | `002_departements.sql` | Table départements + seed |
| 003 | `003_employes.sql` | Table employés (profil) |
| 004 | `004_mouvements.sql` | Table mouvements |
| 005 | `005_famille.sql` | Table famille |
| 006 | `006_employes_mouvement_jsonb.sql` | Colonne `employes.mouvement` |
| 007 | `007_employes_statut.sql` | Colonne `employes.statut` |
| 008 | `008_employes_coordonnees.sql` | Colonne `employes.coordonnees` |
| 009 | `009_employes_document.sql` | Colonne `employes.document` |
| 010 | `010_conges.sql` | Table conges |
| 012 | `012_employes_solde_conge.sql` | Colonne `employes.solde_conge` |
| 014 | `014_employes_conges.sql` | Colonne `employes.conges` |
| 015 | `015_employes_schema_sync.sql` | Sync colonnes manquantes |
| 016 | `016_employes_formations.sql` | Colonne `employes.formations` |
| 017 | `017_formations_table.sql` | Table formations |
| 018 | `018_employes_discipline.sql` | Colonne `employes.discipline` |
| 019 | `019_pointage_table.sql` | Table pointage |
| 020 | `020_pointage_timestamps.sql` | Audit pointage |
| 021 | `021_paie_table.sql` | Table paie |
| 022 | `022_configuration.sql` | Table configuration |
| 023 | `023_utilisateurs.sql` | Table utilisateurs |
| 024 | `024_utilisateurs_actif.sql` | Colonne `utilisateurs.statut` |

Chaque migration a un fichier `.types.ts` associé documentant les structures TypeScript.

### Méthodes d'exécution

**Option A — Script Node (recommandé en local/CI)**

```bash
npm run db:migrate -- database/migrations/001_postes.sql
# Répéter pour chaque fichier dans l'ordre
```

**Option B — Supabase SQL Editor**

1. Ouvrir le projet Supabase → **SQL Editor**
2. Coller le contenu de chaque fichier migration
3. Exécuter dans l'ordre

**Option C — Schéma complet draft**

```bash
npm run db:migrate -- database/migration.sql
```

> Utiliser uniquement sur une base vide, après validation métier.

### Vérification post-migration

```bash
npm run db:check
```

Réponses attendues :
- `✅ Connexion OK — schéma détecté` si `app_meta` existe (schéma draft)
- `✅ Connexion Supabase OK` si connexion OK mais schéma incrémental

Endpoint HTTP : `GET /api/health/supabase`

---

## 9. Variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# ── Supabase (obligatoire en production) ──────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# ── Migrations SQL (optionnel, pour npm run db:migrate) ───────
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
# OU alternative :
SUPABASE_DB_PASSWORD=<database-password>

# ── Sécurité (obligatoire en production) ─────────────────────
AUTH_SECRET=<chaîne-aléatoire-longue-min-32-caractères>

# ── Overrides DB (rarement nécessaires) ───────────────────────
# SUPABASE_DB_HOST=db.<ref>.supabase.co
# SUPABASE_DB_USER=postgres
# SUPABASE_DB_NAME=postgres
# SUPABASE_DB_PORT=5432
```

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Clé publique anon |
| `AUTH_SECRET` | Production | Secret HMAC pour les cookies de session |
| `DATABASE_URL` | Migrations | Connexion Postgres directe |
| `SUPABASE_DB_PASSWORD` | Migrations | Alternative à DATABASE_URL |

> Les fichiers `.env*` sont dans `.gitignore` — ne jamais les committer.

---

## 10. Développement local

### Prérequis

- Node.js 20+
- npm

### Installation et démarrage

```bash
cd app
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

Sans variables Supabase, l'application utilise `data/db.json` automatiquement.

### Connexion locale

| Identifiant | Mot de passe |
|-------------|--------------|
| `Admin` | `123` |

### Commandes utiles

```bash
npm run dev      # Serveur de développement (Turbopack)
npm run build    # Build production
npm run start    # Serveur production (après build)
npm run lint     # ESLint
npm run db:check # Vérifier Supabase
```

### Développement avec Supabase local

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer URL et clé anon (Settings → API)
3. Récupérer le mot de passe DB (Settings → Database)
4. Créer `.env.local` avec les variables
5. Exécuter les migrations (section 8)
6. Créer un utilisateur admin en SQL :

```sql
INSERT INTO utilisateurs (username, passeword, permissions, statut, created_by)
VALUES (
  'admin',
  'sha256$<hash-sha256-du-mot-de-passe>',
  '{}'::jsonb,
  'actif',
  'SYSTEM'
);
```

Le compte `admin` reçoit automatiquement toutes les permissions via le code applicatif.

---

## 11. Déploiement en production

### 11.1 Prérequis infrastructure

| Composant | Service recommandé |
|-----------|-------------------|
| Application Next.js | Vercel, Railway, Docker, VPS |
| Base de données | Supabase (PostgreSQL managé) |
| Fichiers uploadés | Stockage persistant ou Supabase Storage (actuellement : `public/uploads/`) |

### 11.2 Procédure complète

#### Étape 1 — Projet Supabase

1. Créer un projet Supabase (région proche des utilisateurs)
2. Noter : Project URL, anon key, database password
3. Activer **Row Level Security** si nécessaire (l'app utilise la clé anon côté serveur)

#### Étape 2 — Migrations base de données

```bash
# Depuis la machine de déploiement ou en local avec .env.local configuré
for f in database/migrations/*.sql; do
  npm run db:migrate -- "$f"
done
```

Ou exécuter manuellement dans l'ordre via SQL Editor.

#### Étape 3 — Compte administrateur

Créer le premier utilisateur dans Supabase SQL Editor (voir section 10) ou via l'interface une fois connecté avec un compte seed.

#### Étape 4 — Variables d'environnement production

Sur la plateforme d'hébergement, configurer :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AUTH_SECRET=<générer avec: openssl rand -base64 32>
NODE_ENV=production
```

#### Étape 5 — Build et déploiement

**Vercel (recommandé pour Next.js)**

```bash
npm run build   # Test local du build
```

1. Connecter le dépôt Git à Vercel
2. Framework Preset : Next.js
3. Root Directory : `app` (si monorepo) ou racine
4. Ajouter les variables d'environnement
5. Déployer

**VPS / Docker**

```bash
npm ci
npm run build
npm run start   # Port 3000 par défaut
```

Configurer un reverse proxy (Nginx/Caddy) avec HTTPS devant le port 3000.

**Exemple service systemd**

```ini
[Unit]
Description=SIRH RDC
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/sirh-rdc/app
Environment=NODE_ENV=production
EnvironmentFile=/var/www/sirh-rdc/.env.local
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

#### Étape 6 — Vérifications post-déploiement

| Test | Commande / URL |
|------|----------------|
| Santé Supabase | `GET /api/health/supabase` |
| Connexion | `/login` avec compte admin |
| Permissions | Accéder à `/utilisateurs/permissions` |
| Données | Créer un employé test, vérifier en base |
| Upload | Joindre un document sur une fiche employé |

#### Étape 7 — Sécurisation

- [ ] `AUTH_SECRET` unique et long (≥ 32 caractères)
- [ ] Mot de passe admin changé
- [ ] HTTPS activé
- [ ] Sauvegardes Supabase activées (Settings → Database → Backups)
- [ ] Limiter l'accès au SQL Editor Supabase
- [ ] Vérifier les permissions des comptes RH (principe du moindre privilège)

### 11.3 Mises à jour applicatives

```bash
git pull
npm ci
npm run build
# Redémarrer le service ou redéployer sur Vercel
```

Pour les évolutions de schéma, exécuter uniquement les **nouvelles** migrations SQL non encore appliquées.

### 11.4 Sauvegarde et restauration

**Supabase** : backups automatiques (plan payant) ou export manuel via `pg_dump` :

```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

**Mode local** : copier `data/db.json` et `public/uploads/`.

---

## 12. Scripts utilitaires

| Script | Commande | Description |
|--------|----------|-------------|
| `check-supabase.mjs` | `npm run db:check` | Teste la connexion et détecte le schéma |
| `run-sql-migration.mjs` | `npm run db:migrate -- <fichier>` | Exécute un fichier SQL sur Postgres |
| `extract-code-travail.py` | `npm run extract:code-travail` | Extrait les articles du Code du travail en JSON |

---

## 13. Fichiers et stockage

### Uploads

- **Chemin** : `public/uploads/`
- **Git** : ignoré (`.gitignore`)
- **Types acceptés** : PDF, JPEG, PNG, WebP, DOC/DOCX
- **Taille max** : 10 Mo par fichier
- **Usage** : documents employés, pièces mouvements

> En production multi-instances (Vercel serverless), prévoir un stockage externe (Supabase Storage, S3) — les uploads locaux ne sont pas partagés entre instances.

### Documents de référence

| Fichier | Contenu |
|---------|---------|
| `public/data/code-travail-articles.json` | Articles searchable |
| `public/docs/code-du-travail.pdf` | Code du travail PDF |
| `public/docs/Guide_Complet_RH_RDC.docx` | Guide RH |

---

## 14. API REST

Toutes les routes sous `/api/` (sauf auth et health) nécessitent une session valide et les permissions appropriées.

### Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/session` | Session courante |

### Principales routes métier

| Préfixe | Entité |
|---------|--------|
| `/api/dashboard` | KPIs tableau de bord |
| `/api/employees` | CRUD employés, dossier, famille, documents |
| `/api/departements` | Départements |
| `/api/postes` | Fiches de poste |
| `/api/movements` | Mouvements RH |
| `/api/conges` | Congés |
| `/api/pointage` | Pointage mensuel |
| `/api/paie/*` | Paie, bulletins, masse salariale, clôture |
| `/api/formations` | Formations |
| `/api/settings` | Configuration globale |
| `/api/utilisateurs` | Comptes utilisateurs |
| `/api/compliance` | Conformité |
| `/api/juridique/cases` | Cas juridiques |
| `/api/health/supabase` | Santé connexion DB |

Les règles de permission par route sont définies dans `src/lib/auth/access-control.ts`.

---

## 15. Avertissements

1. **Outil de gestion et formation RH** — Les taux IPR, SMIG et barèmes doivent être vérifiés auprès de la DGI, CNSS, INPP et ONEM avant usage en production.

2. **Schéma en évolution** — Le fichier `database/migration.sql` (draft UUID) et les migrations incrémentales (001–024) coexistent. L'application utilise le schéma incrémental.

3. **Sécurité mots de passe** — Les hash `sha256$` sont acceptés pour compatibilité ; privilégier le format `scrypt$` pour les nouveaux comptes.

4. **Données personnelles** — L'application traite des données RH sensibles. Respecter la législation congolaise sur la protection des données et les bonnes pratiques de sécurité.

---

*Documentation générée pour SIRH RDC — version applicative 0.1.0 (Next.js 16.2.6)*
