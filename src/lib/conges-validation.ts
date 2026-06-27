import { isValidatorApproved, toDbValidatorField } from "./conges-validateur-field";
import type { LeaveRequestStatus } from "./types";

/** Statut selon validateur_1 / validateur_2 (horodatage encodé dans le TEXT). */
export function deriveCongeStatusFromDb(
  validateur1Raw?: string | null,
  validateur2Raw?: string | null
): LeaveRequestStatus {
  const v1 = isValidatorApproved(validateur1Raw);
  const v2 = isValidatorApproved(validateur2Raw);
  if (v1 && v2) return "approuve";
  if (v1) return "validation_1";
  if (v2) return "validation_2";
  return "demande";
}

export function deriveCongeStatus(
  validateur1?: string | null,
  validateur2?: string | null,
  validation1At?: string | null,
  validation2At?: string | null
): LeaveRequestStatus {
  return deriveCongeStatusFromDb(
    toDbValidatorField(validateur1, validation1At),
    toDbValidatorField(validateur2, validation2At)
  );
}

export function nextValidationLevel(
  validateur1?: string | null,
  validateur2?: string | null,
  validation1At?: string | null,
  validation2At?: string | null
): 1 | 2 | null {
  const raw1 = toDbValidatorField(validateur1, validation1At);
  const raw2 = toDbValidatorField(validateur2, validation2At);
  if (!isValidatorApproved(raw1)) return 1;
  if (!isValidatorApproved(raw2)) return 2;
  return null;
}
