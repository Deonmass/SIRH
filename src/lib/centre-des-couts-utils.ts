import type { CentreDesCouts } from "@/lib/types";

/** Libellé affichable — utilisable côté client sans dépendance serveur. */
export function centreDesCoutsLabel(item: Pick<CentreDesCouts, "id" | "denommination">): string {
  const main = item.denommination.trim();
  if (main) return main;
  return `Centre #${item.id}`;
}

function normalizeCentreDesCouts(raw: unknown): CentreDesCouts | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    denommination: String(row.denommination ?? "").trim(),
    autreInfo: String(row.autreInfo ?? row.autre_info ?? "").trim(),
    text: String(row.text ?? "").trim(),
  };
}

/** Lit le référentiel depuis `configuration.params`. */
export function parseCentresCoutsFromParams(
  params: Record<string, unknown> | null | undefined
): CentreDesCouts[] {
  if (!params || typeof params !== "object" || Array.isArray(params)) return [];
  const raw = params.centresCouts;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCentreDesCouts).filter((item): item is CentreDesCouts => item != null);
}

/** Prochain identifiant numérique (chaîne) pour un nouveau centre. */
export function newCentreDesCoutsId(existing: CentreDesCouts[]): string {
  const ids = existing
    .map((item) => Number(item.id))
    .filter((n) => Number.isInteger(n) && n > 0);
  return String(ids.length ? Math.max(...ids) + 1 : 1);
}

export function newCentreDesCouts(
  existing: CentreDesCouts[],
  denommination = "Nouveau centre de coûts"
): CentreDesCouts {
  return {
    id: newCentreDesCoutsId(existing),
    denommination,
    autreInfo: "",
    text: "",
  };
}
