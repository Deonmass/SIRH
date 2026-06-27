import { listCharroiVehicules } from "@/lib/repositories/charroi/charroi.repository";
import { listCoursesVehicule } from "@/lib/repositories/courses-vehicule";
import { listEntretienSuivi } from "@/lib/repositories/vehicules/entretien-suivi.repository";
import { listVehicules } from "@/lib/repositories/vehicules";
import { loadEntrepriseSettingsForReport, resolveReportBranding } from "../pdf-branding";
import { buildCharroiReport } from "./build-charroi-report";
import { parseCharroiReportPeriod } from "./period";
import type { CharroiReportData, CharroiReportType } from "./types";

export async function loadCharroiReportData(
  type: CharroiReportType,
  query: { year?: string; month?: string; semester?: string },
  options?: { appOrigin?: string; companyName?: string }
): Promise<CharroiReportData> {
  const period = parseCharroiReportPeriod(type, query);
  const [charroiVehicules, courses, entretien, vehiculesRaw, entrepriseSettings] =
    await Promise.all([
      listCharroiVehicules(),
      listCoursesVehicule(),
      listEntretienSuivi(),
      listVehicules(),
      loadEntrepriseSettingsForReport(),
    ]);

  const branding = await resolveReportBranding(entrepriseSettings, {
    appOrigin: options?.appOrigin,
  });

  const vehicules = charroiVehicules.map((v) => ({
    id: v.id,
    immatriculation: v.immatriculation,
    marque: v.marque?.trim() || "Non renseigné",
    type: v.modele?.trim() || "Non renseigné",
    statut: v.statut,
    kmActuel: v.kmActuel,
  }));

  return buildCharroiReport(
    {
      vehicules,
      courses,
      entretienItems: entretien.items,
      vehiculesRaw,
    },
    period,
    {
      companyName: options?.companyName ?? entrepriseSettings.companyName,
      branding,
    }
  );
}
