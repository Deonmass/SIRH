import { showErrorAlert } from "./alerts";
import { LEAVE_STATUS_LABELS } from "./employee-dossier";
import { rhUserLabel } from "./rh-users";
import type { LeaveRequestStatus } from "./types";

export function formatLeaveDaysCount(days: number): string {
  return `${days} jour${days !== 1 ? "s" : ""}`;
}

/** SweetAlert : solde restant inférieur à la sélection. */
export async function alertInsufficientLeaveBalance(available: number, requested: number) {
  await showErrorAlert(
    "Solde insuffisant",
    `Votre solde restant est de ${formatLeaveDaysCount(available)}, alors que vous avez sélectionné ${formatLeaveDaysCount(requested)}. Réduisez la période sur le calendrier ou annulez une demande en cours.`
  );
}

const LEAVE_STATUS_BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  demande: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  validation_1: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  validation_2: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  approuve: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  refuse: "border-red-500/40 bg-red-500/10 text-red-600",
  termine: "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)]",
};

export function leaveStatusBadgeClass(status: LeaveRequestStatus): string {
  return LEAVE_STATUS_BADGE_CLASS[status] ?? LEAVE_STATUS_BADGE_CLASS.demande;
}

export function leaveStatusLabel(status: LeaveRequestStatus): string {
  return LEAVE_STATUS_LABELS[status] ?? status;
}

export function formatValidationLine(
  validatorId: string | null | undefined,
  validatedAt: string | null | undefined
): string {
  if (!validatorId?.trim()) return "—";
  const name = rhUserLabel(validatorId);
  const display = name === validatorId ? validatorId : name;
  if (!validatedAt) return `${display} (prévu)`;
  const d = new Date(validatedAt);
  const when = Number.isNaN(d.getTime())
    ? validatedAt
    : d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  return `${display} · ${when}`;
}
