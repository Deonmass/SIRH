import {
  canAccessHref,
  canAccessModule,
  canAccessSection,
  PERSONAL_ACCOUNT_HREFS,
  sectionIdForHref,
  type PermissionAction,
} from "@/lib/permissions";
import type { SessionUser } from "./session";

const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);
const DELETE_METHODS = new Set(["DELETE"]);

/** Hrefs parcourus pour trouver une page d'accueil autorisée. */
export const APP_NAV_HREFS = [
  "/",
  "/rapports",
  "/employes/dashboard",
  "/employes/nouveau",
  "/employes",
  "/employes/departements",
  "/employes/checking-documents",
  "/mouvements",
  "/employes/rapports",
  "/sante/dashboard",
  "/sante/formulaire",
  "/sante/file-attente",
  "/sante/hopitaux",
  "/sante/rapports",
  "/charroi",
  "/charroi/vehicules",
  "/charroi/types-course",
  "/charroi/planning",
  "/charroi/rapports",
  "/postes",
  "/postes/types-mouvement",
  "/postes/nouvelle-fiche",
  "/postes/vacants",
  "/postes/organigramme",
  "/postes/rapports",
  "/paie",
  "/paie/bulletins",
  "/paie/exploitation",
  "/paie/simulateur",
  "/paie/grille-couts-extra",
  "/conges/dashboard",
  "/conges/ajouter",
  "/conges/gestion",
  "/pointage/dashboard",
  "/pointage/saisie",
  "/pointage/gestion",
  "/pointage/rapports",
  "/formations/dashboard",
  "/formations/nouvelle",
  "/formations/gestion",
  "/import",
  "/parametres",
  "/juridique",
  "/conformite",
  "/utilisateurs/compte",
  "/utilisateurs/permissions",
  "/utilisateurs/logs",
] as const;

type ApiRule = {
  pattern: RegExp;
  section: string;
  read?: boolean;
  write?: boolean;
  delete?: boolean;
};

/**
 * Règles API — la première correspondance gagne.
 * `read` / `write` / `delete` indiquent quelles méthodes HTTP sont couvertes (défaut : read seul).
 */
const API_RULES: ApiRule[] = [
  { pattern: /^\/api\/auth\/(login|logout|session|profile|change-password)$/, section: "", read: true, write: true },
  { pattern: /^\/api\/auth\/profile\/coordonnees$/, section: "", read: true, write: true },
  { pattern: /^\/api\/health\//, section: "", read: true },
  { pattern: /^\/api\/dashboard$/, section: "dashboard", read: true },
  { pattern: /^\/api\/rapports\/[^/]+$/, section: "rapports", read: true },
  { pattern: /^\/api\/sante\/rapports$/, section: "rapports", read: true },
  { pattern: /^\/api\/sante\/dashboard$/, section: "sante.dashboard", read: true },
  { pattern: /^\/api\/sante\/hopitaux$/, section: "sante.hopitaux", read: true, write: true, delete: true },
  { pattern: /^\/api\/sante\/visites\/upload$/, section: "sante.formulaire", write: true },
  { pattern: /^\/api\/sante\/visites\/file$/, section: "sante.file-attente", read: true },
  { pattern: /^\/api\/charroi\/dashboard$/, section: "charroi.dashboard", read: true },
  { pattern: /^\/api\/employes\/dashboard$/, section: "employes.dashboard", read: true },
  { pattern: /^\/api\/charroi\/vehicules\/import$/, section: "charroi.vehicules", read: true, write: true },
  { pattern: /^\/api\/charroi\/vehicules$/, section: "charroi.vehicules", read: true, write: true, delete: true },
  { pattern: /^\/api\/charroi\/entretien$/, section: "charroi.vehicules", read: true, write: true },
  { pattern: /^\/api\/charroi\/types-course$/, section: "charroi.types-course", read: true, write: true, delete: true },
  { pattern: /^\/api\/charroi\/courses$/, section: "charroi.planning", read: true, write: true, delete: true },
  { pattern: /^\/api\/charroi\/rapports\//, section: "charroi.rapports", read: true },
  { pattern: /^\/api\/employees\/[^/]+\/documents\/upload$/, section: "employes.documents", write: true },
  { pattern: /^\/api\/employees\/[^/]+\/documents\/file$/, section: "employes.documents", read: true },
  { pattern: /^\/api\/employees\/[^/]+\/documents$/, section: "employes.documents", read: true, write: true, delete: true },
  { pattern: /^\/api\/employees\/[^/]+\/dossier$/, section: "employes.liste", read: true, write: true },
  { pattern: /^\/api\/employees\/[^/]+\/famille\/[^/]+$/, section: "employes.liste", read: true, write: true, delete: true },
  { pattern: /^\/api\/employees\/[^/]+\/famille$/, section: "employes.liste", read: true, write: true },
  { pattern: /^\/api\/employees\/[^/]+\/conges$/, section: "conges.gestion", read: true, write: true },
  { pattern: /^\/api\/employees\/[^/]+$/, section: "employes.liste", read: true, write: true, delete: true },
  { pattern: /^\/api\/employees$/, section: "employes.liste", read: true },
  { pattern: /^\/api\/departements\/[^/]+$/, section: "employes.departements", read: true, write: true, delete: true },
  { pattern: /^\/api\/departements$/, section: "employes.departements", read: true, write: true },
  { pattern: /^\/api\/movements\/attachments\/upload$/, section: "employes.mouvements", write: true },
  { pattern: /^\/api\/movements\/[^/]+$/, section: "employes.mouvements", read: true, write: true, delete: true },
  { pattern: /^\/api\/movements$/, section: "employes.mouvements", read: true, write: true },
  { pattern: /^\/api\/postes\/[^/]+$/, section: "postes.fiches", read: true, write: true, delete: true },
  { pattern: /^\/api\/postes$/, section: "postes.fiches", read: true, write: true },
  { pattern: /^\/api\/paie\/cloture$/, section: "paie.exploitation", write: true },
  { pattern: /^\/api\/paie\/bulletins$/, section: "paie.bulletins", read: true, write: true },
  { pattern: /^\/api\/paie\/masse\/detail$/, section: "paie.dashboard", read: true },
  { pattern: /^\/api\/paie\/masse\/annual$/, section: "paie.dashboard", read: true },
  { pattern: /^\/api\/paie\/masse-reelle$/, section: "paie.dashboard", read: true },
  { pattern: /^\/api\/paie\/masse$/, section: "paie.dashboard", read: true },
  { pattern: /^\/api\/paie\/runs$/, section: "paie.exploitation", read: true, write: true },
  { pattern: /^\/api\/paie\/template$/, section: "paie.bulletins", read: true, write: true },
  { pattern: /^\/api\/conges\/dashboard$/, section: "conges.dashboard", read: true },
  { pattern: /^\/api\/conges\/[^/]+$/, section: "conges.gestion", read: true, write: true, delete: true },
  { pattern: /^\/api\/conges$/, section: "conges.gestion", read: true },
  { pattern: /^\/api\/pointage\/dashboard$/, section: "pointage.dashboard", read: true },
  { pattern: /^\/api\/pointage\/[^/]+$/, section: "pointage.saisie", read: true, write: true, delete: true },
  { pattern: /^\/api\/pointage$/, section: "pointage.saisie", read: true, write: true },
  { pattern: /^\/api\/formations\/dashboard$/, section: "formations.dashboard", read: true },
  { pattern: /^\/api\/formations\/[^/]+$/, section: "formations.gestion", read: true, write: true, delete: true },
  { pattern: /^\/api\/formations$/, section: "formations.gestion", read: true },
  { pattern: /^\/api\/settings\/logo$/, section: "configuration", read: true, write: true },
  { pattern: /^\/api\/settings\/section$/, section: "configuration", read: true, write: true },
  { pattern: /^\/api\/settings$/, section: "configuration", read: true, write: true },
  { pattern: /^\/api\/centre-des-couts\/[^/]+$/, section: "configuration", read: true, write: true, delete: true },
  { pattern: /^\/api\/centre-des-couts$/, section: "configuration", read: true, write: true },
  { pattern: /^\/api\/import\/template$/, section: "configuration", read: true },
  { pattern: /^\/api\/import\/employes$/, section: "configuration", write: true },
  { pattern: /^\/api\/import\/postes$/, section: "configuration", write: true },
  { pattern: /^\/api\/juridique\/cases\/[^/]+$/, section: "juridique", read: true, write: true, delete: true },
  { pattern: /^\/api\/juridique\/cases$/, section: "juridique", read: true, write: true },
  { pattern: /^\/api\/compliance$/, section: "juridique", read: true },
  { pattern: /^\/api\/utilisateurs\/rh$/, section: "utilisateurs.comptes", read: true },
  { pattern: /^\/api\/utilisateurs\/[^/]+$/, section: "utilisateurs.comptes", read: true, write: true, delete: true },
  { pattern: /^\/api\/utilisateurs$/, section: "utilisateurs.comptes", read: true, write: true },
  { pattern: /^\/api\/logs\/[^/]+\/undo$/, section: "utilisateurs.logs", write: true },
  { pattern: /^\/api\/logs\/[^/]+$/, section: "utilisateurs.logs", read: true, delete: true },
  { pattern: /^\/api\/logs$/, section: "utilisateurs.logs", read: true },
];

function httpAction(method: string): PermissionAction {
  const m = method.toUpperCase();
  if (DELETE_METHODS.has(m)) return "delete";
  if (WRITE_METHODS.has(m)) return "write";
  return "read";
}

function ruleAllowsMethod(rule: ApiRule, method: string): boolean {
  const m = method.toUpperCase();
  if (READ_METHODS.has(m)) return rule.read !== false;
  if (WRITE_METHODS.has(m)) return rule.write === true;
  if (DELETE_METHODS.has(m)) return rule.delete === true;
  return false;
}

/** Cas particuliers méthode + chemin exact. */
function apiPermissionOverride(
  pathname: string,
  method: string
): { sectionId: string; action: PermissionAction } | null {
  const m = method.toUpperCase();
  if (pathname === "/api/employees" && m === "POST") {
    return { sectionId: "employes.nouveau", action: "write" };
  }
  if (pathname === "/api/conges" && m === "POST") {
    return { sectionId: "conges.ajouter", action: "write" };
  }
  if (pathname === "/api/formations" && m === "POST") {
    return { sectionId: "formations.nouvelle", action: "write" };
  }
  if (/^\/api\/rapports\/[^/]+$/.test(pathname) && m === "GET") {
    return { sectionId: "rapports", action: "export" };
  }
  if (/^\/api\/charroi\/rapports\/[^/]+$/.test(pathname) && m === "GET") {
    return { sectionId: "charroi.rapports", action: "export" };
  }
  if (pathname === "/api/sante/rapports" && m === "GET") {
    return { sectionId: "rapports", action: "export" };
  }
  if (pathname === "/api/sante/visites") {
    if (m === "GET") return { sectionId: "sante.file-attente", action: "read" };
    if (m === "POST") return { sectionId: "sante.formulaire", action: "write" };
    if (m === "PATCH") return { sectionId: "sante.file-attente", action: "write" };
    if (m === "DELETE") return { sectionId: "sante.file-attente", action: "delete" };
  }
  return null;
}

/** Permission requise pour un appel API, ou `null` si pas de règle (refus par défaut). */
export function apiPermissionFor(
  pathname: string,
  method: string
): { sectionId: string; action: PermissionAction } | null {
  const override = apiPermissionOverride(pathname, method);
  if (override) return override;

  for (const rule of API_RULES) {
    if (!rule.pattern.test(pathname)) continue;
    if (!ruleAllowsMethod(rule, method)) continue;
    if (!rule.section) return null; // auth / health — pas de permission métier
    return { sectionId: rule.section, action: httpAction(method) };
  }
  return null;
}

export function isPublicApiPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/session" ||
    pathname.startsWith("/api/auth/profile") ||
    pathname === "/api/auth/change-password" ||
    pathname.startsWith("/api/health/")
  );
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function canAccessPage(
  user: SessionUser,
  pathname: string
): boolean {
  const path = normalizePathname(pathname);
  if (PERSONAL_ACCOUNT_HREFS.has(path)) return true;
  if (path === "/sante") {
    return canAccessModule(user.permissions, "sante", user.username);
  }
  const sectionId = sectionIdForHref(pathname);
  if (!sectionId) return false;
  return canAccessSection(user.permissions, sectionId, "read", user.username);
}

export function canAccessApi(
  user: SessionUser,
  pathname: string,
  method: string
): boolean {
  if (isPublicApiPath(pathname)) return true;
  const path = normalizePathname(pathname);
  if (path === "/api/sante/visites/upload" && method.toUpperCase() === "POST") {
    return (
      canAccessSection(user.permissions, "sante.formulaire", "write", user.username) ||
      canAccessSection(user.permissions, "sante.file-attente", "write", user.username)
    );
  }
  if (path === "/api/sante/visites" && method.toUpperCase() === "PATCH") {
    return (
      canAccessSection(user.permissions, "sante.file-attente", "write", user.username) ||
      canAccessSection(user.permissions, "sante.formulaire", "write", user.username)
    );
  }
  if (path === "/api/departements" || /^\/api\/departements\/[^/]+$/.test(path)) {
    const action = httpAction(method);
    return (
      canAccessSection(user.permissions, "employes.departements", action, user.username) ||
      canAccessSection(user.permissions, "configuration", action, user.username)
    );
  }
  const required = apiPermissionFor(pathname, method);
  if (!required) return false;
  return canAccessSection(
    user.permissions,
    required.sectionId,
    required.action,
    user.username
  );
}

export function firstAccessibleHref(
  user: SessionUser
): string | null {
  for (const href of APP_NAV_HREFS) {
    if (canAccessHref(user.permissions, href, user.username)) return href;
  }
  return null;
}
