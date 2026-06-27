"use client";

import { Info } from "lucide-react";
import { IrppFormulaDisplay } from "@/components/payroll/IrppFormulaDisplay";
import { useAppSettings } from "@/contexts/SettingsContext";
import { IRPP_DEPENDENT_ABATEMENT } from "@/lib/irpp-bareme";
import type {
  IrppFormulaDetail,
  PayrollEmployeeMergeNotice as MergeNotice,
} from "@/lib/payroll-simulator-config";
import type { Currency } from "@/lib/types";

function formatAbatement(rate: number): string {
  if (rate <= 0) return "aucun";
  return `${(rate * 100).toFixed(0)} %`;
}

function formatSignedMoney(
  amount: number,
  formatSalary: (amount: number, currency?: Currency) => string,
  currency: Currency
): string {
  const abs = formatSalary(Math.abs(amount), currency);
  if (amount > 0) return `+ ${abs}`;
  if (amount < 0) return `− ${abs}`;
  return abs;
}

function IrppAmountLine({
  title,
  amount,
  formulaDetail,
  label,
  currency,
  exchangeRate,
  formatSalary,
}: {
  title: string;
  amount: number;
  formulaDetail: IrppFormulaDetail;
  label: string;
  currency: Currency;
  exchangeRate: number;
  formatSalary: (amount: number, currency?: Currency) => string;
}) {
  return (
    <li className="space-y-0.5">
      <div>
        {title} ({label}) : <strong>− {formatSalary(amount, currency)}</strong>
      </div>
      <IrppFormulaDisplay
        detail={formulaDetail}
        currency={currency}
        exchangeRate={exchangeRate}
        formatSalary={formatSalary}
      />
    </li>
  );
}

export function PayrollEmployeeMergeNoticeBanner({
  notice,
}: {
  notice: MergeNotice;
}) {
  const { formatSalary, exchangeRate } = useAppSettings();
  const {
    posteDependents,
    employeeDependents,
    abatementPercentPoste,
    abatementPercentEmployee,
    currency,
    iprPoste,
    iprEmployee,
    netPoste,
    netEmployee,
    irppFormulaPoste,
    irppFormulaEmployee,
    dependentSteps,
  } = notice;

  const netDifference = Math.round((netEmployee - netPoste) * 100) / 100;
  const abatementPerPersonLabel = `${(IRPP_DEPENDENT_ABATEMENT * 100).toFixed(0)} %`;

  return (
    <div
      className="flex gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90"
      role="status"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <div className="space-y-2">
        <p className="font-semibold text-amber-50">
          Ajustement bulletin — personnes à charge (IRPP)
        </p>
        <p>
          La fiche poste est simulée avec{" "}
          <strong>
            {posteDependents} personne{posteDependents > 1 ? "s" : ""} à charge
          </strong>{" "}
          (abattement IRPP : {formatAbatement(abatementPercentPoste)}).
        </p>
        <p>
          L&apos;employé sélectionné en a{" "}
          <strong>
            {employeeDependents} déclarée{employeeDependents > 1 ? "s" : ""}
          </strong>{" "}
          dans son dossier — abattement IRPP appliqué ici :{" "}
          <strong>{formatAbatement(abatementPercentEmployee)}</strong>{" "}
          ({abatementPerPersonLabel} par personne à charge).
        </p>

        <div className="rounded-md border border-amber-500/25 bg-amber-950/20 px-2.5 py-2">
          <p className="mb-1.5 font-medium text-amber-50">Montants</p>
          <ul className="list-disc space-y-2 pl-4 text-amber-100/90 marker:text-amber-400/80">
            <IrppAmountLine
              title="IRPP fiche poste"
              label={irppFormulaPoste.label}
              amount={iprPoste}
              formulaDetail={irppFormulaPoste}
              currency={currency}
              exchangeRate={exchangeRate}
              formatSalary={formatSalary}
            />
            <IrppAmountLine
              title="IRPP avec dossier employé"
              label={irppFormulaEmployee.label}
              amount={iprEmployee}
              formulaDetail={irppFormulaEmployee}
              currency={currency}
              exchangeRate={exchangeRate}
              formatSalary={formatSalary}
            />

            {dependentSteps.length > 0 ? (
              <li className="space-y-1.5">
                <span className="font-medium text-amber-50">Personnes à charge</span>
                <ul className="list-disc space-y-2 pl-4 marker:text-amber-400/60">
                  {dependentSteps.map((step) => (
                    <li key={step.personIndex} className="space-y-0.5">
                      <div>
                        Personne à charge {step.personIndex} :{" "}
                        <strong>
                          {formatSignedMoney(step.netGain, formatSalary, currency)}
                        </strong>{" "}
                        au net
                        {step.iprReduction !== 0 ? (
                          <>
                            {" "}
                            (
                            {step.iprReduction > 0 ? "−" : "+"}{" "}
                            {formatSalary(Math.abs(step.iprReduction), currency)} d&apos;IRPP)
                          </>
                        ) : null}
                      </div>
                      <IrppFormulaDisplay
                        detail={step.irppFormula}
                        currency={currency}
                        exchangeRate={exchangeRate}
                        formatSalary={formatSalary}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}

            <li className="list-none -ml-4 border-t border-amber-500/20 pt-2 text-amber-50">
              Écart net total vs fiche poste :{" "}
              <strong>{formatSignedMoney(netDifference, formatSalary, currency)}</strong>
              <span className="text-amber-200/75">
                {" "}
                (net poste {formatSalary(netPoste, currency)} → net employé{" "}
                {formatSalary(netEmployee, currency)})
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
