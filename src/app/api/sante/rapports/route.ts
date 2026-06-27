import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-auth";
import { employeeDisplayName } from "@/lib/extra-costs";
import { loadEntrepriseSettingsForReport } from "@/lib/reports/pdf-branding";
import { buildSanteReportExcel } from "@/lib/reports/sante/export-sante-excel";
import { listHopitalVisites } from "@/lib/repositories/hopital-visite";
import { buildSanteDashboard } from "@/lib/sante-dashboard";
import { getEmployees } from "@/lib/store";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";

function periodLabel(year: number, month?: number): string {
  if (month != null && month >= 1 && month <= 12) {
    const label = MOIS_FR_OPTIONS.find((m) => m.value === month)?.label ?? String(month);
    return `${label} ${year}`;
  }
  return `Année ${year}`;
}

export async function GET(request: Request) {
  const auth = await requirePermission("rapports", "export");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "excel";
  if (format !== "excel") {
    return NextResponse.json(
      { error: "Seul l'export Excel est disponible pour les rapports Santé" },
      { status: 400 }
    );
  }

  const now = new Date();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const monthParam = url.searchParams.get("month");
  const month = monthParam ? Number(monthParam) : undefined;

  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }
  if (month != null && (Number.isNaN(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: "Mois invalide" }, { status: 400 });
  }

  try {
    const [visites, entreprise, employees] = await Promise.all([
      listHopitalVisites(),
      loadEntrepriseSettingsForReport(),
      getEmployees(),
    ]);

    const employeeByMatricule = new Map(employees.map((e) => [e.matricule, e]));

    const filters = { year, month };
    const scoped = visites
      .filter((v) => {
        if (!v.dateVisite) return false;
        const [y, m] = v.dateVisite.split("-").map(Number);
        if (y !== year) return false;
        if (month != null && m !== month) return false;
        return true;
      })
      .map((v) => {
        const emp = v.matriculeAgent ? employeeByMatricule.get(v.matriculeAgent) : undefined;
        return {
          ...v,
          employeeName: emp ? employeeDisplayName(emp) : undefined,
        };
      });

    const dashboard = buildSanteDashboard(visites, filters);
    const buffer = await buildSanteReportExcel({
      companyName: entreprise.companyName,
      periodLabel: periodLabel(year, month),
      dashboard,
      visites: scoped,
    });

    const suffix = month != null ? `${year}-${String(month).padStart(2, "0")}` : String(year);
    const filename = `rapport_sante_${suffix}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
