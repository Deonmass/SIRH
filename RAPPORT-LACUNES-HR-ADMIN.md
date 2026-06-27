# Rapport — Lacunes SIRH vs missions HR Admin (PPC Barnet / Kimpese)

*Généré le 3 juin 2026 — comparaison entre le poste HR Admin industriel et l'état actuel de l'application.*

---

## Contexte

Poste visé : **HR Admin à l'usine de Malanga (Kimpese)** — administration du personnel, support RH, conformité, proximité terrain.

Ce document liste ce qui **n'est pas encore (ou à peine) géré** dans le SIRH, par rapport aux missions typiques et aux priorités PPC Barnet.

---

## Missions RH classiques — lacunes

### 1. Présences / pointage opérationnel

- **Pas de module de présence** (saisie quotidienne, feuilles de temps, retards, heures sup).
- Le **pointage** existe seulement dans le **simulateur de paie** et les bulletins (jours prestés, maladie, etc.), pas comme suivi terrain mensuel par l'usine.

### 2. Absences (hors congés)

- Pas de module **absences justifiées / non justifiées**.
- Seuls des champs compteurs existent dans le dossier (`absencesJustifiees`, `absencesNonJustifiees`) sans workflow ni rapports.

### 3. Contrats — préparation et suivi

- **Pas de générateur de contrats / avenants** (modèles Word/PDF, dates, renouvellements, alertes d'échéance).
- Existant : type de contrat sur la fiche de poste, n° contrat dans le dossier, pièce « contrat » dans la checklist documents — mais **pas de cycle contrat complet**.

### 4. Paie — exploitation mensuelle réelle

- **Simulateur**, **bulletins** et **grille des coûts** existent.
- Manque typiquement : **clôture mensuelle**, validation RH → paie, **virements bancaires**, interface compta, historique des runs de paie, anomalies de masse salariale par site.

### 5. Archivage documentaire structuré

- Upload + checklist documents : **oui**.
- **Archivage réglementaire** (durées de conservation 5 ans, classement physique/numérique par nature, purge automatique) : **non automatisé** (mentionné en texte conformité, pas en processus).

### 6. Recrutement et intégration

- **Partiel** : statuts `candidat` / `pre_embauche`, workflow d'onboarding (cases à cocher), pipeline sur le dashboard, page « Nouvel employé ».
- **Manque** : module recrutement dédié (offres, entretiens, shortlist, décision, kit d'accueil J1/J30 structuré, parcours manager).

### 7. Rapports RH exportables

- Dashboards (headcount, turnover, départements, etc.) : **oui dans l'app**.
- **Exports Excel/PDF**, rapports planifiés, tableaux pour direction PPC : **non**.

### 8. Conformité réglementaire — module isolé

- Pages **Conformité** (CNSS, ONEM, INPP, checklist) : **développées** mais **absentes du menu principal** (sidebar).
- Pas de **déclarations réelles** vers CNSS/ONEM — seulement contrôles et indicateurs internes.

---

## Spécifique PPC Barnet / Kimpese — lacunes

### 9. HSE (Hygiène, Sécurité, Environnement)

- **Aucun module HSE** : accidents, EPI, formations sécurité obligatoires, visites médicales périodiques, habilitations maintenance.
- La sécurité n'apparaît que dans des textes (discipline, guide juridique).

### 10. Multi-site (usine Kimpese vs siège Kinshasa)

- Champ **« Site / lieu »** sur les postes seulement.
- Pas de : filtrage par site, organigramme par usine, indicateurs RH « Malanga / Kimpese », périmètre RH terrain vs siège.

### 11. Performance et talents

- Onglet **Évaluations** basique (note, objectifs en texte libre).
- Pas de : campagnes d'évaluation, plans de développement, succession, compétences liées aux métiers production/maintenance/logistique.

### 12. Communication RH

- **Rien** : annonces internes, diffusion politiques RH, rappels procédures, notifications email/SMS aux managers.

### 13. Confidentialité et gouvernance

- Page **Permissions** : **placeholder** (« à configurer »).
- Pas d'**authentification réelle** ni de rôles opérationnels (HR Admin usine vs HR siège vs manager département).
- Option masquer les salaires : oui, mais gouvernance fine **incomplète**.

---

## Formations — point encore ouvert

### 14. Cohérence dossier ↔ table `formations`

- L'onglet Formation du dossier est branché sur le **catalogue `formations`** (participation via API) : **fait**.
- La **complétion du dossier** (`employee-dossier-completion`) regarde encore l'ancien `formationHistory` local — **pas synchronisé** avec les participations en base.
- Pas de **désinscription** depuis le dossier, ni de lien vers **cote / objectif** saisis côté gestion formations.

---

## Ce qui est déjà bien couvert

| Domaine | État |
|--------|------|
| Dossiers employés (profil, coordonnées, documents) | ✅ Solide |
| Postes, organigramme, affectations, mouvements | ✅ |
| Congés (solde, demandes, validations, dashboard) | ✅ Consolidé |
| Formations (catalogue, participants, dashboard) | ✅ Récent |
| Paie (simulation SMIG, bulletins) | ⚠️ Partiel |
| Tableaux de bord RH globaux | ⚠️ Partiel (sans export) |
| Guide juridique RDC | ✅ |
| Discipline / récompenses | ⚠️ Basique |

---

## Priorités recommandées (terrain Kimpese)

Pour coller au poste HR Admin industriel, les **plus gros trous** à combler :

1. **Présences + absences** (liés à la paie)
2. **Contrats et avenants**
3. **Clôture paie mensuelle**
4. **Conformité dans le menu + workflows CNSS/ONEM**
5. **Multi-site Kimpese**
6. **Recrutement / onboarding structuré**
7. **Exports rapports** (Excel)
8. **Permissions / confidentialité réelles**

---

## Période d'essai — rappel métier (hors applicatif)

Points à maîtriser côté terrain, en complément du SIRH :

1. Apprendre l'organigramme complet de l'usine
2. Connaître les responsables de chaque département
3. Maîtriser le règlement intérieur et les politiques RH
4. Comprendre le processus de paie
5. Se familiariser avec la législation du travail en RDC
6. Être rigoureux sur les documents et les délais

---

*Document de référence interne — à mettre à jour au fil des livraisons.*
