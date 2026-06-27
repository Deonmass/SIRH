"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Eye, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Wrench, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CharroiVehiculeImportModal } from "@/components/charroi/CharroiVehiculeImportModal";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { VehiculeDetailModal } from "@/components/charroi/VehiculeDetailModal";
import { CharroiEntretienSuiviTab } from "@/components/charroi/CharroiEntretienSuiviTab";
import { CharroiParcEntretienTable } from "@/components/charroi/CharroiParcEntretienTable";
import { VehiculeTypeIcon } from "@/components/charroi/charroi-vehicule-icons";
import { useContextMenu } from "@/components/ui/ContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { SuggestTextField } from "@/components/ui/SuggestTextField";
import type { Vehicule } from "@/lib/repositories/vehicules";
import {
  mergeUniqueSorted,
  VEHICULE_MARQUES_CATALOG,
  VEHICULE_TYPES_GENERIC,
  vehiculeTypesForMarque,
} from "@/lib/charroi-vehicule-catalog";
import { STATUT_TECHNIQUE_OPTIONS } from "@/lib/charroi-vehicule-declaration";
import { formatDateTimeFr } from "@/lib/charroi-relative-time";
import {
  isVehiculeHorsService,
  lastPanneEvent,
} from "@/lib/vehicule-pannes";
import {
  readApiError,
  runDeleteWithSweetAlert,
  showErrorAlert,
} from "@/lib/alerts";
import { cn } from "@/lib/utils";

const RDC_PROVINCES = [
  "Bas-Uélé",
  "Équateur",
  "Haut-Katanga",
  "Haut-Lomami",
  "Haut-Uélé",
  "Ituri",
  "Kasaï",
  "Kasaï-Central",
  "Kasaï-Oriental",
  "Kinshasa",
  "Kongo Central",
  "Kwango",
  "Kwilu",
  "Lomami",
  "Lualaba",
  "Mai-Ndombe",
  "Maniema",
  "Mongala",
  "Nord-Kivu",
  "Nord-Ubangi",
  "Sankuru",
  "Sud-Kivu",
  "Sud-Ubangi",
  "Tanganyika",
  "Tshopo",
  "Tshuapa",
];

const emptyForm = {
  marque: "",
  vehicleType: "",
  numeroChassis: "",
  plaque: "",
  province: "",
  miseCirculationYear: "",
  cv: "",
  centreDeCout: "",
  kilometrageInitiale: "",
  assureur: "",
  departement: "",
  utilisateur: "",
  societeProprietaire: "",
  statut: "",
};

function miseCirculationToYear(value?: string): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})/);
  return match ? match[1] : "";
}

function yearToMiseCirculation(year: string): string | undefined {
  const y = year.trim();
  if (!y || !/^\d{4}$/.test(y)) return undefined;
  return `${y}-01-01`;
}

function formatMiseCirculation(value?: string): string {
  return miseCirculationToYear(value) || "—";
}

function vehiculeAgeYears(miseCirculation?: string): number | null {
  const yearStr = miseCirculationToYear(miseCirculation);
  if (!yearStr) return null;
  const year = Number(yearStr);
  if (Number.isNaN(year)) return null;
  return Math.max(0, new Date().getFullYear() - year);
}

function formatAgeLabel(age: number): string {
  if (age === 0) return "< 1 an";
  if (age === 1) return "1 an";
  return `${age} ans`;
}

function AgeBadge({ miseCirculation }: { miseCirculation?: string }) {
  const age = vehiculeAgeYears(miseCirculation);
  if (age == null) {
    return <span className="text-[var(--shell-text-muted)]">—</span>;
  }
  const tone =
    age <= 3
      ? "bg-emerald-500/15 text-emerald-400"
      : age <= 10
        ? "bg-sky-500/15 text-sky-400"
        : "bg-amber-500/15 text-amber-400";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone
      )}
    >
      {formatAgeLabel(age)}
    </span>
  );
}

function TopSyncBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="relative mb-4 h-1 overflow-hidden rounded-full bg-[var(--shell-border)]"
      role="progressbar"
      aria-label="Mise à jour en cours"
    >
      <div className="absolute inset-y-0 w-1/4 rounded-full bg-sky-500 animate-[charroi-sync_1s_ease-in-out_infinite]" />
    </div>
  );
}

function vehiculeToForm(v: Vehicule) {
  return {
    marque: v.marque,
    vehicleType: v.vehicleType ?? "",
    numeroChassis: v.numeroChassis ?? "",
    plaque: v.plaque ?? "",
    province: v.province ?? "",
    miseCirculationYear: miseCirculationToYear(v.miseCirculation),
    cv: v.cv != null ? String(v.cv) : "",
    centreDeCout: v.centreDeCout ?? "",
    kilometrageInitiale:
      v.kilometrageInitiale != null ? String(v.kilometrageInitiale) : "",
    assureur: v.assureur ?? "",
    departement: v.departement ?? "",
    utilisateur: v.utilisateur ?? "",
    societeProprietaire: v.societeProprietaire ?? "",
    statut: v.statut ?? "",
  };
}

function filterVehicules(
  rows: Vehicule[],
  filters: {
    search: string;
    marque: string;
    vehicleType: string;
    province: string;
    centreDeCout: string;
  }
): Vehicule[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.marque && row.marque !== filters.marque) return false;
    if (filters.vehicleType && (row.vehicleType ?? "") !== filters.vehicleType) return false;
    if (filters.province && (row.province ?? "") !== filters.province) return false;
    if (filters.centreDeCout && (row.centreDeCout ?? "") !== filters.centreDeCout) return false;
    if (!q) return true;
    const haystack = [
      row.marque,
      row.vehicleType,
      row.plaque,
      row.numeroChassis,
      row.province,
      row.centreDeCout,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function uniqueValues(rows: Vehicule[], key: keyof Vehicule): string[] {
  return Array.from(
    new Set(
      rows
        .map((r) => r[key])
        .filter((v): v is string | number => v != null && String(v).trim() !== "")
        .map(String)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export function CharroiVehiculesClient() {
  const { can } = useAuth();
  const canWrite = can("charroi.vehicules", "write");
  const canDelete = can("charroi.vehicules", "delete");

  type VehiculeTabId = "parc" | "entretien";
  const [vehiculeTab, setVehiculeTab] = useState<VehiculeTabId>("parc");

  const [rows, setRows] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panneSaving, setPanneSaving] = useState(false);
  const [remiseSaving, setRemiseSaving] = useState(false);
  const [editing, setEditing] = useState<Vehicule | null>(null);
  const [viewing, setViewing] = useState<Vehicule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterMarque, setFilterMarque] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterCentre, setFilterCentre] = useState("");
  const [syncProgress, setSyncProgress] = useState(false);
  const [panneTarget, setPanneTarget] = useState<Vehicule | null>(null);
  const [remiseTarget, setRemiseTarget] = useState<Vehicule | null>(null);
  const [panneForm, setPanneForm] = useState({ description: "", at: "" });
  const syncTimerRef = useRef<number | null>(null);
  const { open, menuNode } = useContextMenu();

  const pulseSync = useCallback(() => {
    setSyncProgress(true);
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => setSyncProgress(false), 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  const upsertVehicule = useCallback(
    (updated: Vehicule) => {
      setRows((prev) => {
        const idx = prev.findIndex((v) => v.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
      pulseSync();
    },
    [pulseSync]
  );

  const removeVehicule = useCallback(
    (id: string) => {
      setRows((prev) => prev.filter((v) => v.id !== id));
      pulseSync();
    },
    [pulseSync]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/charroi/vehicules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
      setRows(data);
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "entretien") {
      setVehiculeTab("entretien");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (loading || !canWrite) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("ajouter") === "1") {
      openCreate();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    const editId = params.get("edit");
    if (editId) {
      const row = rows.find((r) => r.id === editId);
      if (row) openEdit(row);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loading, canWrite, rows]);

  function panneFormDefaults() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return { description: "", at: now.toISOString().slice(0, 16) };
  }

  function openDeclarePanne(row: Vehicule) {
    if (!canWrite) return;
    setPanneTarget(row);
    setPanneForm(panneFormDefaults());
  }

  function openRemiseEnService(row: Vehicule) {
    if (!canWrite) return;
    setRemiseTarget(row);
    setPanneForm(panneFormDefaults());
  }

  async function submitDeclarePanne(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !panneTarget) return;
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
      const saved = (await res.json()) as Vehicule;
      upsertVehicule(saved);
      setPanneTarget(null);
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
    if (!canWrite || !remiseTarget) return;
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
      const saved = (await res.json()) as Vehicule;
      upsertVehicule(saved);
      setRemiseTarget(null);
    } catch (e) {
      await showErrorAlert(
        "Remise en service impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setRemiseSaving(false);
    }
  }

  function rowContextMenu(row: Vehicule, horsService = false) {
    return [
      {
        id: "view",
        label: "Visualiser",
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: () => setViewing(row),
      },
      ...(canWrite && !horsService
        ? [
            {
              id: "edit",
              label: "Éditer",
              icon: <Pencil className="h-3.5 w-3.5" />,
              onClick: () => openEdit(row),
            },
            {
              id: "panne",
              label: "Déclarer une panne",
              icon: <AlertTriangle className="h-3.5 w-3.5" />,
              onClick: () => openDeclarePanne(row),
            },
          ]
        : []),
      ...(canWrite && horsService
        ? [
            {
              id: "remise",
              label: "Remettre en service",
              icon: <Wrench className="h-3.5 w-3.5" />,
              onClick: () => openRemiseEnService(row),
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

  const marqueOptions = useMemo(() => uniqueValues(rows, "marque"), [rows]);
  const typeOptions = useMemo(() => uniqueValues(rows, "vehicleType"), [rows]);
  const marqueSuggestions = useMemo(
    () => mergeUniqueSorted(VEHICULE_MARQUES_CATALOG, marqueOptions),
    [marqueOptions]
  );
  const typeSuggestions = useMemo(() => {
    const fromMarque = vehiculeTypesForMarque(form.marque);
    if (fromMarque.length > 0) {
      return mergeUniqueSorted(fromMarque, typeOptions);
    }
    return mergeUniqueSorted(VEHICULE_TYPES_GENERIC, typeOptions);
  }, [form.marque, typeOptions]);
  const provinceOptions = useMemo(
    () =>
      Array.from(new Set([...RDC_PROVINCES, ...uniqueValues(rows, "province")])).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [rows]
  );
  const centreOptions = useMemo(() => uniqueValues(rows, "centreDeCout"), [rows]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = Array.from({ length: current - 1979 }, (_, i) => String(current - i));
    if (form.miseCirculationYear && !years.includes(form.miseCirculationYear)) {
      return [form.miseCirculationYear, ...years];
    }
    return years;
  }, [form.miseCirculationYear]);

  const filteredRows = useMemo(
    () =>
      filterVehicules(rows, {
        search,
        marque: filterMarque,
        vehicleType: filterType,
        province: filterProvince,
        centreDeCout: filterCentre,
      }),
    [rows, search, filterMarque, filterType, filterProvince, filterCentre]
  );

  const activeRows = useMemo(
    () => filteredRows.filter((row) => !isVehiculeHorsService(row.pannes)),
    [filteredRows]
  );

  const horsServiceRows = useMemo(
    () => rows.filter((row) => isVehiculeHorsService(row.pannes)),
    [rows]
  );

  function openCreate() {
    if (!canWrite) return;
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(row: Vehicule) {
    if (!canWrite) return;
    setEditing(row);
    setForm(vehiculeToForm(row));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        marque: form.marque.trim(),
        vehicleType: form.vehicleType.trim() || undefined,
        numeroChassis: form.numeroChassis.trim() || undefined,
        plaque: form.plaque.trim() || undefined,
        province: form.province.trim() || undefined,
        miseCirculation: yearToMiseCirculation(form.miseCirculationYear),
        cv: form.cv ? Number(form.cv) : undefined,
        centreDeCout: form.centreDeCout.trim() || undefined,
        kilometrageInitiale: form.kilometrageInitiale
          ? Number(form.kilometrageInitiale)
          : undefined,
        assureur: form.assureur.trim() || undefined,
        departement: form.departement.trim() || undefined,
        utilisateur: form.utilisateur.trim() || undefined,
        societeProprietaire: form.societeProprietaire.trim() || undefined,
        statut: form.statut.trim() || undefined,
      };
      const res = await fetch("/api/charroi/vehicules", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing ? { ...payload, id: editing.id, pannes: editing.pannes } : payload
        ),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = (await res.json()) as Vehicule;
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      upsertVehicule(saved);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur";
      setError(message);
      await showErrorAlert("Enregistrement impossible", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Vehicule) {
    if (!canDelete) return;
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer ce véhicule ?",
        message: `${row.marque}${row.plaque ? ` — ${row.plaque}` : ""}`,
        successMessage: "Le véhicule a été retiré du parc.",
      },
      () => fetch(`/api/charroi/vehicules?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    );
    if (ok) removeVehicule(row.id);
  }

  const selectClass =
    "rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm";

  return (
    <div>
      {menuNode}
      <PageHeader title="Véhicules" description="Parc automobile de l'entreprise">
        {vehiculeTab === "parc" ? (
        <div className="flex flex-wrap items-end justify-end gap-2">
          <label className="relative block min-w-[12rem] flex-1 text-sm sm:max-w-[16rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaque, châssis, marque…"
              className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] py-2 pl-8 pr-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Marque</span>
            <select
              value={filterMarque}
              onChange={(e) => setFilterMarque(e.target.value)}
              className={`min-w-[7rem] ${selectClass}`}
            >
              <option value="">Toutes</option>
              {marqueOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`min-w-[7rem] ${selectClass}`}
            >
              <option value="">Tous</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Province</span>
            <select
              value={filterProvince}
              onChange={(e) => setFilterProvince(e.target.value)}
              className={`min-w-[7rem] ${selectClass}`}
            >
              <option value="">Toutes</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">
              Centre de coût
            </span>
            <select
              value={filterCentre}
              onChange={(e) => setFilterCentre(e.target.value)}
              className={`min-w-[8rem] ${selectClass}`}
            >
              <option value="">Tous</option>
              {centreOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {canWrite && (
            <>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                Ajouter véhicule
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </button>
            </>
          )}
        </div>
        ) : undefined}
      </PageHeader>

      <div className="mb-4 flex gap-2 border-b border-[var(--shell-border)]">
        {(
          [
            { id: "parc" as const, label: "Parc véhicules" },
            { id: "entretien" as const, label: "Suivi entretien" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setVehiculeTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              vehiculeTab === t.id
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TopSyncBar active={syncProgress} />

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {vehiculeTab === "entretien" ? (
        <CharroiEntretienSuiviTab canWrite={canWrite} />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <>
        <StickyTable>
          <StickyThead>
            <tr>
              <Th className="w-12">N°</Th>
              <Th className="w-16"> </Th>
              <Th>Marque</Th>
              <Th>Type</Th>
              <Th>Plaque</Th>
              <Th>N° châssis</Th>
              <Th>Province</Th>
              <Th>Mise circ.</Th>
              <Th>Âge</Th>
            </tr>
          </StickyThead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <Td colSpan={9} className="py-12 text-center text-[var(--shell-text-muted)]">
                  {rows.length === 0 ? "Aucun véhicule enregistré." : "Aucun résultat pour ces filtres."}
                </Td>
              </tr>
            ) : (
              activeRows.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                  onContextMenu={(e) => open(e, rowContextMenu(row))}
                >
                  <Td className="tabular-nums text-[var(--shell-text-muted)]">{index + 1}</Td>
                  <Td>
                    <VehiculeTypeIcon modele={row.vehicleType} statut="disponible" size="sm" />
                  </Td>
                  <Td className="font-medium">{row.marque}</Td>
                  <Td>{row.vehicleType ?? "—"}</Td>
                  <Td className="font-mono">{row.plaque ?? "—"}</Td>
                  <Td className="font-mono text-xs">{row.numeroChassis ?? "—"}</Td>
                  <Td>{row.province ?? "—"}</Td>
                  <Td>{formatMiseCirculation(row.miseCirculation)}</Td>
                  <Td>
                    <AgeBadge miseCirculation={row.miseCirculation} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </StickyTable>

        <CharroiParcEntretienTable
          canWrite={canWrite}
          onGoToSuivi={() => setVehiculeTab("entretien")}
        />

        {horsServiceRows.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-red-400">
              Véhicules en panne / hors service
            </h3>
            <StickyTable>
              <StickyThead>
                <tr>
                  <Th className="w-16"> </Th>
                  <Th>Véhicule</Th>
                  <Th>Type</Th>
                  <Th>Dernière panne</Th>
                  <Th className="w-36">Action</Th>
                </tr>
              </StickyThead>
              <tbody>
                {horsServiceRows.map((row) => {
                  const panne = lastPanneEvent(row.pannes);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                      onContextMenu={(e) => open(e, rowContextMenu(row, true))}
                    >
                      <Td>
                        <VehiculeTypeIcon modele={row.vehicleType} statut="maintenance" size="sm" />
                      </Td>
                      <Td>
                        <div className="font-mono text-sm">{row.plaque ?? `#${row.id}`}</div>
                        <div className="text-xs text-[var(--shell-text-muted)]">{row.marque}</div>
                      </Td>
                      <Td>{row.vehicleType ?? "—"}</Td>
                      <Td>
                        {panne ? (
                          <>
                            <div className="text-sm">{panne.description}</div>
                            <div className="text-[10px] text-[var(--shell-text-muted)]">
                              {formatDateTimeFr(panne.at)}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openRemiseEnService(row)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                          >
                            Remettre en service
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </StickyTable>
          </div>
        )}
        </>
      )}

      {showImport && (
        <CharroiVehiculeImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => void load()}
        />
      )}

      {viewing && (
        <VehiculeDetailModal vehicule={viewing} onClose={() => setViewing(null)} />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-[var(--shell-text)]">
              {editing ? "Modifier le véhicule" : "Ajouter un véhicule"}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">Marque *</span>
                <SuggestTextField
                  required
                  value={form.marque}
                  onChange={(marque) => setForm((f) => ({ ...f, marque }))}
                  suggestions={marqueSuggestions}
                  placeholder="Toyota, Mercedes…"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Type de véhicule</span>
                <SuggestTextField
                  value={form.vehicleType}
                  onChange={(vehicleType) => setForm((f) => ({ ...f, vehicleType }))}
                  suggestions={typeSuggestions}
                  placeholder="Hiace, Hilux, Rush…"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Plaque</span>
                <input
                  value={form.plaque}
                  onChange={(e) => setForm((f) => ({ ...f, plaque: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 font-mono"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">N° châssis</span>
                <input
                  value={form.numeroChassis}
                  onChange={(e) => setForm((f) => ({ ...f, numeroChassis: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 font-mono"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Province</span>
                <SuggestTextField
                  value={form.province}
                  onChange={(province) => setForm((f) => ({ ...f, province }))}
                  suggestions={provinceOptions}
                  placeholder="Kinshasa, Haut-Katanga…"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Mise en circulation</span>
                <select
                  value={form.miseCirculationYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, miseCirculationYear: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value="">—</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Puissance (CV)</span>
                <input
                  type="number"
                  min={0}
                  value={form.cv}
                  onChange={(e) => setForm((f) => ({ ...f, cv: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">Kilométrage initial</span>
                <input
                  type="number"
                  min={0}
                  value={form.kilometrageInitiale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kilometrageInitiale: e.target.value }))
                  }
                  placeholder="Compteur à la mise en service"
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 tabular-nums"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Centre de coût</span>
                <input
                  value={form.centreDeCout}
                  onChange={(e) => setForm((f) => ({ ...f, centreDeCout: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Assureur</span>
                <input
                  value={form.assureur}
                  onChange={(e) => setForm((f) => ({ ...f, assureur: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Département</span>
                <input
                  value={form.departement}
                  onChange={(e) => setForm((f) => ({ ...f, departement: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Utilisateur</span>
                <input
                  value={form.utilisateur}
                  onChange={(e) => setForm((f) => ({ ...f, utilisateur: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Société propriétaire</span>
                <input
                  value={form.societeProprietaire}
                  onChange={(e) => setForm((f) => ({ ...f, societeProprietaire: e.target.value }))}
                  placeholder="PPC, LOXEA…"
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--shell-text-muted)]">Observation technique</span>
                <select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value="">—</option>
                  {STATUT_TECHNIQUE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
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
                Enregistrer
              </button>
            </div>
          </form>
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
              {panneTarget.plaque ?? panneTarget.marque} — hors service jusqu&apos;à remise
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
              {remiseTarget.plaque ?? remiseTarget.marque}
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
    </div>
  );
}
