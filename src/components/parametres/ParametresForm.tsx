"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Building2,
  Bus,
  ChevronRight,
  CircleDollarSign,
  Clock,
  EyeOff,
  GitBranch,
  Layers,
  Palmtree,
  Plus,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/SettingsContext";
import {
  METRIC_TONE_STYLES,
  type MetricTone,
} from "@/components/dashboard/DashboardMetricsRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { Grid8, GridStat } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { NumericInput } from "@/components/ui/NumericInput";
import { StickyTable, StickyThead, Th, Td } from "@/components/layout/StickyTable";
import {
  formatIrppBracketRange,
  monthlyCeilingFromBracket,
} from "@/lib/irpp-bareme";
import { refreshSmigRow, SMIG_BAREME_DATE, SMIG_DAYS_REFERENCE } from "@/lib/smig-bareme";
import { NamedOrgRefEditor } from "@/components/parametres/NamedOrgRefEditor";
import { CompanyLogoField } from "@/components/parametres/CompanyLogoField";
import { DepartementsEditor } from "@/components/parametres/DepartementsEditor";
import { CentresCoutsEditor } from "@/components/parametres/CentresCoutsEditor";
import { syncGradeLeaveDays } from "@/lib/default-settings";
import {
  configurationTitreForSection,
  extractConfigurationSectionParams,
  type ConfigurationSectionId,
} from "@/lib/configuration-sections";
import {
  formatInppRatePct,
  resolveInppHeadcount,
  resolveInppRateForSettings,
} from "@/lib/inpp-rate";
import { departementLabels } from "@/lib/repositories/departements/mapper";
import type { AppSettings, Departement, Grade, IrppBracketConfig, SmigBaremeRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = ConfigurationSectionId;

const SECTIONS: {
  id: Tab;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: MetricTone;
  wide?: boolean;
}[] = [
  {
    id: "entreprise",
    label: "Entreprise",
    description: "Raison sociale, logo, change BCC, INPP et affichage des salaires",
    icon: Building2,
    tone: "violet",
  },
  {
    id: "effectifs",
    label: "Externes & journaliers",
    description: "Sous-traitants et profils journaliers pour les mouvements RH",
    icon: Users,
    tone: "sky",
  },
  {
    id: "transport",
    label: "Barème SMIG / transport",
    description: "Catégories professionnelles, salaires de base et indemnités transport",
    icon: Bus,
    tone: "amber",
    wide: true,
  },
  {
    id: "cnss",
    label: "CNSS / INPP / ONEM / IRPP",
    description: "Taux sociaux, barèmes INPP et échelle IRPP",
    icon: Shield,
    tone: "emerald",
    wide: true,
  },
  {
    id: "departements",
    label: "Départements",
    description: "Structure organisationnelle et services",
    icon: GitBranch,
    tone: "indigo",
    wide: true,
  },
  {
    id: "centres_couts",
    label: "Centres de coûts",
    description: "Référentiel des centres de coûts pour les fiches de poste",
    icon: CircleDollarSign,
    tone: "sky",
    wide: true,
  },
  {
    id: "grades",
    label: "Grades",
    description: "Hiérarchie des grades utilisés sur les fiches de poste",
    icon: Award,
    tone: "rose",
  },
  {
    id: "categories",
    label: "Catégories",
    description: "Catégories salariales et planchers en USD",
    icon: Layers,
    tone: "cyan",
  },
  {
    id: "conges",
    label: "Congés & préavis",
    description: "Règles légales, préavis et congés annuels par grade",
    icon: Palmtree,
    tone: "orange",
    wide: true,
  },
  {
    id: "autres",
    label: "Heures sup.",
    description: "Majorations pour heures supplémentaires et jours fériés",
    icon: Clock,
    tone: "slate",
  },
];

export function ParametresForm({
  initial,
  initialDepartements,
  inppAutoHeadcount,
}: {
  initial: AppSettings;
  initialDepartements: Departement[];
  inppAutoHeadcount: number;
}) {
  const { can } = useAuth();
  const canWrite = can("configuration", "write");
  const [settings, setSettings] = useState(initial);
  const [openSection, setOpenSection] = useState<Tab | null>(null);
  const activeSection = openSection
    ? SECTIONS.find((s) => s.id === openSection)
    : undefined;

  useEffect(() => {
    if (!openSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSection(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [openSection]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const { applyServerSettings } = useAppSettings();

  async function resolveSectionParams(section: Tab): Promise<Partial<AppSettings>> {
    if (section === "departements") {
      const res = await fetch("/api/departements");
      if (res.ok) {
        const departements = (await res.json()) as Departement[];
        return extractConfigurationSectionParams(section, {
          ...settings,
          departments: departementLabels(departements, true),
        });
      }
    }
    return extractConfigurationSectionParams(section, settings);
  }

  async function saveSection(section: Tab, options?: { closeModal?: boolean }) {
    if (!canWrite) return;
    setSaving(true);
    setMsg("");
    try {
      const params = await resolveSectionParams(section);
      const res = await fetch("/api/settings/section", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section, params }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(err.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      const payload = (await res.json()) as { settings: AppSettings; revision: string };
      setSettings(payload.settings);
      applyServerSettings({ settings: payload.settings, revision: payload.revision });
      setMsg(`${configurationTitreForSection(section)} enregistré`);
      if (options?.closeModal) {
        setOpenSection(null);
      }
    } catch {
      setMsg("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllSections() {
    if (!canWrite) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(err.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      const payload = (await res.json()) as { settings: AppSettings; revision: string };
      setSettings(payload.settings);
      applyServerSettings({ settings: payload.settings, revision: payload.revision });
      setMsg("Toutes les sections enregistrées");
    } catch {
      setMsg("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const pct = (v: number) => (v * 100).toFixed(2);
  const fromPct = (v: string) => parseFloat(v) / 100 || 0;

  const inppUsesForfait = settings.inppHeadcountForfait != null;
  const inppEffectiveHeadcount = resolveInppHeadcount(
    { ...settings, inppLastAutoHeadcount: inppAutoHeadcount },
    inppUsesForfait ? undefined : inppAutoHeadcount
  );
  const inppResolvedRate = resolveInppRateForSettings(
    { ...settings, inppLastAutoHeadcount: inppAutoHeadcount },
    inppUsesForfait ? undefined : inppAutoHeadcount
  );
  const ModalIcon = activeSection?.icon;

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Taux, départements, catégories, SMIG — appliqués à toute l'application"
      >
        {canWrite && (
          <SaveButton
            type="button"
            onClick={saveAllSections}
            saving={saving}
            className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-500 hover:via-teal-400 hover:to-cyan-400 hover:shadow-emerald-500/40"
          >
            Tout enregistrer
          </SaveButton>
        )}
      </PageHeader>

      {msg && (
        <p className={`mb-4 text-sm ${msg.includes("Erreur") ? "text-red-400" : "text-emerald-400"}`}>
          {msg}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const style = METRIC_TONE_STYLES[section.tone];
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setOpenSection(section.id)}
              className={cn(
                "group relative min-h-[7.5rem] overflow-hidden rounded-xl border p-5 text-left",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-1 hover:shadow-lg",
                style.border,
                style.hoverBorder,
                style.shadow
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br transition-all duration-300",
                  style.gradient,
                  style.hoverGradient
                )}
                aria-hidden
              />
              <div className="relative z-[1] flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                    style.iconBg
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", style.valueColor)}>{section.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--shell-text-muted)] line-clamp-2 group-hover:text-[var(--shell-text)]">
                    {section.description}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 opacity-50 transition duration-300",
                    "group-hover:translate-x-1 group-hover:opacity-100",
                    style.valueColor
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      {openSection && activeSection && ModalIcon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpenSection(null)}
          role="presentation"
        >
          <div
            className={cn(
              "flex max-h-[min(92vh,900px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl",
              activeSection.wide ? "max-w-6xl" : "max-w-3xl"
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="parametres-modal-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                  <ModalIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="parametres-modal-title"
                    className="truncate font-semibold text-[var(--shell-text)]"
                  >
                    {activeSection.label}
                  </h2>
                  <p className="truncate text-xs text-[var(--shell-text-muted)]">
                    {activeSection.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenSection(null)}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      {openSection === "effectifs" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <NamedOrgRefEditor
            title="Sous-traitants"
            description="Liste utilisée pour les employés de type Externe (mouvements, fiches, liste employés)."
            items={settings.subcontractors}
            onChange={(subcontractors) => setSettings({ ...settings, subcontractors })}
            addLabel="Nouveau sous-traitant"
          />
          <NamedOrgRefEditor
            title="Profils journaliers"
            description="Liste utilisée pour les employés de type Journalier."
            items={settings.journalierProviders}
            onChange={(journalierProviders) => setSettings({ ...settings, journalierProviders })}
            addLabel="Nouveau profil journalier"
          />
        </div>
      )}

      {openSection === "entreprise" && (
        <Grid8>
          <Field label="Raison sociale" className="col-span-2 sm:col-span-4 lg:col-span-4">
            <input
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="RCCM" className="col-span-2 sm:col-span-4 lg:col-span-4">
            <input
              value={settings.companyRccm ?? ""}
              onChange={(e) => setSettings({ ...settings, companyRccm: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Adresse" className="col-span-2 sm:col-span-8 lg:col-span-8">
            <input
              value={settings.companyAddress ?? ""}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Téléphone" className="col-span-2 sm:col-span-4">
            <input
              value={settings.companyPhone ?? ""}
              onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Email" className="col-span-2 sm:col-span-4">
            <input
              value={settings.companyEmail ?? ""}
              onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
              className="input"
            />
          </Field>
          <CompanyLogoField
            logoUrl={settings.companyLogoUrl}
            companyName={settings.companyName}
            onSaved={(bundle) => {
              setSettings(bundle.settings);
              applyServerSettings(bundle);
            }}
          />
          <Field label="Couleur principale" className="col-span-2 sm:col-span-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.companyBrandColor ?? "#0f172a"}
                onChange={(e) => setSettings({ ...settings, companyBrandColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                aria-label="Couleur principale"
              />
              <input
                type="text"
                value={settings.companyBrandColor ?? "#0f172a"}
                onChange={(e) => setSettings({ ...settings, companyBrandColor: e.target.value })}
                className="input flex-1 font-mono text-sm"
                placeholder="#0f172a"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">En-têtes et bandeaux des rapports PDF</p>
          </Field>
          <Field label="Couleur secondaire" className="col-span-2 sm:col-span-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.companyBrandColorSecondary ?? "#0ea5e9"}
                onChange={(e) =>
                  setSettings({ ...settings, companyBrandColorSecondary: e.target.value })
                }
                className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                aria-label="Couleur secondaire"
              />
              <input
                type="text"
                value={settings.companyBrandColorSecondary ?? "#0ea5e9"}
                onChange={(e) =>
                  setSettings({ ...settings, companyBrandColorSecondary: e.target.value })
                }
                className="input flex-1 font-mono text-sm"
                placeholder="#0ea5e9"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Accents, filets et graphiques des rapports</p>
          </Field>
          <Field label="Préfixe matricule" className="col-span-2 sm:col-span-4">
            <input
              value={settings.matriculePrefix}
              onChange={(e) => setSettings({ ...settings, matriculePrefix: e.target.value })}
              className="input"
            />
          </Field>
          <div className="col-span-2 sm:col-span-4">
            <NumField
              label="Taux change BCC (1 USD → CDF)"
              value={settings.exchangeRate}
              onChange={(v) => setSettings({ ...settings, exchangeRate: v })}
            />
          </div>
          <div className="col-span-2 sm:col-span-8 lg:col-span-8">
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent className="pt-6">
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    type="checkbox"
                    checked={settings.hideSalariesFromDisplay === true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        hideSalariesFromDisplay: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-violet-600"
                  />
                  <div>
                    <span className="flex items-center gap-2 font-medium text-white">
                      <EyeOff className="h-4 w-4 text-violet-400" />
                      Masquer les salaires à l&apos;affichage
                    </span>
                    <p className="mt-1 text-sm text-slate-400">
                      Politique globale : masque tous les montants (•••••) pour tous les utilisateurs,
                      même ceux ayant la permission « Voir les montants salariaux ». Complémentaire aux
                      droits par compte (Utilisateurs → Permissions).
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-2 sm:col-span-8 lg:col-span-8">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-white">INPP — effectif et taux</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Article 1er — public 4 % ; privé 3,5 % (1–50), 3 % (51–300), 2 % (&gt; 300).
                  Assiette paie : salaire de base mensuel (hors indemnités).
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Secteur employeur">
                    <select
                      value={settings.inppSector ?? "prive"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          inppSector: e.target.value as "public" | "prive",
                        })
                      }
                      className="input"
                    >
                      <option value="prive">Privé</option>
                      <option value="public">Public</option>
                    </select>
                  </Field>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-xs text-slate-400">Effectif actif (base paie)</p>
                    <p className="mt-1 text-lg font-semibold text-white">{inppAutoHeadcount}</p>
                    <p className="text-[10px] text-slate-500">actif, essai, congé, préavis</p>
                  </div>
                  <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 sm:col-span-2">
                    <p className="text-xs text-slate-400">Taux INPP applicable</p>
                    <p className="mt-1 text-lg font-semibold text-violet-200">
                      {formatInppRatePct(inppResolvedRate)} %
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Effectif retenu : {inppEffectiveHeadcount}
                      {inppUsesForfait ? " (forfait)" : " (auto)"}
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3">
                  <input
                    type="checkbox"
                    checked={inppUsesForfait}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        inppHeadcountForfait: e.target.checked ? inppAutoHeadcount || 1 : null,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-violet-600"
                  />
                  <div>
                    <span className="font-medium text-white">Forfait effectif</span>
                    <p className="mt-1 text-sm text-slate-400">
                      Saisir un effectif fixe (ex. déclaration INPP) au lieu du décompte automatique
                      des employés en paie.
                    </p>
                  </div>
                </label>
                {inppUsesForfait && (
                  <Field label="Effectif forfait" className="max-w-xs">
                    <NumericInput
                      min={1}
                      value={settings.inppHeadcountForfait ?? 1}
                      onChange={(v) =>
                        setSettings({
                          ...settings,
                          inppHeadcountForfait: Math.max(1, Math.round(v)),
                        })
                      }
                      className="input"
                    />
                  </Field>
                )}
              </CardContent>
            </Card>
          </div>
        </Grid8>
      )}

      {openSection === "transport" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Barème SMIG au {settings.smigBaremeDate ?? SMIG_BAREME_DATE} — manœuvre ordinaire 21 500
            FC/jour (hausse applicable depuis janvier 2026). Catégories professionnelles, grades,
            salaire de base journalier, transport journalier (4 000 ou 6 000 FC/jour) et transport
            mensuel = jour × {SMIG_DAYS_REFERENCE}. En simulation : transport pointage = journalier ×
            jours prestés.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <StickyTable>
              <StickyThead>
                <tr>
                  <Th>Catégorie</Th>
                  <Th>Échelon</Th>
                  <Th>Grade</Th>
                  <Th>Tension</Th>
                  <Th>Base / jour</Th>
                  <Th>Base × 26</Th>
                  <Th>Logement 30%</Th>
                  <Th>Transport / jour</Th>
                  <Th>Transport / mois (×26)</Th>
                  <Th>Total rémun.</Th>
                </tr>
              </StickyThead>
              <tbody>
                {(settings.smigBareme ?? []).map((row, i) => (
                  <SmigBaremeRowEditor
                    key={row.id}
                    row={row}
                    onChange={(updated) => {
                      const smigBareme = [...(settings.smigBareme ?? [])];
                      smigBareme[i] = refreshSmigRow(updated);
                      setSettings({ ...settings, smigBareme });
                    }}
                  />
                ))}
              </tbody>
            </StickyTable>
          </div>
        </div>
      )}

      {openSection === "cnss" && (
        <div className="space-y-6">
          <Grid8>
            <PctField label="CNSS salarié %" value={settings.cnssEmployeeRate} onChange={(v) => setSettings({ ...settings, cnssEmployeeRate: v })} pct={pct} fromPct={fromPct} />
            <PctField label="CNSS employeur %" value={settings.cnssEmployerRate} onChange={(v) => setSettings({ ...settings, cnssEmployerRate: v })} pct={pct} fromPct={fromPct} />
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-slate-400">INPP % (calculé)</p>
              <p className="mt-1 text-lg font-semibold text-violet-200">
                {formatInppRatePct(settings.inppRate)} %
              </p>
              <p className="text-[10px] text-slate-500">
                Secteur + effectif — onglet Entreprise
              </p>
            </div>
            <PctField label="ONEM %" value={settings.onemRate} onChange={(v) => setSettings({ ...settings, onemRate: v })} pct={pct} fromPct={fromPct} />
            <PctField label="Pensions employeur %" value={settings.cnssPensionEmployerRate} onChange={(v) => setSettings({ ...settings, cnssPensionEmployerRate: v })} pct={pct} fromPct={fromPct} />
            <PctField label="Pensions salarié %" value={settings.cnssPensionEmployeeRate} onChange={(v) => setSettings({ ...settings, cnssPensionEmployeeRate: v })} pct={pct} fromPct={fromPct} />
            <PctField label="Prestations familiales %" value={settings.cnssFamilyRate} onChange={(v) => setSettings({ ...settings, cnssFamilyRate: v })} pct={pct} fromPct={fromPct} />
            <PctField label="Risques pro. %" value={settings.cnssRiskRate} onChange={(v) => setSettings({ ...settings, cnssRiskRate: v })} pct={pct} fromPct={fromPct} />
          </Grid8>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-white">Barème INPP par effectif</h3>
              <p className="mt-1 text-xs text-slate-500">
                Article 1er — taux selon effectif : public 4 % ; privé 3,5 % (1–50), 3 % (51–300), 2 %
                (&gt; 300). En paie : assiette = salaire de base mensuel (hors indemnités).
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Grid8>
                {settings.inppTiers.map((tier, i) => (
                  <GridStat key={i}>
                    <p className="text-xs text-slate-400 truncate">{tier.label}</p>
                    <NumericInput
                      decimal
                      min={0}
                      value={Number(pct(tier.rate))}
                      onChange={(v) => {
                        const tiers = [...settings.inppTiers];
                        tiers[i] = { ...tier, rate: fromPct(String(v)) };
                        setSettings({ ...settings, inppTiers: tiers });
                      }}
                      className="input mt-1"
                    />
                    <span className="text-[10px] text-slate-500">%</span>
                  </GridStat>
                ))}
              </Grid8>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-white">Barème IRPP (ex-IPR)</h3>
              <p className="mt-1 text-xs text-slate-500">
                Échelle progressive sur les revenus annuels (FC) — plancher{" "}
                {settings.irppMinMonthlyCdf?.toLocaleString("fr-CD") ?? "2 500"} FC/mois après
                abattements ; plafond {(settings.irppMaxRateOfTaxable ?? 0.3) * 100} % du revenu
                imposable.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                <label className="text-xs text-slate-400">
                  Plancher mensuel (FC)
                  <NumericInput
                    min={0}
                    value={settings.irppMinMonthlyCdf ?? 2500}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        irppMinMonthlyCdf: v,
                      })
                    }
                    className="input mt-1 w-full"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Plafond (% du revenu imposable)
                  <NumericInput
                    min={0}
                    max={100}
                    decimal
                    value={Number(pct(settings.irppMaxRateOfTaxable ?? 0.3))}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        irppMaxRateOfTaxable: fromPct(String(v)),
                      })
                    }
                    className="input mt-1 w-full"
                  />
                </label>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <StickyTable>
                  <StickyThead>
                    <tr>
                      <Th>Taux</Th>
                      <Th>Tranche revenus (FC/an)</Th>
                      <Th>Plafond mensuel (FC)</Th>
                    </tr>
                  </StickyThead>
                  <tbody>
                    {(settings.irppBrackets ?? []).map((row, i) => (
                      <IrppBracketRow
                        key={i}
                        row={row}
                        onChange={(updated) => {
                          const irppBrackets = [...(settings.irppBrackets ?? [])];
                          irppBrackets[i] = updated;
                          setSettings({ ...settings, irppBrackets });
                        }}
                      />
                    ))}
                  </tbody>
                </StickyTable>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {openSection === "departements" && <DepartementsEditor initial={initialDepartements} />}

      {openSection === "centres_couts" && (
        <CentresCoutsEditor
          items={settings.centresCouts ?? []}
          onChange={(centresCouts) => setSettings({ ...settings, centresCouts })}
        />
      )}

      {openSection === "grades" && (
        <div className="space-y-4">
          <Grid8>
            {settings.grades.map((g, i) => (
              <GridStat key={i}>
                <input
                  value={g}
                  onChange={(e) => {
                    const grades = [...settings.grades] as Grade[];
                    const previous = grades[i];
                    grades[i] = e.target.value as Grade;
                    const renamedLeaveDays = (settings.gradeLeaveDays ?? []).map((row) =>
                      row.grade === previous ? { ...row, grade: grades[i] } : row
                    );
                    setSettings({
                      ...settings,
                      grades,
                      gradeLeaveDays: syncGradeLeaveDays(grades, renamedLeaveDays),
                    });
                  }}
                  className="input text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const grades = settings.grades.filter((_, j) => j !== i) as Grade[];
                    setSettings({
                      ...settings,
                      grades,
                      gradeLeaveDays: syncGradeLeaveDays(grades, settings.gradeLeaveDays ?? []),
                    });
                  }}
                  className="mt-2 text-red-400 text-xs"
                >
                  <Trash2 className="h-3 w-3 inline" />
                </button>
              </GridStat>
            ))}
          </Grid8>
          <button
            type="button"
            onClick={() => {
              const grades = [...settings.grades, "Agent"] as Grade[];
              setSettings({
                ...settings,
                grades,
                gradeLeaveDays: syncGradeLeaveDays(grades, settings.gradeLeaveDays ?? []),
              });
            }}
            className="text-sm text-sky-400 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Grade
          </button>
        </div>
      )}

      {openSection === "categories" && (
        <Grid8>
          {settings.categories.map((c, i) => (
            <GridStat key={c.value}>
              <input
                value={c.label}
                onChange={(e) => {
                  const categories = [...settings.categories];
                  categories[i] = { ...c, label: e.target.value };
                  setSettings({ ...settings, categories });
                }}
                className="input text-xs mb-1"
              />
              <label className="text-[10px] text-slate-500">Min. USD</label>
              <NumericInput
                min={0}
                decimal
                value={c.minSalary}
                onChange={(v) => {
                  const categories = [...settings.categories];
                  categories[i] = { ...c, minSalary: v };
                  setSettings({ ...settings, categories });
                }}
                className="input text-sm"
              />
            </GridStat>
          ))}
        </Grid8>
      )}

      {openSection === "conges" && (
        <div className="space-y-6">
          <Grid8>
            <label className="text-xs text-[var(--shell-text-muted)]">
              Mode de travail (jours / mois)
              <select
                value={settings.workMonthMode ?? 26}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    workMonthMode: Number(e.target.value) as 22 | 26,
                  })
                }
                className="input mt-1 w-full text-sm"
              >
                <option value={26}>26 jours / mois (8 h × 26)</option>
                <option value={22}>22 jours / mois (5 j. × ~4 sem.)</option>
              </select>
              <span className="mt-1 block text-[10px] leading-snug">
                Utilisé pour le prorata paie, le taux journalier, le solde de tout compte et les
                heures sup. (sauf override sur le dossier employé).
              </span>
            </label>
            <NumField label="Heures / semaine max" value={settings.legalWeeklyHours} onChange={(v) => setSettings({ ...settings, legalWeeklyHours: v })} />
            <NumField label="Heures / jour max" value={settings.legalDailyHours} onChange={(v) => setSettings({ ...settings, legalDailyHours: v })} />
            <NumField label="Préavis base (jours)" value={settings.noticeBaseDays} onChange={(v) => setSettings({ ...settings, noticeBaseDays: v })} />
            <NumField label="+ jours / année service" value={settings.noticeDaysPerYear} onChange={(v) => setSettings({ ...settings, noticeDaysPerYear: v })} />
            <NumField label="Congé j/mois (>18 ans)" value={settings.annualLeaveDaysPerMonth} onChange={(v) => setSettings({ ...settings, annualLeaveDaysPerMonth: v })} />
            <NumField label="Congé j/mois (<18 ans)" value={settings.annualLeaveDaysPerMonthMinor} onChange={(v) => setSettings({ ...settings, annualLeaveDaysPerMonthMinor: v })} />
            <NumField label="Congé circonstance max/an" value={settings.congeCirconstanceMaxDays} onChange={(v) => setSettings({ ...settings, congeCirconstanceMaxDays: v })} />
          </Grid8>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--shell-text)]">
                Congé annuel par grade
              </h3>
              <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                Jours ouvrables par an selon le grade — utilisés à l&apos;affectation (bonus
                ancienneté art. 141 ajouté automatiquement). Les grades sont ceux de l&apos;onglet
                Grades.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <StickyTable className="max-h-none">
                <StickyThead>
                  <tr>
                    <Th>Grade</Th>
                    <Th className="w-40 text-right">Jours / an</Th>
                  </tr>
                </StickyThead>
                <tbody>
                  {syncGradeLeaveDays(settings.grades, settings.gradeLeaveDays ?? []).map(
                    (row) => (
                      <tr key={row.grade} className="hover:bg-[var(--shell-hover)]">
                        <Td className="font-medium">{row.grade}</Td>
                        <Td className="text-right">
                          <NumericInput
                            min={0}
                            max={365}
                            value={row.annualDays}
                            onChange={(annualDays) => {
                              const gradeLeaveDays = syncGradeLeaveDays(
                                settings.grades,
                                settings.gradeLeaveDays ?? []
                              ).map((g) =>
                                g.grade === row.grade ? { ...g, annualDays: Math.max(0, annualDays) } : g
                              );
                              setSettings({ ...settings, gradeLeaveDays });
                            }}
                            className="input ml-auto max-w-[6rem] text-right text-sm"
                          />
                        </Td>
                      </tr>
                    )
                  )}
                </tbody>
              </StickyTable>
            </CardContent>
          </Card>
        </div>
      )}

      {openSection === "autres" && (
        <Grid8>
          {settings.overtimeRates.map((o, i) => (
            <GridStat key={o.id}>
              <input
                value={o.label}
                onChange={(e) => {
                  const overtimeRates = [...settings.overtimeRates];
                  overtimeRates[i] = { ...o, label: e.target.value };
                  setSettings({ ...settings, overtimeRates });
                }}
                className="input text-xs mb-1"
              />
              <label className="text-[10px] text-slate-500">Majoration %</label>
              <NumericInput
                decimal
                min={0}
                value={Number(pct(o.rate))}
                onChange={(v) => {
                  const overtimeRates = [...settings.overtimeRates];
                  overtimeRates[i] = { ...o, rate: fromPct(String(v)) };
                  setSettings({ ...settings, overtimeRates });
                }}
                className="input text-sm"
              />
            </GridStat>
          ))}
        </Grid8>
      )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--shell-border)] bg-[var(--shell-surface)]/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpenSection(null)}
                className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              >
                Fermer
              </button>
              {canWrite && openSection !== "departements" && (
                <SaveButton
                  type="button"
                  onClick={() => openSection && saveSection(openSection, { closeModal: true })}
                  saving={saving}
                  disabled={!openSection}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Enregistrer
                </SaveButton>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
          padding: 0.4rem 0.6rem;
          color: white;
          font-size: 0.875rem;
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <GridStat>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <NumericInput value={value} onChange={onChange} className="input" />
    </GridStat>
  );
}

function SmigBaremeRowEditor({
  row,
  onChange,
}: {
  row: SmigBaremeRow;
  onChange: (row: SmigBaremeRow) => void;
}) {
  const derived = refreshSmigRow(row);
  return (
    <tr className="hover:bg-white/[0.02] text-sm">
      <Td className="text-xs max-w-[180px]">{row.categoryLabel}</Td>
      <Td className="text-xs">{row.echelon}</Td>
      <Td className="font-mono">{row.grade}</Td>
      <Td className="font-mono">{row.tension}</Td>
      <Td>
        <NumericInput
          min={0}
          value={row.dailyBaseSalary}
          onChange={(dailyBaseSalary) => onChange({ ...row, dailyBaseSalary })}
          className="input w-28 text-xs"
        />
      </Td>
      <Td className="font-mono text-slate-300">
        {derived.monthlyBase26.toLocaleString("fr-CD")}
      </Td>
      <Td className="font-mono text-slate-300">
        {derived.housingAllowance.toLocaleString("fr-CD")}
      </Td>
      <Td>
        <NumericInput
          min={0}
          decimal
          value={Math.round(row.transportDaily * 100) / 100}
          onChange={(transportDaily) => onChange({ ...row, transportDaily })}
          className="input w-24 text-xs"
        />
      </Td>
      <Td>
        <NumericInput
          min={0}
          value={derived.transportMonthly}
          onChange={(transportMonthly) =>
            onChange({
              ...row,
              transportDaily: transportMonthly / SMIG_DAYS_REFERENCE,
            })
          }
          className="input w-24 text-xs"
        />
      </Td>
      <Td className="font-mono text-emerald-400/90">
        {derived.totalRemuneration.toLocaleString("fr-CD")}
      </Td>
    </tr>
  );
}

function PctField({
  label,
  value,
  onChange,
  pct,
  fromPct,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  pct: (v: number) => string;
  fromPct: (v: string) => number;
}) {
  return (
    <GridStat>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <NumericInput
        decimal
        min={0}
        value={Number(pct(value))}
        onChange={(v) => onChange(fromPct(String(v)))}
        className="input"
      />
    </GridStat>
  );
}

function IrppBracketRow({
  row,
  onChange,
}: {
  row: IrppBracketConfig;
  onChange: (row: IrppBracketConfig) => void;
}) {
  const ratePct = Math.round(row.rate * 1000) / 10;
  return (
    <tr className="hover:bg-white/[0.02] text-sm">
      <Td>
        <div className="flex items-center gap-1">
          <NumericInput
            decimal
            min={0}
            value={ratePct}
            onChange={(v) => onChange({ ...row, rate: v / 100 })}
            className="input w-16 text-xs"
          />
          <span className="text-slate-500 text-xs">%</span>
        </div>
      </Td>
      <Td>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline">
            {formatIrppBracketRange(row.fromAnnualCdf, row.toAnnualCdf)}
          </span>
          <span className="text-slate-600">de</span>
          <NumericInput
            min={0}
            value={row.fromAnnualCdf}
            onChange={(fromAnnualCdf) => onChange({ ...row, fromAnnualCdf })}
            className="input w-28 text-xs"
          />
          {row.toAnnualCdf != null ? (
            <>
              <span className="text-slate-600">à</span>
              <NumericInput
                min={0}
                value={row.toAnnualCdf}
                onChange={(toAnnualCdf) => onChange({ ...row, toAnnualCdf })}
                className="input w-32 text-xs"
              />
            </>
          ) : (
            <span className="text-slate-500">(surplus)</span>
          )}
        </div>
      </Td>
      <Td className="font-mono text-slate-400 text-xs">
        {monthlyCeilingFromBracket(row.toAnnualCdf)}
      </Td>
    </tr>
  );
}
