import { encodeSoldeConge, parseSoldeConge, type SoldeCongePayload } from "@/lib/conges-balance";

/** Encode uniquement les champs solde (sans congés embarqués). */
export function encodeSoldeCongeColumn(payload: SoldeCongePayload): string {
  return encodeSoldeConge(payload);
}

export function parseSoldeCongeColumn(
  raw: string | null | undefined
): SoldeCongePayload | null {
  return parseSoldeConge(raw);
}
