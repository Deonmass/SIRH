"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, RefreshCw, Search, Sparkles, Trash2, X, AlertTriangle, Eye, Pencil, Wrench, Route } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import {
  CharroiAffectesAttenteDepart,
  CharroiFleetMap,
  CharroiVehiculesDisponibles,
  CharroiVehiculesEnPanne,
  ParcVehiculeDetailModal,
} from "@/components/charroi/CharroiFleetMap";
import { CharroiAffectationIntelligenteModal } from "@/components/charroi/CharroiAffectationIntelligenteModal";
import { CharroiTypesCourseModal } from "@/components/charroi/CharroiTypesCourseModal";
import { CharroiChauffeurField } from "@/components/charroi/CharroiChauffeurField";
import { CharroiMatriculeField } from "@/components/charroi/CharroiMatriculeField";
import { useContextMenu } from "@/components/ui/ContextMenu";
import { SuggestTextField } from "@/components/ui/SuggestTextField";
import { useAuth } from "@/contexts/AuthContext";
import type { CharroiVehicule } from "@/lib/repositories/charroi";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import type { TypeCours } from "@/lib/repositories/type-cours";
import { parseCourseObservations } from "@/lib/charroi-course-observations";
import {
  combineDateAndTime,
  defaultTimeValue,
  formatDateTimeFr,
  formatRelativeFromNow,
  isDemandeExpiree,
  splitDateTime,
} from "@/lib/charroi-relative-time";
import { employeeDisplayName } from "@/lib/extra-costs";
import type { Employee, JobPosition } from "@/lib/types";
import { filterChauffeurEmployees } from "@/lib/charroi-chauffeurs";
import {
  readApiError,
  runDeleteWithSweetAlert,
  showErrorAlert,
} from "@/lib/alerts";
import { cn, formatDate } from "@/lib/utils";
import { formatKm, previewKmActuelCloture } from "@/lib/charroi-entretien";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";

const emptyDemandeForm = {
  dateDemande: new Date().toISOString().slice(0, 10),
  heureDemande: "08:00",
  matriculeAgent: "",
  typeCourseId: "",
  depart: "",
  destination: "",
  motif: "",
};

const emptyAffectForm = {
  vehiculeId: "",
  chauffeur: "",
};

const emptyDepartForm = {
  kmhDepart: "",
  niveauCarburant: "",
  passagers: "0",
  observationDepart: "",
};

const emptyClotureForm = {
  kmhArrive: "",
  observationArrive: "",
};

function employeeShortName(emp: { prenom: string; nom: string }): string {
  return `${emp.prenom} ${emp.nom}`.trim();
}

function resolveEmployeeName(
  matriculeOrName: string,
  employeeByMatricule: Map<string, Employee>,
  employees: Employee[]
): string {
  const byMatricule = employeeByMatricule.get(matriculeOrName);
  if (byMatricule) return employeeShortName(byMatricule);
  const byDisplay = employees.find((e) => employeeDisplayName(e) === matriculeOrName);
  if (byDisplay) return employeeShortName(byDisplay);
  return matriculeOrName;
}

function uniqueSuggestions(rows: CourseVehicule[], key: "depart" | "destination"): string[] {
  return Array.from(
    new Set(
      rows
        .map((r) => r[key])
        .filter((v): v is string => Boolean(v?.trim()))
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

function filterStageRows(rows: CourseVehicule[], query: string, fields: string[]): CourseVehicule[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = fields
      .map((key) => {
        const value = row[key as keyof CourseVehicule];
        return value != null ? String(value) : "";
      })
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function sortCoursesByDateDemandeAsc(rows: CourseVehicule[]): CourseVehicule[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.dateDemande).getTime();
    const tb = new Date(b.dateDemande).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });
}

function filterDemandesRows(
  rows: CourseVehicule[],
  query: string,
  employeeByMatricule: Map<string, Employee>
): CourseVehicule[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const employee = employeeByMatricule.get(row.matriculeAgent);
    const haystack = [
      row.matriculeAgent,
      employee ? employeeShortName(employee) : "",
      row.depart,
      row.destination,
      row.typeCourseDesignation,
      row.motif,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function filterExecutionRows(
  rows: CourseVehicule[],
  query: string,
  employeeByMatricule: Map<string, Employee>,
  employees: Employee[]
): CourseVehicule[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const employee = employeeByMatricule.get(row.matriculeAgent);
    const obs = parseCourseObservations(row.observations);
    const haystack = [
      row.vehiculePlaque,
      row.chauffeur,
      employee ? employeeShortName(employee) : row.matriculeAgent,
      employee?.department,
      row.destination,
      row.depart,
      String(row.kmhArrive ?? ""),
      obs.depart,
      obs.arrive,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function AgentCell({
  row,
  employee,
  expired,
}: {
  row: CourseVehicule;
  employee?: Employee;
  expired?: boolean;
}) {
  return (
    <>
      <div className={cn("font-medium", expired && "text-red-400")}>
        {employee ? employeeShortName(employee) : row.matriculeAgent}
      </div>
      <div
        className={cn(
          "text-[10px]",
          expired ? "text-red-400/90" : "text-[var(--shell-text-muted)]"
        )}
      >
        {formatDateTimeFr(row.dateDemande)}
      </div>
      <div className={cn("text-[10px]", expired ? "font-medium text-red-400" : "text-sky-400")}>
        {expired ? "Expirée — non affectée" : formatRelativeFromNow(row.dateDemande)}
      </div>
    </>
  );
}

function TrajetCell({ row, expired }: { row: CourseVehicule; expired?: boolean }) {
  const from = row.depart ?? "—";
  const to = row.destination ?? "—";
  return (
    <>
      <div className={cn(expired && "text-red-400")}>{to}</div>
      {row.depart && (
        <div
          className={cn(
            "text-[10px]",
            expired ? "text-red-400/80" : "text-[var(--shell-text-muted)]"
          )}
        >
          Depuis {from}
        </div>
      )}
    </>
  );
}

function matchesCoursePeriod(dateDemande: string, year: number, month: number | ""): boolean {
  const parts = dateDemande.slice(0, 10).split("-");
  if (parts.length < 2) return true;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(y) || y !== year) return false;
  if (month !== "" && m !== month) return false;
  return true;
}

const COURSE_STATUT_LABEL: Record<CourseVehicule["statut"], string> = {
  demande: "Demande",
  affecte: "Affecté",
  en_cours: "En route",
  terminee: "Terminée",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs text-[var(--shell-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--shell-text)]">{value}</dd>
    </div>
  );
}

function CourseDetailModal({
  course,
  employee,
  onClose,
}: {
  course: CourseVehicule;
  employee?: Employee;
  onClose: () => void;
}) {
  const obs = parseCourseObservations(course.observations);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Détail de la course</h3>
            <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
              {COURSE_STATUT_LABEL[course.statut]}
              {course.statut === "demande" && isDemandeExpiree(course.dateDemande) && (
                <span className="ml-2 font-medium text-red-400">· Expirée — non affectée</span>
              )}
            </p>
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
          <DetailRow label="Date demande" value={formatDateTimeFr(course.dateDemande)} />
          <DetailRow
            label="Demandeur"
            value={
              employee
                ? `${employeeShortName(employee)}${employee.department ? ` — ${employee.department}` : ""}`
                : course.matriculeAgent
            }
          />
          <DetailRow label="Type" value={course.typeCourseDesignation ?? "—"} />
          <DetailRow label="Départ" value={course.depart ?? "—"} />
          <DetailRow label="Destination" value={course.destination ?? "—"} />
          <DetailRow label="Motif" value={course.motif?.trim() || "—"} />
          {course.vehiculePlaque && (
            <DetailRow label="Véhicule" value={course.vehiculePlaque} />
          )}
          {course.chauffeur && <DetailRow label="Chauffeur" value={course.chauffeur} />}
          {course.kmhDepart != null && (
            <DetailRow label="Km départ" value={String(course.kmhDepart)} />
          )}
          {course.kmhArrive != null && (
            <DetailRow label="Km arrivée" value={String(course.kmhArrive)} />
          )}
          {course.niveauCarburant != null && (
            <DetailRow label="Carburant (%)" value={String(course.niveauCarburant)} />
          )}
          {course.passagers != null && (
            <DetailRow label="Passagers" value={String(course.passagers)} />
          )}
          {obs.depart && <DetailRow label="Obs. départ" value={obs.depart} />}
          {obs.arrive && <DetailRow label="Obs. arrivée" value={obs.arrive} />}
        </dl>
      </div>
    </div>
  );
}

const courseRowClass = "cursor-pointer hover:bg-[var(--shell-hover)]";

function BlockRefreshButton({
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
        } catch (e) {
          await showErrorAlert(
            "Actualisation impossible",
            e instanceof Error ? e.message : "Erreur"
          );
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

function StageTableSection({
  title,
  subtitle,
  tone,
  headerLeadingAction,
  headerAction,
  onRefresh,
  refreshLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  fullHeight = false,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "amber" | "sky" | "emerald";
  headerLeadingAction?: React.ReactNode;
  headerAction?: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refreshLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  fullHeight?: boolean;
  children: React.ReactNode;
}) {
  const borderClass =
    tone === "amber"
      ? "border-amber-500/30"
      : tone === "sky"
        ? "border-sky-500/30"
        : "border-emerald-500/30";
  const titleClass =
    tone === "amber"
      ? "text-amber-400"
      : tone === "sky"
        ? "text-sky-400"
        : "text-emerald-400";

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-[var(--shell-surface)]/50",
        fullHeight ? "h-full min-h-0" : "min-h-[280px] max-h-[min(420px,calc(100vh-320px))]",
        borderClass
      )}
    >
      <div className="shrink-0 border-b border-[var(--shell-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-sm font-semibold", titleClass)}>{title}</h3>
            <p className="text-xs text-[var(--shell-text-muted)]">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerLeadingAction}
            {onRefresh && (
              <BlockRefreshButton
                onRefresh={onRefresh}
                label={refreshLabel ?? `Actualiser ${title.toLowerCase()}`}
              />
            )}
            {headerAction}
          </div>
        </div>
        {onSearchChange != null && (
          <label className="relative mt-2 block text-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? "Rechercher…"}
              className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] py-1.5 pl-8 pr-8 text-xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Effacer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

export function CharroiPlanningClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const { can } = useAuth();
  const canWrite = can("charroi.planning", "write");
  const canDelete = can("charroi.planning", "delete");
  const canWriteVehicules = can("charroi.vehicules", "write");

  const [courses, setCourses] = useState<CourseVehicule[]>([]);
  const [vehicules, setVehicules] = useState<CharroiVehicule[]>([]);
  const [types, setTypes] = useState<TypeCours[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [postes, setPostes] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchDemandes, setSearchDemandes] = useState("");
  const [searchAffectation, setSearchAffectation] = useState("");
  const [searchExecution, setSearchExecution] = useState("");
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [showDemande, setShowDemande] = useState(false);
  const [editingDemande, setEditingDemande] = useState<CourseVehicule | null>(null);
  const [affectTarget, setAffectTarget] = useState<CourseVehicule | null>(null);
  const [affectMode, setAffectMode] = useState<"assign" | "edit">("assign");
  const [departTarget, setDepartTarget] = useState<CourseVehicule | null>(null);
  const [clotureTarget, setClotureTarget] = useState<CourseVehicule | null>(null);
  const [demandeForm, setDemandeForm] = useState(emptyDemandeForm);
  const [affectForm, setAffectForm] = useState(emptyAffectForm);
  const [departForm, setDepartForm] = useState(emptyDepartForm);
  const [clotureForm, setClotureForm] = useState(emptyClotureForm);
  const [detailCourse, setDetailCourse] = useState<CourseVehicule | null>(null);
  const [detailParcVehicule, setDetailParcVehicule] = useState<CharroiVehicule | null>(null);
  const [showAffectationIntel, setShowAffectationIntel] = useState(false);
  const [planningTab, setPlanningTab] = useState<"workflow" | "fleet">("workflow");
  const [panneTarget, setPanneTarget] = useState<CharroiVehicule | null>(null);
  const [remiseTarget, setRemiseTarget] = useState<CharroiVehicule | null>(null);
  const [panneForm, setPanneForm] = useState({ description: "", at: "" });
  const [panneSaving, setPanneSaving] = useState(false);
  const [remiseSaving, setRemiseSaving] = useState(false);
  const [affectDemandePicker, setAffectDemandePicker] = useState<CharroiVehicule | null>(null);
  const [showTypesCourse, setShowTypesCourse] = useState(false);
  const { open, menuNode } = useContextMenu();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, vRes, tRes, eRes, pRes] = await Promise.all([
        fetch("/api/charroi/courses"),
        fetch("/api/charroi/vehicules?planning=1"),
        fetch("/api/charroi/types-course"),
        fetch("/api/employees"),
        fetch("/api/postes"),
      ]);
      const [cData, vData, tData, eData, pData] = await Promise.all([
        cRes.json(),
        vRes.json(),
        tRes.json(),
        eRes.ok ? eRes.json() : [],
        pRes.ok ? pRes.json() : [],
      ]);
      if (!cRes.ok || !vRes.ok || !tRes.ok) {
        throw new Error(cData.error ?? vData.error ?? tData.error ?? "Chargement impossible");
      }
      setCourses(cData);
      setVehicules(vData);
      setTypes(tData);
      setEmployees(eData);
      setPostes(pData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("types") === "1") {
      setShowTypesCourse(true);
      router.replace("/charroi/planning", { scroll: false });
    }
  }, [searchParams, router]);

  const handleTypesChange = useCallback((updated: TypeCours[]) => {
    setTypes(updated);
  }, []);

  const refreshCourses = useCallback(async () => {
    const cRes = await fetch("/api/charroi/courses");
    if (!cRes.ok) throw new Error(await readApiError(cRes));
    setCourses(await cRes.json());
  }, []);

  const refreshVehicules = useCallback(async () => {
    const vRes = await fetch("/api/charroi/vehicules?planning=1");
    if (!vRes.ok) throw new Error(await readApiError(vRes));
    setVehicules(await vRes.json());
  }, []);

  const refreshFleetData = useCallback(async () => {
    await Promise.all([refreshCourses(), refreshVehicules()]);
  }, [refreshCourses, refreshVehicules]);

  const upsertCourse = useCallback(
    async (updated: CourseVehicule) => {
      setCourses((prev) => {
        const idx = prev.findIndex((c) => c.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
      setDetailCourse((prev) => (prev?.id === updated.id ? updated : prev));
      await refreshVehicules();
    },
    [refreshVehicules]
  );

  const removeCourse = useCallback(
    async (id: string) => {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setDetailCourse((prev) => (prev?.id === id ? null : prev));
      await refreshVehicules();
    },
    [refreshVehicules]
  );

  const employeeByMatricule = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.matricule, e));
    return map;
  }, [employees]);

  const postesById = useMemo(() => {
    const map = new Map<string, JobPosition>();
    postes.forEach((p) => map.set(p.id, p));
    return map;
  }, [postes]);

  const chauffeurs = useMemo(
    () => filterChauffeurEmployees(employees, postesById),
    [employees, postesById]
  );

  const vehiculesDisponibles = useMemo(
    () => vehicules.filter((v) => v.statut === "disponible"),
    [vehicules]
  );

  const vehiculesAffectables = useMemo(() => {
    const currentId = affectTarget?.vehiculeId;
    return vehicules.filter(
      (v) =>
        v.statut !== "maintenance" &&
        (v.statut === "disponible" || (currentId != null && v.id === currentId))
    );
  }, [vehicules, affectTarget?.vehiculeId]);

  const vehiculesEnPanne = useMemo(
    () => vehicules.filter((v) => v.statut === "maintenance"),
    [vehicules]
  );

  const vehiculesParc = useMemo(
    () => vehicules.filter((v) => v.statut !== "affecte" && v.statut !== "en_course"),
    [vehicules]
  );

  const departSuggestions = useMemo(() => uniqueSuggestions(courses, "depart"), [courses]);
  const destinationSuggestions = useMemo(
    () => uniqueSuggestions(courses, "destination"),
    [courses]
  );

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i);
  }, [now]);

  const cloturePreview = useMemo(() => {
    if (!clotureTarget) return null;
    const kmArrive = clotureForm.kmhArrive.trim()
      ? Number(clotureForm.kmhArrive)
      : undefined;
    return previewKmActuelCloture(kmArrive, clotureTarget.kmhDepart);
  }, [clotureTarget, clotureForm.kmhArrive]);

  const departKmHint = useMemo(() => {
    if (!departTarget?.vehiculeId) return null;
    const vehicule = vehicules.find((v) => v.id === departTarget.vehiculeId);
    if (!vehicule) return null;
    if (vehicule.kmActuel != null) {
      return "Compteur actuel du véhicule (synchronisé avec le suivi entretien)";
    }
    if (vehicule.kilometrageInitiale != null) {
      return "Kilométrage initial du véhicule";
    }
    return null;
  }, [departTarget, vehicules]);

  const coursesByPeriod = useMemo(
    () => courses.filter((c) => matchesCoursePeriod(c.dateDemande, filterYear, filterMonth)),
    [courses, filterYear, filterMonth]
  );

  const allDemandes = useMemo(
    () =>
      sortCoursesByDateDemandeAsc(
        coursesByPeriod.filter((c) => c.statut === "demande")
      ),
    [coursesByPeriod]
  );
  const allAffectees = useMemo(
    () => coursesByPeriod.filter((c) => c.statut === "affecte"),
    [coursesByPeriod]
  );
  const allEnCours = useMemo(
    () => coursesByPeriod.filter((c) => c.statut === "en_cours"),
    [coursesByPeriod]
  );
  const allTerminees = useMemo(
    () => coursesByPeriod.filter((c) => c.statut === "terminee"),
    [coursesByPeriod]
  );
  const allExecution = useMemo(
    () => [...allEnCours, ...allTerminees],
    [allEnCours, allTerminees]
  );

  const demandes = useMemo(
    () =>
      sortCoursesByDateDemandeAsc(
        filterDemandesRows(allDemandes, searchDemandes, employeeByMatricule)
      ),
    [allDemandes, searchDemandes, employeeByMatricule]
  );
  const affectees = useMemo(
    () =>
      filterStageRows(allAffectees, searchAffectation, [
        "vehiculePlaque",
        "chauffeur",
        "destination",
        "depart",
        "matriculeAgent",
      ]),
    [allAffectees, searchAffectation]
  );
  const executionRows = useMemo(
    () => filterExecutionRows(allExecution, searchExecution, employeeByMatricule, employees),
    [allExecution, searchExecution, employeeByMatricule, employees]
  );

  function stageSubtitle(filtered: number, total: number, label: string) {
    if (filtered !== total) return `${filtered} / ${total} ${label}`;
    return `${total} ${label}`;
  }

  function panneFormDefaults() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return { description: "", at: now.toISOString().slice(0, 16) };
  }

  function parcContextMenuItems(vehicule: CharroiVehicule) {
    const items = [
      {
        id: "view",
        label: "Visualiser",
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: () => setDetailParcVehicule(vehicule),
      },
    ];
    if (canWriteVehicules && vehicule.statut !== "maintenance") {
      items.push(
        {
          id: "edit",
          label: "Modifier",
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: () => router.push(`/charroi/vehicules?edit=${encodeURIComponent(vehicule.id)}`),
        },
        {
          id: "panne",
          label: "Déclarer une panne",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          onClick: () => openDeclarePanne(vehicule),
        }
      );
    }
    if (canWrite && vehicule.statut === "disponible" && allDemandes.length > 0) {
      items.push({
        id: "affect_course",
        label: "Affecter une course",
        onClick: () => openAffectFromParc(vehicule),
      });
    }
    return items;
  }

  function panneContextMenuItems(vehicule: CharroiVehicule) {
    return [
      {
        id: "view",
        label: "Visualiser",
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: () => setDetailParcVehicule(vehicule),
      },
      ...(canWriteVehicules
        ? [
            {
              id: "remise",
              label: "Remettre en service",
              icon: <Wrench className="h-3.5 w-3.5" />,
              onClick: () => openRemiseEnService(vehicule),
            },
          ]
        : []),
    ];
  }

  function attenteContextMenuItems(course: CourseVehicule) {
    return [
      {
        id: "view",
        label: "Visualiser",
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: () => setDetailCourse(course),
      },
      ...(canWrite
        ? [
            {
              id: "depart",
              label: "Départ",
              onClick: () => openDepart(course),
            },
            {
              id: "edit_affectation",
              label: "Modifier l'affectation",
              onClick: () => openEditAffectation(course),
            },
          ]
        : []),
    ];
  }

  function openParcContextMenu(e: React.MouseEvent, vehicule: CharroiVehicule) {
    const items = parcContextMenuItems(vehicule);
    if (items.length) open(e, items);
  }

  function openPanneVehiculeContextMenu(e: React.MouseEvent, vehicule: CharroiVehicule) {
    const items = panneContextMenuItems(vehicule);
    if (items.length) open(e, items);
  }

  function openAttenteContextMenu(e: React.MouseEvent, course: CourseVehicule) {
    const items = attenteContextMenuItems(course);
    if (items.length) open(e, items);
  }

  function openDeclarePanne(vehicule: CharroiVehicule) {
    if (!canWriteVehicules) return;
    setPanneTarget(vehicule);
    setPanneForm(panneFormDefaults());
  }

  function openRemiseEnService(vehicule: CharroiVehicule) {
    if (!canWriteVehicules) return;
    setRemiseTarget(vehicule);
    setPanneForm(panneFormDefaults());
  }

  async function submitDeclarePanne(e: React.FormEvent) {
    e.preventDefault();
    if (!canWriteVehicules || !panneTarget) return;
    setPanneSaving(true);
    try {
      const res = await fetch("/api/charroi/vehicules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "declare_panne",
          id: panneTarget.id,
          description: panneForm.description,
          at: new Date(panneForm.at).toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setPanneTarget(null);
      await refreshVehicules();
    } catch (e) {
      await showErrorAlert(
        "Déclaration impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setPanneSaving(false);
    }
  }

  async function submitRemiseEnService(e: React.FormEvent) {
    e.preventDefault();
    if (!canWriteVehicules || !remiseTarget) return;
    setRemiseSaving(true);
    try {
      const res = await fetch("/api/charroi/vehicules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remise_service",
          id: remiseTarget.id,
          description: panneForm.description,
          at: new Date(panneForm.at).toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setRemiseTarget(null);
      await refreshVehicules();
    } catch (e) {
      await showErrorAlert(
        "Remise en service impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setRemiseSaving(false);
    }
  }

  function openAffectFromParc(vehicule: CharroiVehicule) {
    if (!canWrite || vehicule.statut !== "disponible") return;
    if (allDemandes.length === 0) {
      void showErrorAlert("Aucune demande", "Il n'y a aucune demande en attente d'affectation.");
      return;
    }
    if (allDemandes.length === 1) {
      openAffect(allDemandes[0]!, vehicule.id);
      return;
    }
    setAffectDemandePicker(vehicule);
  }

  function pickDemandeForAffect(demande: CourseVehicule) {
    if (!affectDemandePicker) return;
    const vehiculeId = affectDemandePicker.id;
    setAffectDemandePicker(null);
    openAffect(demande, vehiculeId);
  }

  function contextMenuItems(row: CourseVehicule) {
    return [
      ...(canWrite && row.statut === "demande"
        ? [
            {
              id: "edit_demande",
              label: "Modifier la demande",
              onClick: () => openEditDemande(row),
            },
            {
              id: "assign",
              label: "Affecter",
              onClick: () => openAffect(row),
            },
          ]
        : []),
      ...(canWrite && row.statut === "affecte"
        ? [
            {
              id: "edit_affectation",
              label: "Modifier l'affectation",
              onClick: () => openEditAffectation(row),
            },
            {
              id: "depart",
              label: "Exécuter",
              onClick: () => openDepart(row),
            },
          ]
        : []),
      ...(canWrite && row.statut === "en_cours"
        ? [
            {
              id: "cloture",
              label: "Clôturer",
              onClick: () => openCloture(row),
            },
          ]
        : []),
      ...(canDelete
        ? [
            {
              id: "delete",
              label: "Supprimer",
              icon: <Trash2 className="h-3.5 w-3.5" />,
              danger: true,
              onClick: () => void handleDelete(row),
            },
          ]
        : []),
    ];
  }

  function openDemande() {
    if (!canWrite) return;
    setEditingDemande(null);
    setDemandeForm({
      ...emptyDemandeForm,
      dateDemande: new Date().toISOString().slice(0, 10),
      heureDemande: defaultTimeValue(),
    });
    setShowDemande(true);
  }

  function openEditDemande(row: CourseVehicule) {
    if (!canWrite || row.statut !== "demande") return;
    const { date, time } = splitDateTime(row.dateDemande);
    setEditingDemande(row);
    setDemandeForm({
      dateDemande: date,
      heureDemande: time,
      matriculeAgent: row.matriculeAgent,
      typeCourseId: row.typeCourseId ?? "",
      depart: row.depart ?? "",
      destination: row.destination ?? "",
      motif: row.motif ?? "",
    });
    setShowDemande(true);
  }

  function openAffect(row: CourseVehicule, prefillVehiculeId?: string) {
    if (!canWrite) return;
    setAffectMode("assign");
    setAffectTarget(row);
    setAffectForm({
      vehiculeId: prefillVehiculeId ?? "",
      chauffeur: "",
    });
  }

  function openEditAffectation(row: CourseVehicule) {
    if (!canWrite || row.statut !== "affecte") return;
    setAffectMode("edit");
    setAffectTarget(row);
    setAffectForm({
      vehiculeId: row.vehiculeId ?? "",
      chauffeur: row.chauffeur ?? "",
    });
  }

  function defaultKmDepart(row: CourseVehicule): string {
    if (!row.vehiculeId) return "";
    const vehicule = vehicules.find((v) => v.id === row.vehiculeId);
    const km = vehicule?.kmActuel ?? vehicule?.kilometrageInitiale;
    if (km == null || Number.isNaN(km)) return "";
    return String(Math.round(km));
  }

  function openDepart(row: CourseVehicule) {
    if (!canWrite) return;
    setDepartTarget(row);
    setDepartForm({
      ...emptyDepartForm,
      kmhDepart: defaultKmDepart(row),
    });
  }

  function openCloture(row: CourseVehicule) {
    if (!canWrite) return;
    setClotureTarget(row);
    setClotureForm(emptyClotureForm);
  }

  async function submitDemande(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    try {
      const payload = {
        ...demandeForm,
        dateDemande: combineDateAndTime(demandeForm.dateDemande, demandeForm.heureDemande),
      };
      const res = await fetch("/api/charroi/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingDemande
            ? { action: "update_demande", id: editingDemande.id, ...payload }
            : payload
        ),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = (await res.json()) as CourseVehicule;
      setShowDemande(false);
      setEditingDemande(null);
      await upsertCourse(saved);
    } catch (e) {
      await showErrorAlert(
        editingDemande ? "Modification impossible" : "Demande impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitAffectation(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !affectTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/charroi/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: affectMode === "edit" ? "update_affectation" : "assign",
          id: affectTarget.id,
          ...affectForm,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = (await res.json()) as CourseVehicule;
      setAffectTarget(null);
      await upsertCourse(updated);
    } catch (e) {
      await showErrorAlert(
        affectMode === "edit" ? "Modification impossible" : "Affectation impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitDepart(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !departTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/charroi/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "depart",
          id: departTarget.id,
          kmhDepart: departForm.kmhDepart ? Number(departForm.kmhDepart) : undefined,
          niveauCarburant: departForm.niveauCarburant
            ? Number(departForm.niveauCarburant)
            : undefined,
          passagers: departForm.passagers ? Number(departForm.passagers) : 0,
          observationDepart: departForm.observationDepart,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = (await res.json()) as CourseVehicule;
      setDepartTarget(null);
      await upsertCourse(updated);
    } catch (e) {
      await showErrorAlert(
        "Départ impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitCloture(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !clotureTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/charroi/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cloturer",
          id: clotureTarget.id,
          kmhArrive: clotureForm.kmhArrive ? Number(clotureForm.kmhArrive) : undefined,
          observationArrive: clotureForm.observationArrive,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = (await res.json()) as CourseVehicule;
      setClotureTarget(null);
      await upsertCourse(updated);
    } catch (e) {
      await showErrorAlert(
        "Clôture impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: CourseVehicule) {
    if (!canDelete) return;
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer cette course ?",
        message: `Demande du ${formatDate(row.dateDemande)} — ${row.matriculeAgent}`,
        successMessage: "La course a été supprimée.",
      },
      () => fetch(`/api/charroi/courses?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    );
    if (ok) await removeCourse(row.id);
  }

  async function handleProposalsApplied(updatedList: CourseVehicule[]) {
    for (const updated of updatedList) {
      await upsertCourse(updated);
    }
    await refreshVehicules();
  }

  const emptyCellClass = "py-8 text-center text-xs text-[var(--shell-text-muted)]";
  const selectClass =
    "rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm";

  function openCourseContextMenu(e: React.MouseEvent, row: CourseVehicule) {
    const items = contextMenuItems(row);
    if (items.length) open(e, items);
  }

  return (
    <div>
      {menuNode}
      <PageHeader
        title="Planning véhicule"
        description="Demandes de course, affectations et exécution"
      >
        <div className="flex flex-wrap items-end justify-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className={`min-w-[5.5rem] ${selectClass}`}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
            <select
              value={filterMonth}
              onChange={(e) =>
                setFilterMonth(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`min-w-[7.5rem] ${selectClass}`}
            >
              <option value="">Tous</option>
              {MOIS_FR_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowTypesCourse(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--shell-hover)]"
          >
            <Route className="h-4 w-4 text-sky-500" />
            Types de course
          </button>
        </div>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="flex h-[calc(100vh-11rem)] flex-col gap-4">
          <div className="flex shrink-0 gap-2 border-b border-[var(--shell-border)]">
            {(
              [
                { id: "workflow" as const, label: "Demandes & exécution" },
                { id: "fleet" as const, label: "Parc & carte" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPlanningTab(t.id)}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-sm font-medium transition",
                  planningTab === t.id
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {planningTab === "workflow" ? (
          <div className="grid h-full min-h-0 flex-1 gap-4 xl:grid-cols-3">
            <StageTableSection
              fullHeight
              title="Demandes"
              subtitle={stageSubtitle(
                demandes.length,
                allDemandes.length,
                "en attente d'affectation"
              )}
              tone="amber"
              onRefresh={refreshCourses}
              refreshLabel="Actualiser les demandes"
              headerLeadingAction={
                canWrite && allDemandes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAffectationIntel(true)}
                    disabled={!chauffeurs.length || !vehiculesDisponibles.length}
                    className="rounded-lg border border-violet-500/40 p-1.5 text-violet-400 hover:bg-violet-500/10 disabled:opacity-40"
                    title="Propositions d'affectation intelligentes"
                    aria-label="Propositions d'affectation intelligentes"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
              headerAction={
                canWrite ? (
                  <button
                    type="button"
                    onClick={openDemande}
                    className="inline-flex shrink-0 items-center rounded-lg bg-sky-600 p-1.5 text-white hover:bg-sky-500"
                    title="Demande de course"
                    aria-label="Demande de course"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ) : undefined
              }
              searchValue={searchDemandes}
              onSearchChange={setSearchDemandes}
              searchPlaceholder="Agent, destination…"
            >
              <StickyTable className="max-h-none overflow-visible rounded-none border-0">
                <StickyThead>
                  <tr>
                    <Th>Agent</Th>
                    <Th>Destination</Th>
                  </tr>
                </StickyThead>
                <tbody>
                  {demandes.length === 0 ? (
                    <tr>
                      <Td colSpan={2} className={emptyCellClass}>
                        {allDemandes.length === 0
                          ? "Aucune demande."
                          : "Aucun résultat pour cette recherche."}
                      </Td>
                    </tr>
                  ) : (
                    demandes.map((row) => {
                      const expired =
                        row.statut === "demande" && isDemandeExpiree(row.dateDemande);
                      return (
                      <tr
                        key={row.id}
                        className={cn(
                          courseRowClass,
                          expired && "bg-red-500/5 hover:bg-red-500/10"
                        )}
                        onClick={() => setDetailCourse(row)}
                        onContextMenu={(e) => openCourseContextMenu(e, row)}
                      >
                        <Td>
                          <AgentCell
                            row={row}
                            employee={employeeByMatricule.get(row.matriculeAgent)}
                            expired={expired}
                          />
                        </Td>
                        <Td>
                          <TrajetCell row={row} expired={expired} />
                        </Td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </StickyTable>
            </StageTableSection>

            <StageTableSection
              fullHeight
              title="Affectation"
              subtitle={stageSubtitle(
                affectees.length,
                allAffectees.length,
                "course(s) à exécuter"
              )}
              tone="sky"
              onRefresh={refreshCourses}
              refreshLabel="Actualiser les affectations"
              searchValue={searchAffectation}
              onSearchChange={setSearchAffectation}
              searchPlaceholder="Véhicule, chauffeur…"
            >
              <StickyTable className="max-h-none overflow-visible rounded-none border-0">
                <StickyThead>
                  <tr>
                    <Th>Véhicule</Th>
                    <Th>Chauffeur</Th>
                  </tr>
                </StickyThead>
                <tbody>
                  {affectees.length === 0 ? (
                    <tr>
                      <Td colSpan={2} className={emptyCellClass}>
                        {allAffectees.length === 0
                          ? "Aucune course affectée."
                          : "Aucun résultat pour cette recherche."}
                      </Td>
                    </tr>
                  ) : (
                    affectees.map((row) => (
                      <tr
                        key={row.id}
                        className={courseRowClass}
                        onClick={() => setDetailCourse(row)}
                        onContextMenu={(e) => openCourseContextMenu(e, row)}
                      >
                        <Td>
                          <div className="font-mono text-sm">{row.vehiculePlaque ?? "—"}</div>
                          <div className="text-[10px] text-[var(--shell-text-muted)]">
                            {row.destination ?? "Sans destination"}
                          </div>
                        </Td>
                        <Td>
                          {row.chauffeur
                            ? resolveEmployeeName(row.chauffeur, employeeByMatricule, employees)
                            : "—"}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </StickyTable>
            </StageTableSection>

            <StageTableSection
              fullHeight
              title="Exécution"
              subtitle={`${allEnCours.length} en cours · ${allTerminees.length} terminée(s)`}
              tone="emerald"
              onRefresh={refreshCourses}
              refreshLabel="Actualiser l'exécution"
              searchValue={searchExecution}
              onSearchChange={setSearchExecution}
              searchPlaceholder="Véhicule, demandeur, destination…"
            >
              <StickyTable className="max-h-none overflow-visible rounded-none border-0">
                <StickyThead>
                  <tr>
                    <Th>Chauffeur</Th>
                    <Th>Demandeur</Th>
                    <Th>Destination</Th>
                  </tr>
                </StickyThead>
                <tbody>
                  {executionRows.length === 0 ? (
                    <tr>
                      <Td colSpan={3} className={emptyCellClass}>
                        {allExecution.length === 0
                          ? "Aucune course en exécution."
                          : "Aucun résultat pour cette recherche."}
                      </Td>
                    </tr>
                  ) : (
                    executionRows.map((row) => {
                      const employee = employeeByMatricule.get(row.matriculeAgent);
                      const isEnCours = row.statut === "en_cours";
                      return (
                        <tr
                          key={row.id}
                          className={courseRowClass}
                          onClick={() => setDetailCourse(row)}
                          onContextMenu={(e) => openCourseContextMenu(e, row)}
                        >
                          <Td>
                            <div className="text-sm font-medium">
                              {row.chauffeur
                                ? resolveEmployeeName(row.chauffeur, employeeByMatricule, employees)
                                : "—"}
                            </div>
                            <div className="font-mono text-[10px] text-[var(--shell-text-muted)]">
                              {row.vehiculePlaque ?? "—"}
                            </div>
                            {isEnCours && (
                              <div className="mt-0.5 text-[10px] text-amber-400">En route</div>
                            )}
                          </Td>
                          <Td>
                            <div className="text-sm">
                              {employee
                                ? employeeShortName(employee)
                                : row.matriculeAgent}
                            </div>
                            <div className="text-[10px] text-[var(--shell-text-muted)]">
                              {employee?.department ?? "—"}
                            </div>
                          </Td>
                          <Td>
                            <TrajetCell row={row} />
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </StickyTable>
            </StageTableSection>
          </div>
          ) : (
            <div className="flex h-full min-h-0 flex-1 gap-2">
              <CharroiVehiculesDisponibles
                vehicules={vehiculesParc}
                variant="vertical"
                className="h-full w-[12%] min-w-[8.5rem] shrink-0"
                onRefresh={refreshVehicules}
                onSelectVehicule={setDetailParcVehicule}
                onContextMenuVehicule={openParcContextMenu}
              />
              <CharroiFleetMap
                vehicules={vehicules}
                coursesAffectees={allAffectees}
                coursesEnCours={allEnCours}
                className="h-full w-[76%] shrink-0"
                compactHeader
                showAffecteMarkers={false}
                onRefresh={refreshFleetData}
              />
              <div className="flex h-full w-[10%] min-w-[3.75rem] shrink-0 flex-col gap-2">
                <CharroiAffectesAttenteDepart
                  courses={allAffectees}
                  vehicules={vehicules}
                  layout="vertical"
                  className="min-h-0 flex-1"
                  onRefresh={refreshCourses}
                  onSelectCourse={setDetailCourse}
                  onContextMenuCourse={openAttenteContextMenu}
                />
                <CharroiVehiculesEnPanne
                  vehicules={vehiculesEnPanne}
                  layout="vertical"
                  className="min-h-0 flex-1"
                  onRefresh={refreshVehicules}
                  onSelectVehicule={setDetailParcVehicule}
                  onContextMenuVehicule={openPanneVehiculeContextMenu}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showAffectationIntel && (
        <CharroiAffectationIntelligenteModal
          demandes={allDemandes}
          chauffeurs={chauffeurs}
          vehiculesDisponibles={vehiculesDisponibles}
          employeeByMatricule={employeeByMatricule}
          onClose={() => setShowAffectationIntel(false)}
          onApplied={(updated) => {
            void handleProposalsApplied(updated);
          }}
        />
      )}

      {detailCourse && (
        <CourseDetailModal
          course={detailCourse}
          employee={employeeByMatricule.get(detailCourse.matriculeAgent)}
          onClose={() => setDetailCourse(null)}
        />
      )}

      {detailParcVehicule && (
        <ParcVehiculeDetailModal
          vehicule={detailParcVehicule}
          onClose={() => setDetailParcVehicule(null)}
        />
      )}

      {showDemande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitDemande}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">
              {editingDemande ? "Modifier la demande" : "Demande de course"}
            </h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {editingDemande
                ? "Modifiez les informations tant que la course n'est pas affectée."
                : (
                  <>
                    La course sera créée avec le statut <strong>Demande</strong>.
                  </>
                )}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Date de demande *</span>
                <input
                  type="date"
                  required
                  value={demandeForm.dateDemande}
                  onChange={(e) =>
                    setDemandeForm((f) => ({ ...f, dateDemande: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Heure de demande *</span>
                <input
                  type="time"
                  required
                  value={demandeForm.heureDemande}
                  onChange={(e) =>
                    setDemandeForm((f) => ({ ...f, heureDemande: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>

              <CharroiMatriculeField
                value={demandeForm.matriculeAgent}
                onChange={(matriculeAgent) =>
                  setDemandeForm((f) => ({ ...f, matriculeAgent }))
                }
              />

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Type de course</span>
                <select
                  value={demandeForm.typeCourseId}
                  onChange={(e) =>
                    setDemandeForm((f) => ({ ...f, typeCourseId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value="">—</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.designation}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Départ</span>
                <SuggestTextField
                  value={demandeForm.depart}
                  onChange={(depart) => setDemandeForm((f) => ({ ...f, depart }))}
                  suggestions={departSuggestions}
                  placeholder="Lieu de départ"
                />
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Destination</span>
                <SuggestTextField
                  value={demandeForm.destination}
                  onChange={(destination) => setDemandeForm((f) => ({ ...f, destination }))}
                  suggestions={destinationSuggestions}
                  placeholder="Lieu de destination"
                />
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Motif</span>
                <textarea
                  value={demandeForm.motif}
                  onChange={(e) => setDemandeForm((f) => ({ ...f, motif: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDemande(false);
                  setEditingDemande(null);
                }}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingDemande ? "Enregistrer" : "Créer la demande"}
              </button>
            </div>
          </form>
        </div>
      )}

      {affectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitAffectation}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">
              {affectMode === "edit" ? "Modifier l'affectation" : "Affecter la course"}
            </h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {affectTarget.destination ?? "Sans destination"} —{" "}
              {employeeByMatricule.get(affectTarget.matriculeAgent)
                ? employeeShortName(employeeByMatricule.get(affectTarget.matriculeAgent)!)
                : affectTarget.matriculeAgent}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Véhicule *</span>
                <select
                  required
                  value={affectForm.vehiculeId}
                  onChange={(e) => setAffectForm((f) => ({ ...f, vehiculeId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value="">Choisir un véhicule</option>
                  {vehiculesAffectables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation}
                      {[v.marque, v.modele].filter(Boolean).length > 0
                        ? ` — ${[v.marque, v.modele].filter(Boolean).join(" ")}`
                        : ""}
                      {v.id === affectTarget.vehiculeId && v.statut !== "disponible"
                        ? " (actuel)"
                        : ""}
                    </option>
                  ))}
                </select>
                {vehiculesAffectables.length === 0 && (
                  <p className="mt-1 text-xs text-amber-500">Aucun véhicule disponible.</p>
                )}
              </label>
              <CharroiChauffeurField
                employees={chauffeurs}
                postesById={postesById}
                value={affectForm.chauffeur}
                onChange={(chauffeur) => setAffectForm((f) => ({ ...f, chauffeur }))}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAffectTarget(null)}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || vehiculesAffectables.length === 0 || chauffeurs.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {affectMode === "edit" ? "Enregistrer" : "Affecter"}
              </button>
            </div>
          </form>
        </div>
      )}

      {departTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitDepart}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Départ de la course</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {departTarget.vehiculePlaque ?? "Véhicule"} —{" "}
              {departTarget.chauffeur
                ? resolveEmployeeName(departTarget.chauffeur, employeeByMatricule, employees)
                : "Chauffeur"}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">Km départ</span>
                <input
                  type="number"
                  min={0}
                  value={departForm.kmhDepart}
                  onChange={(e) => setDepartForm((f) => ({ ...f, kmhDepart: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
                {departKmHint && (
                  <p className="mt-1 text-[10px] text-[var(--shell-text-muted)]">{departKmHint}</p>
                )}
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Niveau carburant (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={departForm.niveauCarburant}
                  onChange={(e) =>
                    setDepartForm((f) => ({ ...f, niveauCarburant: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Passagers</span>
                <input
                  type="number"
                  min={0}
                  value={departForm.passagers}
                  onChange={(e) => setDepartForm((f) => ({ ...f, passagers: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">Observation départ</span>
                <textarea
                  value={departForm.observationDepart}
                  onChange={(e) =>
                    setDepartForm((f) => ({ ...f, observationDepart: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDepartTarget(null)}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Départ
              </button>
            </div>
          </form>
        </div>
      )}

      {clotureTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitCloture}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Clôture de la course</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {clotureTarget.vehiculePlaque ?? "Véhicule"} — {clotureTarget.destination ?? "Destination"}
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm">
                <span className="text-[var(--shell-text-muted)]">Kilométrage de départ</span>
                <p className="mt-0.5 font-medium tabular-nums">
                  {clotureTarget.kmhDepart != null
                    ? formatKm(clotureTarget.kmhDepart)
                    : "—"}
                </p>
              </div>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Km arrivée</span>
                <input
                  type="number"
                  min={0}
                  value={clotureForm.kmhArrive}
                  onChange={(e) => setClotureForm((f) => ({ ...f, kmhArrive: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              {cloturePreview?.kmActuel != null && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[var(--shell-text-muted)]">Kilométrage actuel</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatKm(cloturePreview.kmActuel)}
                    </span>
                  </div>
                  {cloturePreview.kmParcours != null && (
                    <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                      Parcours course : +{formatKm(cloturePreview.kmParcours)}
                    </p>
                  )}
                </div>
              )}
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Observation arrivée</span>
                <textarea
                  value={clotureForm.observationArrive}
                  onChange={(e) =>
                    setClotureForm((f) => ({ ...f, observationArrive: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClotureTarget(null)}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Clôturer
              </button>
            </div>
          </form>
        </div>
      )}

      {affectDemandePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--shell-border)] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Affecter une course</h3>
                <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                  Véhicule {affectDemandePicker.immatriculation} — choisissez une demande
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAffectDemandePicker(null)}
                className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {allDemandes.map((demande) => {
                const employee = employeeByMatricule.get(demande.matriculeAgent);
                return (
                  <li key={demande.id}>
                    <button
                      type="button"
                      onClick={() => pickDemandeForAffect(demande)}
                      className="w-full rounded-lg border border-transparent px-4 py-3 text-left transition-colors hover:border-sky-500/30 hover:bg-sky-500/5"
                    >
                      <div className="text-sm font-medium">
                        {employee ? employeeShortName(employee) : demande.matriculeAgent}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
                        {demande.depart ?? "—"} → {demande.destination ?? "—"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--shell-text-muted)]">
                        {formatRelativeFromNow(demande.dateDemande)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {panneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitDeclarePanne}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Déclarer une panne</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {panneTarget.immatriculation} — hors service jusqu&apos;à remise
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Description *</span>
                <textarea
                  required
                  value={panneForm.description}
                  onChange={(e) => setPanneForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Date et heure *</span>
                <input
                  type="datetime-local"
                  required
                  value={panneForm.at}
                  onChange={(e) => setPanneForm((f) => ({ ...f, at: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPanneTarget(null)}
                disabled={panneSaving}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={panneSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {panneSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Déclarer la panne
              </button>
            </div>
          </form>
        </div>
      )}

      {remiseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitRemiseEnService}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Remettre en service</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {remiseTarget.immatriculation}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Description intervention *</span>
                <textarea
                  required
                  value={panneForm.description}
                  onChange={(e) => setPanneForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Date et heure remise *</span>
                <input
                  type="datetime-local"
                  required
                  value={panneForm.at}
                  onChange={(e) => setPanneForm((f) => ({ ...f, at: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemiseTarget(null)}
                disabled={remiseSaving}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={remiseSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {remiseSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Remettre en service
              </button>
            </div>
          </form>
        </div>
      )}

      {showTypesCourse && (
        <CharroiTypesCourseModal
          onClose={() => setShowTypesCourse(false)}
          onTypesChange={handleTypesChange}
        />
      )}
    </div>
  );
}
