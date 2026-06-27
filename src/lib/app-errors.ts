export type AppErrorKind = "network" | "not_found" | "database" | "server";

export interface AppErrorContent {
  kind: AppErrorKind;
  title: string;
  message: string;
  hint?: string;
}

const NETWORK_PATTERNS = [
  "fetch failed",
  "failed to fetch",
  "networkerror",
  "network request failed",
  "econnrefused",
  "enotfound",
  "etimedout",
  "socket hang up",
  "getaddrinfo",
  "internet",
  "offline",
  "connexion",
];

const DATABASE_PATTERNS = [
  "supabase",
  "schema cache",
  "employes.select",
  "postes.select",
  "formations.select",
  "could not find",
  "database",
  "postgres",
  "jwt",
  "invalid api key",
];

const NOT_FOUND_PATTERNS = [
  "not found",
  "introuvable",
  "404",
  "n'existe pas",
  "nexiste pas",
];

export function classifyAppError(message?: string): AppErrorKind {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return "server";

  if (NOT_FOUND_PATTERNS.some((p) => raw.includes(p))) return "not_found";
  if (NETWORK_PATTERNS.some((p) => raw.includes(p))) return "network";
  if (DATABASE_PATTERNS.some((p) => raw.includes(p))) return "database";
  return "server";
}

export function getAppErrorContent(
  kind: AppErrorKind,
  detail?: string
): AppErrorContent {
  switch (kind) {
    case "network":
      return {
        kind,
        title: "Connexion impossible",
        message:
          "Impossible de charger cette page. Vérifiez votre connexion Internet, puis réessayez.",
        hint: detail?.includes("fetch failed")
          ? "Le serveur ou la base de données est injoignable depuis votre réseau."
          : "Si le problème persiste, contactez l'administrateur SIRH.",
      };
    case "not_found":
      return {
        kind,
        title: "Page introuvable",
        message: "La ressource demandée n'existe pas ou a été déplacée.",
        hint: "Vérifiez l'adresse ou retournez à l'accueil.",
      };
    case "database":
      return {
        kind,
        title: "Service indisponible",
        message:
          "Les données RH n'ont pas pu être chargées. Le service est peut‑être hors ligne ou en maintenance.",
        hint: "Réessayez dans quelques instants. Si l'erreur continue, vérifiez la configuration Supabase.",
      };
    case "server":
    default:
      return {
        kind,
        title: "Une erreur est survenue",
        message: "Le chargement de la page a échoué. Vous pouvez réessayer ou revenir à l'accueil.",
      };
  }
}

export function resolveAppErrorContent(error?: Error | string | null): AppErrorContent {
  const message = typeof error === "string" ? error : error?.message;
  const kind =
    typeof navigator !== "undefined" && !navigator.onLine
      ? "network"
      : classifyAppError(message);
  const content = getAppErrorContent(kind, message);
  if (kind === "server" && message && process.env.NODE_ENV === "development") {
    return { ...content, hint: message };
  }
  return content;
}
