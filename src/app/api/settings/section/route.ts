import { NextResponse } from "next/server";
import {
  configurationTitreForSection,
  type ConfigurationSectionId,
  CONFIGURATION_SECTIONS,
} from "@/lib/configuration-sections";
import { departementLabels } from "@/lib/repositories/departements/mapper";
import {
  getDepartements,
  getSettings,
  getSettingsBundle,
  saveAllConfigurationSections,
  saveConfigurationSection,
} from "@/lib/store";
import type { AppSettings } from "@/lib/types";

function isConfigurationSectionId(value: string): value is ConfigurationSectionId {
  return CONFIGURATION_SECTIONS.some((s) => s.id === value);
}

/** Upsert une section (`titre_config` + `params` JSONB). */
export async function PUT(request: Request) {
  let body: {
    sectionId?: string;
    params?: Partial<AppSettings>;
    updatedBy?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const sectionId = body.sectionId;
  if (!sectionId || !isConfigurationSectionId(sectionId)) {
    return NextResponse.json({ error: "sectionId invalide" }, { status: 400 });
  }
  if (!body.params || typeof body.params !== "object") {
    return NextResponse.json({ error: "params requis" }, { status: 400 });
  }

  let params = { ...body.params };
  if (sectionId === "departements" && !params.departments?.length) {
    const departements = await getDepartements();
    params = { departments: departementLabels(departements, true) };
  }

  try {
    await saveConfigurationSection(sectionId, params, body.updatedBy ?? null);
    const bundle = await getSettingsBundle();
    return NextResponse.json({
      sectionId,
      titreConfig: configurationTitreForSection(sectionId),
      ...bundle,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Enregistre toutes les sections (bouton Enregistrer global). */
export async function POST(request: Request) {
  let body: { settings?: Partial<AppSettings>; updatedBy?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const current = await getSettings();
    const merged = { ...current, ...body.settings } as AppSettings;
    await saveAllConfigurationSections(merged, body.updatedBy ?? null);
    const bundle = await getSettingsBundle();
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
