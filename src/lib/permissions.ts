/** Actions applicatives cochables dans la matrice de permissions. */
export const PERMISSION_ACTIONS = [
  "read",
  "write",
  "delete",
  "export",
  "validate1",
  "validate2",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Permission transversale : affichage des montants salariaux dans toute l'app. */
export const SALARY_VISIBILITY_SECTION = "salaires.montants";

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  read: "Consulter",
  write: "Modifier",
  delete: "Supprimer",
  export: "Exporter",
  validate1: "Valider niveau 1",
  validate2: "Valider niveau 2",
};

export type PermissionSectionMeta = {
  description?: string;
  /** Actions affichées dans la matrice (défaut : les 4 actions). */
  actions?: PermissionAction[];
  actionLabels?: Partial<Record<PermissionAction, string>>;
};

/** Libellés et aide contextuelle pour des sections sensibles ou atypiques. */
export const PERMISSION_SECTION_META: Record<string, PermissionSectionMeta> = {
  [SALARY_VISIBILITY_SECTION]: {
    description:
      "Sans cette permission, tous les montants salariaux sont masqués (•••••) partout dans l'application : listes employés, fiches rémunération, postes, paie, bulletins, dashboard, simulateur… indépendamment de l'accès aux pages Paie.",
    actions: ["read", "write", "export"],
    actionLabels: {
      read: "Voir les montants salariaux",
      write: "Saisir / modifier les rémunérations",
      export: "Exporter avec montants (PDF, tableaux…)",
    },
  },
  "conges.gestion": {
    description:
      "Validations niveau 1 et 2 réservées aux chefs de département : le compte doit être lié à un agent (matricule) et la validation ne concerne que les congés de son département. Le niveau 2 n'est possible qu'après signature du niveau 1.",
    actions: ["read", "write", "delete", "export", "validate1", "validate2"],
    actionLabels: {
      validate1: "Valider niveau 1 (chef de département)",
      validate2: "Valider niveau 2 (chef de département)",
    },
  },
  "pointage.saisie": {
    description:
      "La saisie concerne les jours passés ou le jour en cours encore vides. Modifier un jour déjà enregistré nécessite une permission distincte.",
    actions: ["read", "write", "validate1"],
    actionLabels: {
      write: "Saisir un jour vide",
      validate1: "Modifier un jour déjà enregistré",
    },
  },
  "sante.file-attente": {
    description:
      "La validation des visites (en attente / validé / rejeté) est réservée aux utilisateurs disposant de la permission « Valider niveau 1 ».",
    actions: ["read", "write", "delete", "validate1"],
    actionLabels: {
      validate1: "Valider ou rejeter une visite",
    },
  },
  "sante.dashboard": {
    description: "Indicateurs, graphiques et filtres des visites médicales.",
    actions: ["read"],
  },
  "sante.formulaire": {
    description: "Déclaration d'une visite médicale et envoi à la file d'attente.",
    actions: ["read", "write"],
  },
  "sante.hopitaux": {
    description: "Référentiel des hôpitaux affiliés.",
    actions: ["read", "write", "delete"],
  },
  rapports: {
    description:
      "Génération des rapports RH direction au format Excel, PDF (2 pages par section) et PowerPoint.",
    actions: ["read", "export"],
    actionLabels: {
      export: "Exporter rapports Excel / PDF / PowerPoint",
    },
  },
  "charroi.rapports": {
    description:
      "Génération des rapports Charroi (parc, courses, pannes, entretien) au format Excel, PDF et PowerPoint.",
    actions: ["read", "export"],
    actionLabels: {
      export: "Exporter rapports Charroi Excel / PDF / PowerPoint",
    },
  },
};

export type PermissionSection = {
  id: string;
  label: string;
};

export type PermissionModule = {
  id: string;
  label: string;
  sections: PermissionSection[];
};

/** Catalogue aligné sur la navigation (sidebar) et les fonctionnalités clés. */
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "remuneration",
    label: "Salaires & rémunérations",
    sections: [
      {
        id: SALARY_VISIBILITY_SECTION,
        label: "Voir les montants salariaux",
      },
    ],
  },
  {
    id: "dashboard",
    label: "Tableau de bord",
    sections: [{ id: "dashboard", label: "Vue d'ensemble" }],
  },
  {
    id: "rapports",
    label: "Rapports RH",
    sections: [{ id: "rapports", label: "Rapports direction" }],
  },
  {
    id: "employes",
    label: "Employés",
    sections: [
      { id: "employes.dashboard", label: "Dashboard employés" },
      { id: "employes.nouveau", label: "Nouvel employé" },
      { id: "employes.liste", label: "Liste des employés" },
      { id: "employes.departements", label: "Départements" },
      { id: "employes.documents", label: "Checking documents" },
      { id: "employes.mouvements", label: "Mouvements" },
    ],
  },
  {
    id: "sante",
    label: "Santé",
    sections: [
      { id: "sante.dashboard", label: "Dashboard" },
      { id: "sante.formulaire", label: "Formulaire" },
      { id: "sante.file-attente", label: "File d'attente" },
      { id: "sante.hopitaux", label: "Hôpitaux" },
    ],
  },
  {
    id: "charroi",
    label: "Charroi automobile",
    sections: [
      { id: "charroi.dashboard", label: "Dashboard" },
      { id: "charroi.vehicules", label: "Véhicules" },
      { id: "charroi.types-course", label: "Types de course" },
      { id: "charroi.planning", label: "Planning véhicule" },
      { id: "charroi.rapports", label: "Rapports Charroi" },
    ],
  },
  {
    id: "postes",
    label: "Postes",
    sections: [
      { id: "postes.dashboard", label: "Dashboard postes" },
      { id: "postes.types", label: "Types de mouvement" },
      { id: "postes.fiches", label: "Fiches de poste" },
      { id: "postes.vacants", label: "Postes vacants" },
      { id: "postes.organigramme", label: "Organigramme" },
    ],
  },
  {
    id: "paie",
    label: "Paie",
    sections: [
      { id: "paie.dashboard", label: "Dashboard paie (accès page)" },
      { id: "paie.bulletins", label: "Design Template (accès page)" },
      { id: "paie.exploitation", label: "Exploitation mensuelle (accès page)" },
      { id: "paie.simulateur", label: "Simulateur paie (accès page)" },
      { id: "paie.couts-extra", label: "Grille coûts extra (accès page)" },
    ],
  },
  {
    id: "conges",
    label: "Congés",
    sections: [
      { id: "conges.dashboard", label: "Dashboard congés" },
      { id: "conges.ajouter", label: "Ajouter congé" },
      { id: "conges.gestion", label: "Gestion des congés" },
    ],
  },
  {
    id: "pointage",
    label: "Pointage",
    sections: [
      { id: "pointage.dashboard", label: "Dashboard pointage" },
      { id: "pointage.saisie", label: "Saisie" },
      { id: "pointage.gestion", label: "Feuilles du mois" },
    ],
  },
  {
    id: "formations",
    label: "Formations",
    sections: [
      { id: "formations.dashboard", label: "Dashboard formations" },
      { id: "formations.nouvelle", label: "Nouvelle formation" },
      { id: "formations.gestion", label: "Liste des formations" },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    sections: [{ id: "configuration", label: "Paramètres globaux" }],
  },
  {
    id: "juridique",
    label: "Guide RH RDC",
    sections: [{ id: "juridique", label: "Référentiel juridique" }],
  },
  {
    id: "utilisateurs",
    label: "Utilisateurs",
    sections: [
      { id: "utilisateurs.comptes", label: "Comptes" },
      { id: "utilisateurs.permissions", label: "Permissions" },
      { id: "utilisateurs.logs", label: "Journal d'activité" },
    ],
  },
];

export type PermissionMatrix = Record<string, Partial<Record<PermissionAction, boolean>>>;

export function allPermissionSectionIds(): string[] {
  return PERMISSION_MODULES.flatMap((m) => m.sections.map((s) => s.id));
}

/** Matrice complète (toutes les cases cochées) — compte Admin. */
export function fullPermissionMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const sectionId of allPermissionSectionIds()) {
    const section: Partial<Record<PermissionAction, boolean>> = {};
    for (const action of sectionActionsFor(sectionId)) {
      section[action] = true;
    }
    matrix[sectionId] = section;
  }
  return matrix;
}

export function normalizePermissionMatrix(raw: unknown): PermissionMatrix {
  if (!raw || typeof raw !== "object") return {};
  const matrix: PermissionMatrix = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const actions: Partial<Record<PermissionAction, boolean>> = {};
    for (const action of PERMISSION_ACTIONS) {
      if (typeof (value as Record<string, unknown>)[action] === "boolean") {
        actions[action] = (value as Record<string, boolean>)[action];
      }
    }
    matrix[key] = actions;
  }
  return matrix;
}

export function isFullPermissionMatrix(matrix: PermissionMatrix): boolean {
  for (const sectionId of allPermissionSectionIds()) {
    for (const action of sectionActionsFor(sectionId)) {
      if (matrix[sectionId]?.[action] !== true) return false;
    }
  }
  return true;
}

export function isAdminUsername(username: string): boolean {
  return username.trim().toLowerCase() === "admin";
}

export function userHasFullAccess(username: string, matrix: PermissionMatrix): boolean {
  return isAdminUsername(username) || isFullPermissionMatrix(matrix);
}

export function sectionActionsFor(sectionId: string): PermissionAction[] {
  return PERMISSION_SECTION_META[sectionId]?.actions ?? [...PERMISSION_ACTIONS];
}

export function sectionActionLabel(sectionId: string, action: PermissionAction): string {
  return (
    PERMISSION_SECTION_META[sectionId]?.actionLabels?.[action] ??
    PERMISSION_ACTION_LABELS[action]
  );
}

export function canAccessSection(
  matrix: PermissionMatrix,
  sectionId: string,
  action: PermissionAction = "read",
  username?: string
): boolean {
  if (username && isAdminUsername(username)) return true;
  return matrix[sectionId]?.[action] === true;
}

/** Peut voir les montants salariaux (listes, fiches, paie, postes…). */
export function canViewSalaryAmounts(
  matrix: PermissionMatrix,
  username?: string
): boolean {
  return canAccessSection(matrix, SALARY_VISIBILITY_SECTION, "read", username);
}

/** Peut saisir ou modifier salaires / primes / rémunérations. */
export function canEditSalaryAmounts(
  matrix: PermissionMatrix,
  username?: string
): boolean {
  return canAccessSection(matrix, SALARY_VISIBILITY_SECTION, "write", username);
}

/** Lecture d'un module (au moins une section consultable). */
export function canAccessModule(
  matrix: PermissionMatrix,
  moduleId: string,
  username?: string
): boolean {
  if (username && isAdminUsername(username)) return true;
  const mod = PERMISSION_MODULES.find((m) => m.id === moduleId);
  if (!mod) return false;
  return mod.sections.some((s) => canAccessSection(matrix, s.id, "read"));
}

/** Pages personnelles accessibles à tout utilisateur connecté. */
export const PERSONAL_ACCOUNT_HREFS = new Set<string>([]);

/** Normalise un chemin (sans query) pour le contrôle d'accès. */
function normalizeHref(href: string): string {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/** Mapping href → section permission (lecture page). */
export function sectionIdForHref(href: string): string | null {
  const path = normalizeHref(href);

  if (path === "/access-denied") return null;

  if (path === "/") return "dashboard";
  if (path === "/rapports" || path.startsWith("/rapports/")) return "rapports";
  if (path === "/parametres") return "configuration";
  if (path === "/import") return "configuration";
  if (path === "/juridique" || path === "/guide") return "juridique";
  if (path.startsWith("/conformite")) return "juridique";

  if (path === "/employes/dashboard") return "employes.dashboard";
  if (path === "/employes/nouveau") return "employes.nouveau";
  if (path === "/employes") return "employes.liste";
  if (path === "/employes/affectation") return "employes.liste";
  if (path === "/employes/departements" || path.startsWith("/employes/departements/")) {
    return "employes.departements";
  }
  if (path.startsWith("/employes/checking-documents")) return "employes.documents";
  if (/^\/employes\/[^/]+$/.test(path)) return "employes.liste";
  if (path.startsWith("/mouvements")) return "employes.mouvements";
  if (path === "/employes/rapports") return "rapports";

  if (path === "/sante") return null;
  if (path === "/sante/dashboard") return "sante.dashboard";
  if (path === "/sante/formulaire") return "sante.formulaire";
  if (path.startsWith("/sante/file-attente")) return "sante.file-attente";
  if (path.startsWith("/sante/hopitaux")) return "sante.hopitaux";
  if (path.startsWith("/sante/rapports")) return "rapports";

  if (path === "/charroi") return "charroi.dashboard";
  if (path === "/charroi/vehicules") return "charroi.vehicules";
  if (path.startsWith("/charroi/types-course")) return "charroi.types-course";
  if (path.startsWith("/charroi/planning")) return "charroi.planning";
  if (path.startsWith("/charroi/rapports")) return "charroi.rapports";

  if (path === "/postes") return "postes.dashboard";
  if (path.startsWith("/postes/types-mouvement")) return "postes.types";
  if (path.startsWith("/postes/nouvelle-fiche")) return "postes.fiches";
  if (path === "/postes/vacants") return "postes.vacants";
  if (path.startsWith("/postes/organigramme")) return "postes.organigramme";
  if (path.startsWith("/postes/rapports")) return "rapports";

  if (path === "/paie") return "paie.dashboard";
  if (path.startsWith("/paie/bulletins")) return "paie.bulletins";
  if (path.startsWith("/paie/exploitation")) return "paie.exploitation";
  if (path.startsWith("/paie/simulateur")) return "paie.simulateur";
  if (path.startsWith("/paie/grille-couts-extra")) return "paie.couts-extra";

  if (path === "/conges" || path === "/conges/dashboard") return "conges.dashboard";
  if (path === "/conges/ajouter") return "conges.ajouter";
  if (path.startsWith("/conges/gestion")) return "conges.gestion";

  if (path === "/pointage" || path === "/pointage/dashboard") return "pointage.dashboard";
  if (path.startsWith("/pointage/saisie")) return "pointage.saisie";
  if (path.startsWith("/pointage/gestion")) return "pointage.gestion";
  if (path.startsWith("/pointage/rapports")) return "rapports";

  if (path === "/formations" || path === "/formations/dashboard") return "formations.dashboard";
  if (path === "/formations/nouvelle") return "formations.nouvelle";
  if (path.startsWith("/formations/gestion")) return "formations.gestion";

  if (path === "/utilisateurs" || path === "/utilisateurs/compte") return "utilisateurs.comptes";
  if (path.startsWith("/utilisateurs/permissions")) return "utilisateurs.permissions";
  if (path.startsWith("/utilisateurs/logs")) return "utilisateurs.logs";

  return null;
}

export function canAccessHref(
  matrix: PermissionMatrix,
  href: string,
  username?: string
): boolean {
  const path = normalizeHref(href);
  if (PERSONAL_ACCOUNT_HREFS.has(path)) return true;
  const sectionId = sectionIdForHref(href);
  if (!sectionId) return false;
  return canAccessSection(matrix, sectionId, "read", username);
}

/** Première page accessible dans une liste (ex. redirection module Santé). */
export function firstAccessibleHrefFromList(
  matrix: PermissionMatrix,
  hrefs: readonly string[],
  username?: string
): string | null {
  for (const href of hrefs) {
    if (canAccessHref(matrix, href, username)) return href;
  }
  return null;
}

export function emptyPermissionMatrix(): PermissionMatrix {
  return {};
}

export function togglePermissionAction(
  matrix: PermissionMatrix,
  sectionId: string,
  action: PermissionAction,
  enabled: boolean
): PermissionMatrix {
  return {
    ...matrix,
    [sectionId]: {
      ...matrix[sectionId],
      [action]: enabled,
    },
  };
}

export function setAllActionsForSection(
  matrix: PermissionMatrix,
  sectionId: string,
  enabled: boolean
): PermissionMatrix {
  const section: Partial<Record<PermissionAction, boolean>> = { ...matrix[sectionId] };
  for (const action of sectionActionsFor(sectionId)) {
    section[action] = enabled;
  }
  return { ...matrix, [sectionId]: section };
}

export function sectionHasAllActions(matrix: PermissionMatrix, sectionId: string): boolean {
  return sectionActionsFor(sectionId).every((action) => matrix[sectionId]?.[action] === true);
}

export function sectionHasAnyAction(matrix: PermissionMatrix, sectionId: string): boolean {
  return sectionActionsFor(sectionId).some((action) => matrix[sectionId]?.[action] === true);
}
