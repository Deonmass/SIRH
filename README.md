# SIRH RDC — Système de Gestion des Ressources Humaines

Application RH complète pour la **République Démocratique du Congo**, basée sur :

- **Loi n°015/2002** portant Code du travail (modifiée par la Loi n°16/010/2016)
- **Guide Complet RH RDC** (édition 2026)
- Références : *Droit congolais du travail* (Masanga Phoba Mvioki), Codes Larcier t. IV

## Documentation

Documentation technique complète : architecture, modules, **structure de la base de données**, migrations SQL et **procédure de déploiement** → **[DOCUMENTATION.md](./DOCUMENTATION.md)**

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Tableau de bord** | KPIs effectifs, masse salariale, alertes (CDD, essai, dossiers, congés) |
| **Employés** | Statuts (candidat → actif → sorti), fiche complète |
| **Parcours pas à pas** | 12 étapes : recrutement 7 + intégration légale |
| **Documents** | Checklist CNSS, ONEM, contrat, identité… |
| **Simulateur paie** | CNSS 5%/13%, IPR, INPP, ONEM, heures sup |
| **Mouvements** | Promotion, mutation, augmentation, licenciement |
| **Famille** | Constitution familiale, allocations |
| **Juridique** | Base articles Code du travail searchable |
| **Guide RH** | Checklists, congés circonstance, calendrier paie |

## Démarrage

```bash
cd app
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

**Connexion locale** : identifiant `Admin`, mot de passe `123`.

Sans configuration Supabase, les données sont stockées dans `data/db.json` (créé automatiquement avec des employés de démonstration). En production, configurer Supabase — voir [DOCUMENTATION.md](./DOCUMENTATION.md).

## Stack

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- Persistance : JSON local (`data/db.json`) ou PostgreSQL (Supabase)

## Avertissement

Outil de gestion et formation RH. Les taux IPR, SMIG et barèmes doivent être vérifiés auprès de la DGI, CNSS, INPP et ONEM.
