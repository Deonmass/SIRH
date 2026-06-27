"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SANTE_VISITE_VALIDATION_LABELS,
  formatSanteVisiteStatutDate,
  getSanteVisiteStatut,
  getSanteVisiteStatutDate,
  getSanteVisiteStatutDateLabel,
  parseSanteVisiteValidation,
  type SanteVisiteValidation,
} from "@/lib/sante-visite";
import { cn } from "@/lib/utils";

function statutBadgeClass(statut: SanteVisiteValidation): string {
  if (statut === "valide") return "bg-emerald-500/15 text-emerald-400";
  if (statut === "rejete") return "bg-red-500/15 text-red-400";
  return "bg-amber-500/15 text-amber-400";
}

function StatutTooltipContent({
  statut,
  record,
  actionDate,
}: {
  statut: SanteVisiteValidation;
  record: ReturnType<typeof parseSanteVisiteValidation>;
  actionDate?: string;
}) {
  return (
    <div className="w-64 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-3 text-left shadow-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">
        {statut === "rejete" ? "Détails du rejet" : "Détails de la validation"}
      </p>
      <dl className="mt-2 space-y-2 text-xs">
        {actionDate && (
          <div>
            <dt className="text-[var(--shell-text-muted)]">
              {getSanteVisiteStatutDateLabel(statut)}
            </dt>
            <dd className="font-medium text-[var(--shell-text)]">
              {formatSanteVisiteStatutDate(actionDate)}
            </dd>
          </div>
        )}
        {record.nomValidateur && (
          <div>
            <dt className="text-[var(--shell-text-muted)]">Validateur</dt>
            <dd>{record.nomValidateur}</dd>
          </div>
        )}
        {record.matriculeValidateur && (
          <div>
            <dt className="text-[var(--shell-text-muted)]">Matricule</dt>
            <dd className="font-mono text-[10px]">{record.matriculeValidateur}</dd>
          </div>
        )}
        {record.raisonRejet && (
          <div>
            <dt className="text-[var(--shell-text-muted)]">Motif rejet</dt>
            <dd className="whitespace-pre-wrap text-red-400">{record.raisonRejet}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function SanteVisiteStatutCell({
  validation,
  disabled = false,
  onChange,
}: {
  validation: unknown;
  disabled?: boolean;
  onChange?: (statut: SanteVisiteValidation) => void;
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const record = parseSanteVisiteValidation(validation);
  const statut = getSanteVisiteStatut(validation);
  const actionDate = getSanteVisiteStatutDate(record);
  const showTooltip = statut !== "en_attente" && Boolean(actionDate || record.nomValidateur);

  useEffect(() => setMounted(true), []);

  const updateTooltipPos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  useLayoutEffect(() => {
    if (!hovered || !showTooltip) {
      setTooltipPos(null);
      return;
    }
    updateTooltipPos();
    window.addEventListener("scroll", updateTooltipPos, true);
    window.addEventListener("resize", updateTooltipPos);
    return () => {
      window.removeEventListener("scroll", updateTooltipPos, true);
      window.removeEventListener("resize", updateTooltipPos);
    };
  }, [hovered, showTooltip]);

  const hoverHandlers = showTooltip
    ? {
        onMouseEnter: () => {
          setHovered(true);
          updateTooltipPos();
        },
        onMouseLeave: () => setHovered(false),
        onFocus: () => setHovered(true),
        onBlur: () => setHovered(false),
      }
    : {};

  const tooltipPortal =
    mounted && hovered && showTooltip && tooltipPos
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
          >
            <StatutTooltipContent statut={statut} record={record} actionDate={actionDate} />
          </div>,
          document.body
        )
      : null;

  if (disabled || !onChange) {
    return (
      <>
        <div
          ref={anchorRef}
          className="relative inline-block"
          aria-describedby={showTooltip ? tooltipId : undefined}
          {...hoverHandlers}
        >
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              statutBadgeClass(statut)
            )}
          >
            {SANTE_VISITE_VALIDATION_LABELS[statut]}
          </span>
        </div>
        {tooltipPortal}
      </>
    );
  }

  return (
    <>
      <div
        ref={anchorRef}
        className="relative inline-block"
        aria-describedby={showTooltip ? tooltipId : undefined}
        {...hoverHandlers}
      >
        <select
          value={statut}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as SanteVisiteValidation)}
          className={cn(
            "cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium",
            statutBadgeClass(statut)
          )}
        >
          {(Object.keys(SANTE_VISITE_VALIDATION_LABELS) as SanteVisiteValidation[]).map((key) => (
            <option key={key} value={key}>
              {SANTE_VISITE_VALIDATION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {tooltipPortal}
    </>
  );
}
