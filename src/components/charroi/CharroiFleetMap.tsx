"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  MapPin,
  Minus,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import {
  STATUT_LABEL,
  VehiculeStatutBadge,
  VehiculeTypeIcon,
} from "@/components/charroi/charroi-vehicule-icons";
import type { CharroiVehicule, CharroiVehiculeStatut } from "@/lib/repositories/charroi";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import { cn } from "@/lib/utils";

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function simulatedPosition(seed: string): { x: number; y: number } {
  const h = hashSeed(seed);
  return {
    x: 12 + (h % 7600) / 100,
    y: 10 + ((h >>> 8) % 7200) / 100,
  };
}

function fleetPanelClass(...classes: (string | undefined)[]) {
  return cn(
    "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-[var(--shell-surface)]/50",
    ...classes
  );
}

function PanelRefreshButton({
  onRefresh,
  label,
}: {
  onRefresh: () => Promise<void>;
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onRefresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-[var(--shell-border)] p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-400 disabled:opacity-50"
      title={label}
      aria-label={label}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
    </button>
  );
}

export function CharroiFleetMap({
  vehicules,
  coursesAffectees,
  coursesEnCours,
  className,
  onRefresh,
  showAffecteMarkers = true,
  compactHeader = false,
}: {
  vehicules: CharroiVehicule[];
  coursesAffectees: CourseVehicule[];
  coursesEnCours: CourseVehicule[];
  className?: string;
  onRefresh?: () => Promise<void>;
  /** Afficher les marqueurs « affecté — attente départ » sur la carte */
  showAffecteMarkers?: boolean;
  compactHeader?: boolean;
}) {
  const [tick, setTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2400);
    return () => window.clearInterval(id);
  }, []);

  const vehiculeById = useMemo(() => {
    const map = new Map<string, CharroiVehicule>();
    vehicules.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicules]);

  const vehiculeByPlaque = useMemo(() => {
    const map = new Map<string, CharroiVehicule>();
    vehicules.forEach((v) => {
      if (v.immatriculation) map.set(v.immatriculation.toUpperCase(), v);
    });
    return map;
  }, [vehicules]);

  function buildCourseMarkers(
    courses: CourseVehicule[],
    phase: "affecte" | "en_cours"
  ) {
    return courses
      .filter((c) => c.vehiculeId || c.vehiculePlaque)
      .map((course) => {
        const vehicule =
          (course.vehiculeId ? vehiculeById.get(course.vehiculeId) : undefined) ??
          (course.vehiculePlaque
            ? vehiculeByPlaque.get(course.vehiculePlaque.toUpperCase())
            : undefined);
        const base = simulatedPosition(`${phase}-${course.id}`);
        const drift =
          phase === "en_cours" ? Math.sin(tick + hashSeed(course.id)) * 1.8 : 0;
        return {
          id: `${phase}-${course.id}`,
          plaque: course.vehiculePlaque ?? vehicule?.immatriculation ?? "—",
          modele: vehicule?.modele,
          destination:
            phase === "affecte"
              ? "Affecté — attente départ"
              : (course.destination ?? "En route"),
          x: Math.min(88, Math.max(8, base.x + drift)),
          y: Math.min(86, Math.max(12, base.y + drift * 0.6)),
          phase,
          iconStatut: (phase === "affecte" ? "affecte" : "en_course") as CharroiVehiculeStatut,
        };
      });
  }

  const affecteMarkers = useMemo(
    () => buildCourseMarkers(coursesAffectees, "affecte"),
    [coursesAffectees, tick, vehiculeById, vehiculeByPlaque]
  );

  const enRouteMarkers = useMemo(
    () => buildCourseMarkers(coursesEnCours, "en_cours"),
    [coursesEnCours, tick, vehiculeById, vehiculeByPlaque]
  );

  const markers = [
    ...(showAffecteMarkers ? affecteMarkers : []),
    ...enRouteMarkers,
  ];

  function clampZoom(value: number) {
    return Math.min(2.5, Math.max(0.6, value));
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-map-control]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    mapRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    mapRef.current?.releasePointerCapture(e.pointerId);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? 0.1 : -0.1)));
  }

  return (
    <section className={fleetPanelClass("border-violet-500/30", className)}>
      <div
        className={cn(
          "shrink-0 border-b border-[var(--shell-border)]",
          compactHeader ? "px-3 py-2" : "px-4 py-3"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="h-4 w-4 shrink-0 text-violet-400" />
            <div>
              <h3
                className={cn(
                  "font-semibold text-violet-400",
                  compactHeader ? "text-xs" : "text-sm"
                )}
              >
                Carte temps réel
              </h3>
              <p className="text-[10px] text-[var(--shell-text-muted)]">
                {showAffecteMarkers && `${affecteMarkers.length} affecté(s) · `}
                {enRouteMarkers.length} en route
              </p>
            </div>
          </div>
          {onRefresh && (
            <PanelRefreshButton onRefresh={onRefresh} label="Actualiser la carte" />
          )}
        </div>
      </div>
      <div
        ref={mapRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-slate-200 active:cursor-grabbing dark:bg-[#0c1220]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <div
          data-map-control
          className="absolute right-3 top-3 z-20 flex flex-col gap-1"
        >
          <button
            type="button"
            data-map-control
            onClick={() => setZoom((z) => clampZoom(z + 0.2))}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-popover)] p-1.5 text-[var(--shell-text)] shadow-sm hover:bg-[var(--shell-hover)]"
            aria-label="Zoom avant"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-map-control
            onClick={() => setZoom((z) => clampZoom(z - 0.2))}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-popover)] p-1.5 text-[var(--shell-text)] shadow-sm hover:bg-[var(--shell-hover)]"
            aria-label="Zoom arrière"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-map-control
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-popover)] p-1.5 text-[var(--shell-text)] shadow-sm hover:bg-[var(--shell-hover)]"
            aria-label="Réinitialiser la vue"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div
          className="absolute inset-0 origin-center transition-transform duration-150"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg className="absolute inset-0 h-full w-full opacity-40 dark:opacity-30" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={`${(i + 1) * 8}%`}
                x2="100%"
                y2={`${(i + 1) * 8}%`}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-600"
              />
            ))}
            {Array.from({ length: 16 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={`${(i + 1) * 6}%`}
                y1="0"
                x2={`${(i + 1) * 6}%`}
                y2="100%"
                className="text-slate-300 dark:text-slate-700"
                stroke="currentColor"
              />
            ))}
          </svg>

          <div className="absolute left-[18%] top-[22%] rounded border border-[var(--shell-border)] bg-[var(--shell-popover)]/95 px-2 py-0.5 text-[10px] text-[var(--shell-text-muted)] shadow-sm">
            Kinshasa
          </div>
          <div className="absolute left-[52%] top-[48%] rounded border border-[var(--shell-border)] bg-[var(--shell-popover)]/95 px-2 py-0.5 text-[10px] text-[var(--shell-text-muted)] shadow-sm">
            Matadi
          </div>
          <div className="absolute left-[68%] top-[30%] rounded border border-[var(--shell-border)] bg-[var(--shell-popover)]/95 px-2 py-0.5 text-[10px] text-[var(--shell-text-muted)] shadow-sm">
            Kimpese
          </div>

          {markers.map((m) => (
            <div
              key={m.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2",
                m.phase === "en_cours" && "transition-all duration-[2400ms] ease-in-out"
              )}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            >
              <div className="relative">
                {m.phase === "en_cours" && (
                  <span className="absolute -inset-1 animate-ping rounded-full bg-amber-400/30" />
                )}
                <VehiculeTypeIcon
                  modele={m.modele}
                  statut={m.iconStatut}
                  size="sm"
                  className="relative shadow-lg"
                />
              </div>
              <div
                className={cn(
                  "mt-1 min-w-[5.5rem] rounded-md border px-2 py-1 text-[10px] shadow-lg",
                  "bg-[var(--shell-popover)] text-[var(--shell-text)]",
                  m.phase === "en_cours"
                    ? "border-amber-500/40"
                    : "border-sky-500/40"
                )}
              >
                <div className="font-mono font-semibold">{m.plaque}</div>
                <div className={m.phase === "en_cours" ? "text-amber-600 dark:text-amber-300/90" : "text-sky-600 dark:text-sky-300/90"}>
                  {m.destination}
                </div>
              </div>
            </div>
          ))}

          {markers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-[var(--shell-text-muted)]">
              <MapPin className="h-8 w-8 opacity-40" />
              Aucun véhicule à afficher
            </div>
          )}
        </div>

        <div className="absolute bottom-2 left-2 rounded-md border border-[var(--shell-border)] bg-[var(--shell-popover)]/95 px-2 py-1 text-[10px] text-[var(--shell-text-muted)] shadow-sm">
          Molette ou boutons · glisser pour déplacer
        </div>
        <div className="absolute bottom-2 right-2 rounded-md border border-[var(--shell-border)] bg-[var(--shell-popover)]/95 px-2 py-1 text-[10px] text-[var(--shell-text-muted)] shadow-sm">
          Données GPS simulées
        </div>
      </div>
    </section>
  );
}

export function ParcVehiculeDetailModal({
  vehicule,
  onClose,
}: {
  vehicule: CharroiVehicule;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div className="flex items-center gap-3">
            <VehiculeTypeIcon modele={vehicule.modele} statut={vehicule.statut} size="md" />
            <div>
              <h3 className="text-lg font-semibold">{vehicule.immatriculation}</h3>
              <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
                {[vehicule.marque, vehicule.modele].filter(Boolean).join(" · ") || "Véhicule"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="space-y-3 p-6">
          <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
            <dt className="text-xs text-[var(--shell-text-muted)]">Statut parc</dt>
            <dd className="text-sm">
              <VehiculeStatutBadge statut={vehicule.statut} />
            </dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
            <dt className="text-xs text-[var(--shell-text-muted)]">Marque</dt>
            <dd className="text-sm">{vehicule.marque ?? "—"}</dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
            <dt className="text-xs text-[var(--shell-text-muted)]">Type</dt>
            <dd className="text-sm">{vehicule.modele ?? "—"}</dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
            <dt className="text-xs text-[var(--shell-text-muted)]">Immatriculation</dt>
            <dd className="font-mono text-sm">{vehicule.immatriculation}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function CharroiVehiculesDisponibles({
  vehicules,
  className,
  onAddVehicule,
  canAdd,
  onRefresh,
  onSelectVehicule,
  onContextMenuVehicule,
  variant = "grid",
}: {
  vehicules: CharroiVehicule[];
  className?: string;
  onAddVehicule?: () => void;
  canAdd?: boolean;
  onRefresh?: () => Promise<void>;
  onSelectVehicule?: (vehicule: CharroiVehicule) => void;
  onContextMenuVehicule?: (e: React.MouseEvent, vehicule: CharroiVehicule) => void;
  variant?: "grid" | "vertical";
}) {
  const [search, setSearch] = useState("");
  const disponibles = vehicules.filter((v) => v.statut === "disponible");
  const affectes = vehicules.filter((v) => v.statut === "affecte");
  const enRoute = vehicules.filter((v) => v.statut === "en_course");
  const horsService = vehicules.filter((v) => v.statut === "maintenance");
  const vertical = variant === "vertical";

  const filteredVehicules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicules;
    return vehicules.filter((v) => {
      const haystack = [
        v.immatriculation,
        v.marque,
        v.modele,
        STATUT_LABEL[v.statut],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [vehicules, search]);

  return (
    <section className={fleetPanelClass("border-slate-500/30", className)}>
      <div
        className={cn(
          "shrink-0 border-b border-[var(--shell-border)]",
          vertical ? "px-1.5 py-1" : "px-3 py-2.5"
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <h3
              className={cn(
                "font-semibold text-slate-300",
                vertical ? "text-[10px] leading-tight" : "text-sm"
              )}
            >
              {vertical ? "Parc véh." : "Parc véhicules"}
            </h3>
            {!vertical && (
              <p className="text-xs text-[var(--shell-text-muted)]">
                {disponibles.length} dispo · {affectes.length} affecté(s) · {enRoute.length} en route
                {horsService.length > 0 ? ` · ${horsService.length} hors service` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRefresh && (
              <PanelRefreshButton onRefresh={onRefresh} label="Actualiser le parc" />
            )}
            {canAdd && onAddVehicule && !vertical && (
              <button
                type="button"
                onClick={onAddVehicule}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}
          </div>
        </div>
        {vertical && (
          <label className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaque, marque…"
              className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] py-0.5 pl-5 pr-1 text-[9px] text-[var(--shell-text)] placeholder:text-[var(--shell-text-muted)] focus:border-sky-500/50 focus:outline-none"
            />
          </label>
        )}
      </div>
      <div className={cn("min-h-0 flex-1 overflow-auto", vertical ? "p-px" : "p-2")}>
        {filteredVehicules.length === 0 ? (
          <p className="py-6 text-center text-[9px] text-[var(--shell-text-muted)]">
            {vehicules.length === 0 ? "Aucun véhicule enregistré." : "Aucun résultat."}
          </p>
        ) : vertical ? (
          <ul className="grid grid-cols-2 gap-px">
            {filteredVehicules.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onSelectVehicule?.(v)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenuVehicule?.(e, v);
                  }}
                  className="flex w-full flex-col items-center rounded-sm p-0 py-0.5 transition-colors hover:bg-[var(--shell-hover)]"
                  title={[v.immatriculation, STATUT_LABEL[v.statut], v.marque, v.modele]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  <VehiculeTypeIcon
                    modele={v.modele}
                    statut={v.statut}
                    size="sm"
                    className="!h-7 !w-7 shrink-0 [&_svg]:!h-3.5 [&_svg]:!w-3.5"
                  />
                  <div className="mt-px w-full min-w-0 text-center leading-none">
                    <div className="truncate font-mono text-[9px] font-semibold leading-tight">
                      {v.immatriculation}
                    </div>
                    <VehiculeStatutBadge statut={v.statut} compact />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {vehicules.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVehicule?.(v)}
                className="flex flex-col items-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)]/40 px-1 py-2 text-center transition-colors hover:bg-[var(--shell-hover)]"
              >
                <VehiculeTypeIcon modele={v.modele} statut={v.statut} size="sm" />
                <div className="mt-1.5 w-full truncate font-mono text-[10px] font-semibold">
                  {v.immatriculation}
                </div>
                <div className="mt-0.5 w-full truncate text-[9px] text-[var(--shell-text-muted)]">
                  {[v.marque, v.modele].filter(Boolean).join(" · ") || "—"}
                </div>
                <VehiculeStatutBadge statut={v.statut} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CharroiVehiculesEnPanne({
  vehicules,
  className,
  onRefresh,
  onSelectVehicule,
  onContextMenuVehicule,
  layout = "horizontal",
}: {
  vehicules: CharroiVehicule[];
  className?: string;
  onRefresh?: () => Promise<void>;
  onSelectVehicule?: (vehicule: CharroiVehicule) => void;
  onContextMenuVehicule?: (e: React.MouseEvent, vehicule: CharroiVehicule) => void;
  layout?: "horizontal" | "vertical";
}) {
  const vertical = layout === "vertical";

  return (
    <section className={fleetPanelClass("border-red-500/30", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--shell-border)] px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <h3
            className={cn(
              "truncate font-semibold text-red-400",
              vertical ? "text-[10px] leading-tight" : "text-[11px]"
            )}
          >
            {vertical ? `Panne (${vehicules.length})` : `En panne (${vehicules.length})`}
          </h3>
        </div>
        {onRefresh && (
          <PanelRefreshButton onRefresh={onRefresh} label="Actualiser les pannes" />
        )}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 p-1.5",
          vertical ? "overflow-y-auto overflow-x-hidden" : "overflow-x-auto overflow-y-hidden"
        )}
      >
        {vehicules.length === 0 ? (
          <p className="flex h-full items-center justify-center text-[10px] text-[var(--shell-text-muted)]">
            Aucun véhicule en panne
          </p>
        ) : vertical ? (
          <ul className="flex flex-col gap-1">
            {vehicules.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onSelectVehicule?.(v)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenuVehicule?.(e, v);
                  }}
                  className="flex w-full flex-col items-center px-0.5 py-1 transition-colors hover:bg-red-500/10"
                >
                  <VehiculeTypeIcon modele={v.modele} statut="maintenance" size="sm" />
                  <span className="mt-1 truncate font-mono text-[9px] font-semibold">
                    {v.immatriculation}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full items-stretch gap-1.5">
            {vehicules.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVehicule?.(v)}
                className="flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 px-1 py-1 transition-colors hover:bg-red-500/10"
              >
                <VehiculeTypeIcon modele={v.modele} statut="maintenance" size="sm" />
                <span className="mt-1 truncate font-mono text-[9px] font-semibold">
                  {v.immatriculation}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CharroiAffectesAttenteDepart({
  courses,
  vehicules,
  className,
  onRefresh,
  onSelectCourse,
  onContextMenuCourse,
  layout = "horizontal",
}: {
  courses: CourseVehicule[];
  vehicules: CharroiVehicule[];
  className?: string;
  onRefresh?: () => Promise<void>;
  onSelectCourse?: (course: CourseVehicule) => void;
  onContextMenuCourse?: (e: React.MouseEvent, course: CourseVehicule) => void;
  layout?: "horizontal" | "vertical";
}) {
  const vertical = layout === "vertical";
  const vehiculeById = useMemo(() => {
    const map = new Map<string, CharroiVehicule>();
    vehicules.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicules]);

  const vehiculeByPlaque = useMemo(() => {
    const map = new Map<string, CharroiVehicule>();
    vehicules.forEach((v) => {
      if (v.immatriculation) map.set(v.immatriculation.toUpperCase(), v);
    });
    return map;
  }, [vehicules]);

  return (
    <section className={fleetPanelClass("border-sky-500/30", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--shell-border)] px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          <h3
            className={cn(
              "truncate font-semibold text-sky-400",
              vertical ? "text-[10px] leading-tight" : "text-[11px]"
            )}
          >
            {vertical
              ? `Attente (${courses.length})`
              : `Affecté — attente départ (${courses.length})`}
          </h3>
        </div>
        {onRefresh && (
          <PanelRefreshButton onRefresh={onRefresh} label="Actualiser les affectations" />
        )}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 p-1.5",
          vertical ? "overflow-y-auto overflow-x-hidden" : "overflow-x-auto overflow-y-hidden"
        )}
      >
        {courses.length === 0 ? (
          <p className="flex h-full items-center justify-center text-[10px] text-[var(--shell-text-muted)]">
            Aucune course en attente de départ
          </p>
        ) : vertical ? (
          <ul className="flex flex-col gap-1">
            {courses.map((course) => {
              const vehicule =
                (course.vehiculeId ? vehiculeById.get(course.vehiculeId) : undefined) ??
                (course.vehiculePlaque
                  ? vehiculeByPlaque.get(course.vehiculePlaque.toUpperCase())
                  : undefined);
              const plaque = course.vehiculePlaque ?? vehicule?.immatriculation ?? "—";
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCourse?.(course)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onContextMenuCourse?.(e, course);
                    }}
                    className="flex w-full flex-col items-center px-0.5 py-1 transition-colors hover:bg-sky-500/10"
                  >
                    <VehiculeTypeIcon
                      modele={vehicule?.modele}
                      statut="affecte"
                      size="sm"
                    />
                    <span className="mt-1 truncate font-mono text-[9px] font-semibold">
                      {plaque}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full items-stretch gap-1.5">
            {courses.map((course) => {
              const vehicule =
                (course.vehiculeId ? vehiculeById.get(course.vehiculeId) : undefined) ??
                (course.vehiculePlaque
                  ? vehiculeByPlaque.get(course.vehiculePlaque.toUpperCase())
                  : undefined);
              const plaque = course.vehiculePlaque ?? vehicule?.immatriculation ?? "—";
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelectCourse?.(course)}
                  className="flex min-w-[5.5rem] shrink-0 flex-col items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/5 px-1 py-1 transition-colors hover:bg-sky-500/10"
                >
                  <VehiculeTypeIcon
                    modele={vehicule?.modele}
                    statut="affecte"
                    size="sm"
                  />
                  <span className="mt-1 truncate font-mono text-[9px] font-semibold">
                    {plaque}
                  </span>
                  <span className="mt-0.5 max-w-full truncate text-[8px] text-sky-300/90">
                    {course.destination ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
