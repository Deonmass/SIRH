"use client";

import {
  AlertTriangle,
  Calendar,
  GitBranch,
  GraduationCap,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { DISCIPLINARY_TYPE_CONFIG } from "@/lib/disciplinary";
import { movementTypeLabel } from "@/lib/employee-kind";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import type { Employee } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type HistoriqueEventKind =
  | "created"
  | "movement"
  | "leave"
  | "formation"
  | "discipline"
  | "updated";

interface HistoriqueEvent {
  id: string;
  date: string;
  kind: HistoriqueEventKind;
  title: string;
  detail: string;
}

const EVENT_STYLE: Record<
  HistoriqueEventKind,
  {
    icon: typeof UserPlus;
    dot: string;
    card: string;
    iconWrap: string;
  }
> = {
  created: {
    icon: UserPlus,
    dot: "bg-emerald-500 ring-emerald-500/30",
    card: "border-emerald-500/25 bg-emerald-500/5",
    iconWrap: "bg-emerald-500/20 text-emerald-500",
  },
  movement: {
    icon: GitBranch,
    dot: "bg-sky-500 ring-sky-500/30",
    card: "border-sky-500/25 bg-sky-500/5",
    iconWrap: "bg-sky-500/20 text-sky-500",
  },
  leave: {
    icon: Calendar,
    dot: "bg-cyan-500 ring-cyan-500/30",
    card: "border-cyan-500/25 bg-cyan-500/5",
    iconWrap: "bg-cyan-500/20 text-cyan-500",
  },
  formation: {
    icon: GraduationCap,
    dot: "bg-violet-500 ring-violet-500/30",
    card: "border-violet-500/25 bg-violet-500/5",
    iconWrap: "bg-violet-500/20 text-violet-500",
  },
  discipline: {
    icon: AlertTriangle,
    dot: "bg-amber-500 ring-amber-500/30",
    card: "border-amber-500/25 bg-amber-500/5",
    iconWrap: "bg-amber-500/20 text-amber-500",
  },
  updated: {
    icon: RefreshCw,
    dot: "bg-slate-400 ring-slate-400/30",
    card: "border-[var(--shell-border)] bg-[var(--shell-surface)]/60",
    iconWrap: "bg-slate-500/15 text-[var(--shell-text-muted)]",
  },
};

function buildHistoriqueEvents(employee: Employee): HistoriqueEvent[] {
  const dossier = getEmployeeDossier(employee);
  const events: HistoriqueEvent[] = [
    {
      id: "created",
      date: employee.createdAt,
      kind: "created",
      title: "Création du dossier",
      detail: dossier.createdBy ?? "Système",
    },
    ...employee.movements.map((m) => ({
      id: m.id,
      date: m.effectiveDate || m.date,
      kind: "movement" as const,
      title: movementTypeLabel(m.type),
      detail: [m.reason, m.toPosition ? `→ ${m.toPosition}` : ""].filter(Boolean).join(" · "),
    })),
    ...(dossier.leaveHistory ?? []).map((l) => ({
      id: l.id,
      date: l.startDate,
      kind: "leave" as const,
      title: `Congé ${l.type.replace(/_/g, " ")}`,
      detail: `${l.days} j · ${l.status}`,
    })),
    ...(dossier.formationHistory ?? []).map((f) => ({
      id: f.id,
      date: f.endDate || f.startDate || employee.updatedAt,
      kind: "formation" as const,
      title: `Formation : ${f.label}`,
      detail: f.completed ? "Terminée" : "En cours",
    })),
    ...(employee.disciplinaryRecords ?? []).map((r) => ({
      id: r.id,
      date: r.effectiveDate ?? r.date,
      kind: "discipline" as const,
      title: DISCIPLINARY_TYPE_CONFIG[r.type].label,
      detail: `${r.reason} · ${r.status}`,
    })),
    {
      id: "updated",
      date: employee.updatedAt,
      kind: "updated",
      title: "Dernière mise à jour",
      detail: dossier.updatedBy ?? "Système",
    },
  ];

  return events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function DossierHistoriqueTab({ employee }: { employee: Employee }) {
  const events = buildHistoriqueEvents(employee);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--shell-text)]">Historique de l&apos;employé</h3>
        <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
          Événements du dossier — du plus récent au plus ancien
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--shell-text-muted)]">Aucun événement enregistré.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev, idx) => {
            const style = EVENT_STYLE[ev.kind];
            const Icon = style.icon;
            return (
              <div key={ev.id} className="relative flex gap-3 pl-1">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span
                    className={cn("mt-3 h-2.5 w-2.5 shrink-0 rounded-full ring-4", style.dot)}
                    aria-hidden
                  />
                  {idx < events.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-[var(--shell-border)]" />
                  )}
                </div>
                <div
                  className={cn(
                    "mb-1 min-w-0 flex-1 rounded-xl border p-3 transition hover:brightness-[1.02]",
                    style.card
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-lg p-2",
                        style.iconWrap
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
                        {formatDate(ev.date)}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--shell-text)]">
                        {ev.title}
                      </p>
                      {ev.detail && (
                        <p className="mt-1 text-xs text-[var(--shell-text-muted)]">{ev.detail}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
