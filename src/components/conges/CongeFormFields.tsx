"use client";

import { DossierField, DossierSelect, DossierTextArea, DossierTextInput } from "@/components/employees/DossierFields";
import { alertInsufficientLeaveBalance } from "@/lib/conges-display";
import { addWorkingDays, countWorkingDays } from "@/lib/conges-working-days";
import { LEAVE_TYPE_LABELS } from "@/lib/employee-dossier";
import type { RhUser } from "@/lib/rh-users";
import type { LeaveType } from "@/lib/types";

export type CongeFormValues = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  notes: string;
  validateur1: string;
  validateur2: string;
};

export function CongeFormFields({
  values,
  onChange,
  rhUsers,
  leaveBalanceMax,
}: {
  values: CongeFormValues;
  onChange: (patch: Partial<CongeFormValues>) => void;
  rhUsers: RhUser[];
  /** Solde restant — limite les jours pour le congé annuel */
  leaveBalanceMax?: number;
}) {
  const appliesBalanceLimit = values.type === "annuel" && leaveBalanceMax != null;
  const daysExceeded = appliesBalanceLimit && values.days > leaveBalanceMax;
  const userOptions = [
    { value: "", label: "— Non assigné —" },
    ...rhUsers.map((u) => ({
      value: u.id,
      label: `${u.prenom} ${u.nom}${u.poste ? ` (${u.poste})` : ""}`,
    })),
  ];

  function patchDates(startDate: string, endDate: string) {
    const safeEnd = endDate < startDate ? startDate : endDate;
    let days = countWorkingDays(startDate, safeEnd);
    if (appliesBalanceLimit && leaveBalanceMax != null && days > leaveBalanceMax) {
      void alertInsufficientLeaveBalance(leaveBalanceMax, days);
      return;
    }
    onChange({
      startDate,
      endDate: safeEnd,
      days,
    });
  }

  return (
    <div className="space-y-3">
      <DossierField label="Type de congé">
        <DossierSelect
          value={values.type}
          onChange={(v) => {
            const type = v as LeaveType;
            if (type === "annuel" && leaveBalanceMax != null && values.days > leaveBalanceMax) {
              void alertInsufficientLeaveBalance(leaveBalanceMax, values.days);
              return;
            }
            onChange({ type });
          }}
          options={Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </DossierField>
      <div className="grid gap-3 sm:grid-cols-2">
        <DossierField label="Du">
          <DossierTextInput
            type="date"
            value={values.startDate}
            onChange={(startDate) => patchDates(startDate, values.endDate)}
          />
        </DossierField>
        <DossierField label="Au">
          <DossierTextInput
            type="date"
            value={values.endDate}
            onChange={(endDate) => patchDates(values.startDate, endDate)}
          />
        </DossierField>
      </div>
      <DossierField
        label={
          appliesBalanceLimit
            ? `Nombre de jours (solde : ${leaveBalanceMax} j)`
            : "Nombre de jours ouvrables (hors fériés)"
        }
      >
        {appliesBalanceLimit && leaveBalanceMax > 0 ? (
          <DossierSelect
            value={String(Math.min(values.days, leaveBalanceMax))}
            onChange={(v) => {
              const days = Math.max(1, Math.min(leaveBalanceMax, Number(v) || 1));
              onChange({
                days,
                endDate: addWorkingDays(values.startDate, days),
              });
            }}
            options={Array.from({ length: leaveBalanceMax }, (_, i) => {
              const n = i + 1;
              return { value: String(n), label: `${n} jour${n > 1 ? "s" : ""}` };
            })}
          />
        ) : (
          <DossierTextInput type="number" value={values.days} readOnly onChange={() => {}} />
        )}
        {daysExceeded && (
          <p className="mt-1 text-xs font-medium text-red-500">
            Dépassement du solde : {leaveBalanceMax} jour{leaveBalanceMax !== 1 ? "s" : ""} disponible
            {leaveBalanceMax !== 1 ? "s" : ""} au maximum.
          </p>
        )}
        {appliesBalanceLimit && leaveBalanceMax === 0 && (
          <p className="mt-1 text-xs font-medium text-amber-500">Aucun jour de congé annuel disponible.</p>
        )}
      </DossierField>
      <div className="grid gap-3 sm:grid-cols-2">
        <DossierField label="Validateur 1">
          <DossierSelect
            value={values.validateur1}
            onChange={(v) => onChange({ validateur1: v })}
            options={userOptions}
          />
        </DossierField>
        <DossierField label="Validateur 2">
          <DossierSelect
            value={values.validateur2}
            onChange={(v) => onChange({ validateur2: v })}
            options={userOptions}
          />
        </DossierField>
      </div>
      <DossierField label="Notes">
        <DossierTextArea
          value={values.notes}
          onChange={(notes) => onChange({ notes })}
          rows={2}
        />
      </DossierField>
      <p className="text-xs text-[var(--shell-text-muted)]">
        Statut à l&apos;enregistrement : <strong>En demande</strong>
      </p>
    </div>
  );
}
