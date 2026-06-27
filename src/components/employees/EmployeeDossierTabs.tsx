"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  GitBranch,
  GraduationCap,
  History,
  MapPin,
  Star,
  User,
  Wallet,
} from "lucide-react";
import { DocumentChecklist } from "./DocumentChecklist";
import { FamilyOrganigram } from "./FamilyOrganigram";
import { EditableFieldsTable, type EditableFieldDef } from "./EditableFieldsTable";
import { WorkflowStepper } from "./WorkflowStepper";
import { FieldsCardsView, HistoryCardsView, HistoryTableView } from "./DossierDataViews";
import {
  DossierField,
  DossierGrid,
  DossierSection,
  DossierSelect,
  DossierTextArea,
  DossierTextInput,
} from "./DossierFields";
import { DossierTabToolbar, type DossierSectionView } from "./DossierViewToggle";
import { DossierCongesTab } from "./tabs/DossierCongesTab";
import { DossierCoordonneesTab } from "./tabs/DossierCoordonneesTab";
import { DossierDisciplineTab } from "./tabs/DossierDisciplineTab";
import { DossierFormationsTab } from "./tabs/DossierFormationsTab";
import { DossierPostesMouvementsTab } from "./tabs/DossierPostesMouvementsTab";
import { DossierHistoriqueTab } from "./tabs/DossierHistoriqueTab";
import { DossierRemunerationTab, type RemunerationSubTab } from "./tabs/DossierRemunerationTab";
import { STATUS_LABELS } from "@/lib/constants";
import {
  getEmployeeDossier,
  MARITAL_LABELS,
  type DossierTabId,
} from "@/lib/employee-dossier";
import {
  computeDossierTabCompletions,
  DOSSIER_TABS_WITHOUT_PERCENT,
} from "@/lib/employee-dossier-completion";
import type {
  AppSettings,
  Employee,
  EmployeeDossier,
  MaritalStatus,
  Sexe,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export type { DossierTabId };

const TABS: { id: DossierTabId; label: string; icon: typeof User }[] = [
  { id: "profil", label: "Profil", icon: User },
  { id: "coordonnees", label: "Coordonnées", icon: MapPin },
  { id: "postes_mouvements", label: "Postes et mouvements", icon: GitBranch },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "remuneration", label: "Rémunération", icon: Wallet },
  { id: "conges", label: "Congés", icon: Calendar },
  { id: "formations", label: "Formations", icon: GraduationCap },
  { id: "discipline", label: "Discipline", icon: Star },
  { id: "historique", label: "Historique", icon: History },
];

const TAB_IDS = TABS.map((t) => t.id);

function defaultViews(documentsView?: DossierSectionView): Record<DossierTabId, DossierSectionView> {
  return Object.fromEntries(
    TAB_IDS.map((id) => [
      id,
      id === "documents" && documentsView
        ? documentsView
        : id === "conges"
          ? "cards"
          : "table",
    ])
  ) as Record<DossierTabId, DossierSectionView>;
}

export function EmployeeDossierTabs({
  employee,
  settings,
  onSave,
  onFamilyChange,
  saving,
  dossierLoading = false,
  defaultTab = "profil",
  layout = "horizontal",
  forceView,
  hideViewToggle = false,
  documentsDefaultView,
}: {
  employee: Employee;
  settings: AppSettings;
  onSave: (data: Partial<Employee>) => Promise<void>;
  onFamilyChange?: (family: Employee["family"]) => void;
  saving?: boolean;
  dossierLoading?: boolean;
  defaultTab?: DossierTabId;
  layout?: "horizontal" | "vertical";
  forceView?: DossierSectionView;
  hideViewToggle?: boolean;
  /** Vue initiale de l’onglet Documents (ex. tableau dans le modal dossier) */
  documentsDefaultView?: DossierSectionView;
}) {
  const [tab, setTab] = useState<DossierTabId>(() =>
    defaultTab === "paie" ? "remuneration" : defaultTab
  );
  const [remunerationSubTab, setRemunerationSubTab] = useState<RemunerationSubTab | undefined>(
    defaultTab === "paie" ? "bulletins" : undefined
  );

  useEffect(() => {
    setTab(defaultTab === "paie" ? "remuneration" : defaultTab);
    setRemunerationSubTab(defaultTab === "paie" ? "bulletins" : undefined);
  }, [defaultTab, employee.id]);
  const [views, setViews] = useState(() => defaultViews(documentsDefaultView));
  const dossier = getEmployeeDossier(employee);
  const view = views[tab];
  const effectiveView: DossierSectionView = forceView ?? view;
  const setView = (v: DossierSectionView) => setViews((prev) => ({ ...prev, [tab]: v }));

  const patch = useCallback(
    async (data: Partial<Employee>) => {
      await onSave(data);
    },
    [onSave]
  );

  const patchDossier = (partial: Partial<EmployeeDossier>) => {
    void patch({ dossier: partial });
  };

  const completions = computeDossierTabCompletions(employee);

  const profilFields: EditableFieldDef[] = useMemo(
    () => [
      { key: "m", label: "Matricule", displayValue: employee.matricule, rawValue: employee.matricule, readOnly: true },
      { key: "n", label: "Nom", displayValue: employee.nom, rawValue: employee.nom, onSave: (nom) => void patch({ nom }) },
      { key: "pn", label: "Post-nom", displayValue: employee.postNom ?? "—", rawValue: employee.postNom ?? "", onSave: (postNom) => void patch({ postNom }) },
      { key: "pr", label: "Prénom", displayValue: employee.prenom, rawValue: employee.prenom, onSave: (prenom) => void patch({ prenom }) },
      {
        key: "sx",
        label: "Sexe",
        displayValue: employee.sexe === "F" ? "Féminin" : "Masculin",
        rawValue: employee.sexe,
        type: "select",
        options: [
          { value: "M", label: "Masculin" },
          { value: "F", label: "Féminin" },
        ],
        onSave: (v) => void patch({ sexe: v as Sexe }),
      },
      {
        key: "dn",
        label: "Date de naissance",
        displayValue: employee.dateNaissance ? formatDate(employee.dateNaissance) : "—",
        rawValue: employee.dateNaissance ?? "",
        type: "date",
        onSave: (dateNaissance) => void patch({ dateNaissance }),
      },
      { key: "ln", label: "Lieu de naissance", displayValue: employee.lieuNaissance ?? "—", rawValue: employee.lieuNaissance ?? "", onSave: (lieuNaissance) => void patch({ lieuNaissance }) },
      { key: "nat", label: "Nationalité", displayValue: employee.nationalite, rawValue: employee.nationalite, onSave: (nationalite) => void patch({ nationalite }) },
      {
        key: "ec",
        label: "État civil",
        displayValue: MARITAL_LABELS[employee.maritalStatus],
        rawValue: employee.maritalStatus,
        type: "select",
        options: Object.entries(MARITAL_LABELS).map(([value, label]) => ({ value, label })),
        onSave: (v) => void patch({ maritalStatus: v as MaritalStatus }),
      },
      {
        key: "en",
        label: "Nombre d'enfants",
        displayValue: String(employee.childrenCount),
        rawValue: employee.childrenCount,
        type: "number",
        onSave: (v) => void patch({ childrenCount: Number(v) || 0 }),
      },
      {
        key: "ca",
        label: "Congé annuel — acquis",
        displayValue: `${employee.leaveBalance.acquired} j`,
        readOnly: true,
      },
      {
        key: "cp",
        label: "Congé annuel — pris",
        displayValue: `${employee.leaveBalance.taken} j`,
        readOnly: true,
      },
      {
        key: "cr",
        label: "Congé annuel — solde",
        displayValue: `${employee.leaveBalance.remaining} j`,
        readOnly: true,
      },
      {
        key: "cg",
        label: "Grade (congé)",
        displayValue: employee.leaveBalance.grade ?? employee.grade ?? "—",
        readOnly: true,
      },
      {
        key: "cri",
        label: "Dernière réinit. congé",
        displayValue: employee.leaveBalance.reinitAt
          ? formatDate(employee.leaveBalance.reinitAt)
          : "—",
        readOnly: true,
      },
    ],
    [employee, patch]
  );

  function toggleWorkflow(stepId: string) {
    const workflow = employee.workflow.map((s) =>
      s.id === stepId
        ? {
            ...s,
            completed: !s.completed,
            completedAt: !s.completed ? new Date().toISOString() : undefined,
          }
        : s
    );
    void patch({ workflow });
  }

  function toggleDocument(docId: string) {
    const documents = employee.documents.map((d) =>
      d.id === docId
        ? {
            ...d,
            received: !d.received,
            receivedAt: !d.received ? new Date().toISOString() : undefined,
          }
        : d
    );
    void patch({ documents });
  }

  const tabNav = (
    <>
      {TABS.map((t) => {
        const Icon = t.icon;
        const { percent } = completions[t.id];
        const showPercent = !DOSSIER_TABS_WITHOUT_PERCENT.includes(t.id);
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "transition",
              layout === "vertical"
                ? cn(
                    "flex min-h-[3.5rem] w-full flex-col justify-center gap-1 rounded-lg px-3 py-2.5 text-left text-sm",
                    active
                      ? "bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/30 dark:text-sky-300"
                      : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                  )
                : cn(
                    "flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-center",
                    active
                      ? "border-sky-500 text-sky-500"
                      : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                  )
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1.5",
                layout === "horizontal" && "flex-col"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "font-medium leading-tight",
                  layout === "horizontal" ? "text-[10px] sm:text-[11px] line-clamp-2" : ""
                )}
              >
                {t.label}
              </span>
              {layout === "horizontal" && showPercent && (
                <span className="text-[10px] font-semibold tabular-nums">{percent}%</span>
              )}
            </span>
            {layout === "vertical" && showPercent && (
              <span className="flex items-center gap-2 pl-6">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--shell-border)]">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      percent >= 80 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-500" : "bg-slate-500"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-[10px] tabular-nums">{percent}%</span>
              </span>
            )}
            {layout === "horizontal" && !showPercent && (
              <span className="h-[14px]" aria-hidden />
            )}
          </button>
        );
      })}
    </>
  );

  const tabPanels = (
    <div
      className={cn(
        layout === "vertical" && (tab === "profil" || tab === "conges")
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : layout === "vertical"
            ? "min-h-0 flex-1 overflow-y-auto"
            : undefined
      )}
    >
      {saving && <p className="text-xs text-sky-500">Enregistrement…</p>}

      {tab === "profil" && (
        <div
          className={cn(
            "space-y-4",
            layout === "vertical" && "flex min-h-0 flex-1 flex-col overflow-hidden"
          )}
        >
          <DossierTabToolbar
            title="Profil"
            description="Identité et état civil"
            view={effectiveView}
            onViewChange={setView}
            showViewToggle={!hideViewToggle}
          />
          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-2 xl:items-stretch">
            <div
              className={cn(
                "min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1",
                layout === "vertical" ? "max-h-none" : "max-h-[min(65vh,36rem)]"
              )}
            >
              {effectiveView === "cards" ? (
                <DossierGrid>
                  <DossierField label="Matricule">
                    <DossierTextInput value={employee.matricule} onChange={() => {}} readOnly />
                  </DossierField>
                  <DossierField label="Nom" required>
                    <DossierTextInput value={employee.nom} onChange={(nom) => void patch({ nom })} />
                  </DossierField>
                  <DossierField label="Post-nom">
                    <DossierTextInput value={employee.postNom} onChange={(postNom) => void patch({ postNom })} />
                  </DossierField>
                  <DossierField label="Prénom" required>
                    <DossierTextInput value={employee.prenom} onChange={(prenom) => void patch({ prenom })} />
                  </DossierField>
                  <DossierField label="Sexe">
                    <DossierSelect
                      value={employee.sexe}
                      onChange={(v) => void patch({ sexe: v as Sexe })}
                      options={[
                        { value: "M", label: "Masculin" },
                        { value: "F", label: "Féminin" },
                      ]}
                    />
                  </DossierField>
                  <DossierField label="Date de naissance">
                    <DossierTextInput type="date" value={employee.dateNaissance} onChange={(dateNaissance) => void patch({ dateNaissance })} />
                  </DossierField>
                  <DossierField label="Lieu de naissance">
                    <DossierTextInput value={employee.lieuNaissance} onChange={(lieuNaissance) => void patch({ lieuNaissance })} />
                  </DossierField>
                  <DossierField label="Nationalité">
                    <DossierTextInput value={employee.nationalite} onChange={(nationalite) => void patch({ nationalite })} />
                  </DossierField>
                  <DossierField label="État civil">
                    <DossierSelect
                      value={employee.maritalStatus}
                      onChange={(v) => void patch({ maritalStatus: v as MaritalStatus })}
                      options={Object.entries(MARITAL_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </DossierField>
                  <DossierField label="Nombre d'enfants">
                    <DossierTextInput
                      type="number"
                      value={employee.childrenCount}
                      onChange={(v) => void patch({ childrenCount: Number(v) || 0 })}
                    />
                  </DossierField>
                  <DossierField label="Congé annuel — acquis">
                    <DossierTextInput
                      value={`${employee.leaveBalance.acquired} j`}
                      onChange={() => {}}
                      readOnly
                    />
                  </DossierField>
                  <DossierField label="Congé annuel — pris">
                    <DossierTextInput
                      value={`${employee.leaveBalance.taken} j`}
                      onChange={() => {}}
                      readOnly
                    />
                  </DossierField>
                  <DossierField label="Congé annuel — solde">
                    <DossierTextInput
                      value={`${employee.leaveBalance.remaining} j`}
                      onChange={() => {}}
                      readOnly
                    />
                  </DossierField>
                  <DossierField label="Grade (congé)">
                    <DossierTextInput
                      value={employee.leaveBalance.grade ?? employee.grade ?? "—"}
                      onChange={() => {}}
                      readOnly
                    />
                  </DossierField>
                  <DossierField label="Dernière réinit. congé">
                    <DossierTextInput
                      value={
                        employee.leaveBalance.reinitAt
                          ? formatDate(employee.leaveBalance.reinitAt)
                          : "—"
                      }
                      onChange={() => {}}
                      readOnly
                    />
                  </DossierField>
                </DossierGrid>
              ) : (
                <EditableFieldsTable fields={profilFields} />
              )}
            </div>
            <div
              className={cn(
                "min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/50 p-4",
                layout === "vertical" ? "max-h-none" : "max-h-[min(65vh,36rem)]"
              )}
            >
              <FamilyOrganigram
                employee={employee}
                onFamilyChange={
                  onFamilyChange ??
                  ((family) =>
                    void patch({
                      family,
                      childrenCount: family.filter((m) => m.relation === "enfant").length,
                    }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {tab === "coordonnees" && (
        <DossierCoordonneesTab
          employee={employee}
          view={effectiveView}
          onViewChange={setView}
          onPatch={(data) => void patch(data)}
          showViewToggle={!hideViewToggle}
        />
      )}

      {tab === "postes_mouvements" && (
        <DossierPostesMouvementsTab
          employee={employee}
          settings={settings}
          view={effectiveView}
          onViewChange={setView}
          onPatch={(data) => void patch(data)}
          onPatchDossier={patchDossier}
          showViewToggle={!hideViewToggle}
        />
      )}

      {tab === "remuneration" && (
        <DossierRemunerationTab
          employee={employee}
          settings={settings}
          view={effectiveView}
          onViewChange={setView}
          onPatch={(data) => void patch(data)}
          onPatchDossier={patchDossier}
          showViewToggle={!hideViewToggle}
          initialSubTab={remunerationSubTab}
          onSubTabChange={setRemunerationSubTab}
        />
      )}

      {tab === "conges" && (
        <DossierCongesTab
          employee={employee}
          view={effectiveView}
          onViewChange={setView}
          onPatch={(data) => void patch(data)}
          onPatchDossier={patchDossier}
          dossierLoading={dossierLoading}
          showViewToggle={!hideViewToggle}
        />
      )}

      {tab === "documents" && (
        <div>
          <DossierTabToolbar
            title="Documents RH"
            description="Bouton Voir ou icône œil pour visualiser · clic droit pour plus d'actions"
            view={view}
            onViewChange={setView}
            showViewToggle
            cardsLabel="Grille"
            tableLabel="Tableau"
          />
          <DocumentChecklist
            employeeId={employee.id}
            documents={employee.documents}
            view={view === "table" ? "table" : "grid"}
            onToggle={toggleDocument}
            onUploaded={(documents) => void patch({ documents })}
            onDocumentsChange={(documents) => void patch({ documents })}
            compactColumns={view === "cards"}
          />
          <DossierGrid className="mt-6">
            <DossierField label="N° CNI">
              <DossierTextInput value={dossier.numeroCarteIdentite} onChange={(numeroCarteIdentite) => patchDossier({ numeroCarteIdentite })} />
            </DossierField>
            <DossierField label="Expiration CNI">
              <DossierTextInput type="date" value={dossier.expirationCarteIdentite} onChange={(expirationCarteIdentite) => patchDossier({ expirationCarteIdentite })} />
            </DossierField>
          </DossierGrid>
        </div>
      )}

      {tab === "formations" && (
        <DossierFormationsTab employee={employee} view={effectiveView} onViewChange={setView} onPatchDossier={patchDossier} showViewToggle={!hideViewToggle} />
      )}

      {tab === "discipline" && (
        <DossierDisciplineTab employee={employee} onSave={(data) => void patch(data)} />
      )}

      {tab === "historique" && <DossierHistoriqueTab employee={employee} />}
    </div>
  );

  if (layout === "vertical") {
    return (
      <div className="flex min-h-0 flex-1">
        <nav
          className="flex w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--shell-border)] bg-[var(--shell-surface)]/50 p-3"
          aria-label="Sections du dossier"
        >
          {tabNav}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-5">{tabPanels}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="grid w-full gap-0 border-b border-[var(--shell-border)] pb-px"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {tabNav}
      </div>
      {tabPanels}
    </div>
  );
}
