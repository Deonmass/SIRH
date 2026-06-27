"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  FieldsCardsView,
  HistoryTableView,
  HistoryTimelineView,
  PanelCard,
} from "../DossierDataViews";
import { DossierField, DossierGrid, DossierTextInput } from "../DossierFields";
import { DossierTabToolbar, type DossierSectionView } from "../DossierViewToggle";
import { SaveButton } from "@/components/ui/SaveButton";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import { appendCoordinatesHistoryEntry, snapshotFromEmployee } from "@/lib/repositories/employes/coordonnees-json";
import type { CoordinatesHistoryEntry, Employee } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function coordsSummary(entry: CoordinatesHistoryEntry): string {
  return [
    entry.adresse,
    entry.telephone,
    entry.email,
    entry.ville,
    entry.telephoneSecondaire,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function DossierCoordonneesTab({
  employee,
  view,
  onViewChange,
  onPatch,
  showViewToggle = true,
}: {
  employee: Employee;
  view: DossierSectionView;
  onViewChange: (v: DossierSectionView) => void;
  onPatch: (data: Partial<Employee>) => void;
  showViewToggle?: boolean;
}) {
  const dossier = getEmployeeDossier(employee);
  const history = employee.coordinatesHistory ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(() => ({
    ...snapshotFromEmployee(employee),
    effectiveDate: today,
    reason: "",
  }));

  const currentRows = useMemo(
    () => [
      { key: "a", label: "Adresse", value: employee.adresse ?? "—" },
      { key: "t", label: "Téléphone", value: employee.telephone ?? "—" },
      { key: "e", label: "Email pro", value: employee.email ?? "—" },
      { key: "v", label: "Ville", value: dossier.ville ?? "—" },
      { key: "p", label: "Province", value: dossier.province ?? "—" },
      { key: "pa", label: "Pays", value: dossier.pays ?? "—" },
      { key: "ts", label: "Tél. secondaire", value: dossier.telephoneSecondaire ?? "—" },
      { key: "ep", label: "Email personnel", value: dossier.emailPersonnel ?? "—" },
      { key: "cu", label: "Contact urgence", value: dossier.contactUrgence ?? "—" },
      { key: "tu", label: "Tél. urgence", value: dossier.telephoneUrgence ?? "—" },
    ],
    [employee, dossier]
  );

  const timelineItems = useMemo(
    () =>
      history.map((entry) => ({
        id: entry.id,
        date: formatDate(entry.effectiveDate),
        title: coordsSummary(entry) || "Coordonnées mises à jour",
        subtitle: entry.reason,
        badge: "Coordonnées",
      })),
    [history]
  );

  function openForm() {
    setDraft({
      ...snapshotFromEmployee(employee),
      effectiveDate: today,
      reason: "",
    });
    setShowForm(true);
  }

  function saveEntry() {
    const updated = appendCoordinatesHistoryEntry(employee, {
      effectiveDate: draft.effectiveDate,
      adresse: draft.adresse?.trim() || undefined,
      telephone: draft.telephone?.trim() || undefined,
      email: draft.email?.trim() || undefined,
      ville: draft.ville?.trim() || undefined,
      province: draft.province?.trim() || undefined,
      pays: draft.pays?.trim() || undefined,
      telephoneSecondaire: draft.telephoneSecondaire?.trim() || undefined,
      emailPersonnel: draft.emailPersonnel?.trim() || undefined,
      contactUrgence: draft.contactUrgence?.trim() || undefined,
      telephoneUrgence: draft.telephoneUrgence?.trim() || undefined,
      reason: draft.reason?.trim() || "Mise à jour des coordonnées",
    });
    onPatch({
      adresse: updated.adresse,
      telephone: updated.telephone,
      email: updated.email,
      coordinatesHistory: updated.coordinatesHistory,
      dossier: updated.dossier,
    });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <DossierTabToolbar
        title="Coordonnées"
        description="Coordonnées en vigueur et historique (JSON Supabase)"
        view={view}
        onViewChange={onViewChange}
        showViewToggle={showViewToggle}
      />

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <PanelCard title="Coordonnées actuelles">
          {view === "cards" ? (
            <FieldsCardsView rows={currentRows} />
          ) : (
            <HistoryTableView
              columns={[
                { key: "label", label: "Champ" },
                { key: "value", label: "Valeur" },
              ]}
              rows={currentRows.map((r) => ({
                id: r.key,
                cells: [r.label, r.value],
              }))}
              emptyMessage="Aucune coordonnée."
              className="max-h-none"
            />
          )}
        </PanelCard>

        <PanelCard title="Historique">
          <button
            type="button"
            onClick={openForm}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-sky-500 hover:underline"
          >
            <Plus className="h-4 w-4" />
            Nouvelle entrée
          </button>
          {view === "cards" ? (
            <HistoryTimelineView
              items={timelineItems}
              emptyMessage="Aucune entrée dans l'historique."
            />
          ) : (
            <HistoryTableView
              columns={[
                { key: "date", label: "Date d'effet" },
                { key: "detail", label: "Coordonnées" },
                { key: "motif", label: "Motif" },
              ]}
              rows={history.map((entry) => ({
                id: entry.id,
                cells: [
                  formatDate(entry.effectiveDate),
                  coordsSummary(entry) || "—",
                  entry.reason ?? "—",
                ],
              }))}
              emptyMessage="Aucune entrée dans l'historique."
            />
          )}
        </PanelCard>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--shell-border)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--shell-text)]">
                  Nouvelles coordonnées
                </h3>
                <p className="text-xs text-[var(--shell-text-muted)]">
                  Enregistrées dans le JSON `employes.coordonnees`
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <DossierGrid>
                <DossierField label="Date d'effet">
                  <DossierTextInput
                    type="date"
                    value={draft.effectiveDate}
                    onChange={(effectiveDate) => setDraft({ ...draft, effectiveDate })}
                  />
                </DossierField>
                <DossierField label="Motif" className="sm:col-span-2">
                  <DossierTextInput
                    value={draft.reason ?? ""}
                    onChange={(reason) => setDraft({ ...draft, reason })}
                    placeholder="Déménagement, changement de numéro…"
                  />
                </DossierField>
                <DossierField label="Adresse" className="sm:col-span-2 lg:col-span-3">
                  <DossierTextInput
                    value={draft.adresse ?? ""}
                    onChange={(adresse) => setDraft({ ...draft, adresse })}
                  />
                </DossierField>
                <DossierField label="Téléphone">
                  <DossierTextInput
                    value={draft.telephone ?? ""}
                    onChange={(telephone) => setDraft({ ...draft, telephone })}
                  />
                </DossierField>
                <DossierField label="Email pro">
                  <DossierTextInput
                    type="email"
                    value={draft.email ?? ""}
                    onChange={(email) => setDraft({ ...draft, email })}
                  />
                </DossierField>
                <DossierField label="Ville">
                  <DossierTextInput
                    value={draft.ville ?? ""}
                    onChange={(ville) => setDraft({ ...draft, ville })}
                  />
                </DossierField>
                <DossierField label="Province">
                  <DossierTextInput
                    value={draft.province ?? ""}
                    onChange={(province) => setDraft({ ...draft, province })}
                  />
                </DossierField>
                <DossierField label="Pays">
                  <DossierTextInput
                    value={draft.pays ?? ""}
                    onChange={(pays) => setDraft({ ...draft, pays })}
                  />
                </DossierField>
                <DossierField label="Tél. secondaire">
                  <DossierTextInput
                    value={draft.telephoneSecondaire ?? ""}
                    onChange={(telephoneSecondaire) =>
                      setDraft({ ...draft, telephoneSecondaire })
                    }
                  />
                </DossierField>
                <DossierField label="Email personnel">
                  <DossierTextInput
                    type="email"
                    value={draft.emailPersonnel ?? ""}
                    onChange={(emailPersonnel) => setDraft({ ...draft, emailPersonnel })}
                  />
                </DossierField>
                <DossierField label="Contact urgence">
                  <DossierTextInput
                    value={draft.contactUrgence ?? ""}
                    onChange={(contactUrgence) => setDraft({ ...draft, contactUrgence })}
                  />
                </DossierField>
                <DossierField label="Tél. urgence">
                  <DossierTextInput
                    value={draft.telephoneUrgence ?? ""}
                    onChange={(telephoneUrgence) => setDraft({ ...draft, telephoneUrgence })}
                  />
                </DossierField>
              </DossierGrid>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--shell-border)] px-5 py-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <SaveButton onClick={saveEntry}>Enregistrer</SaveButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
