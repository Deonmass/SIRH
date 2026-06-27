import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-auth";
import { buildEmployeeAnnexRows } from "@/lib/reports/build-rh-report";
import { buildRhReportExcel } from "@/lib/reports/export-excel";
import { buildRhReportPdf } from "@/lib/reports/export-pdf";
import { buildRhReportPptx } from "@/lib/reports/export-pptx";
import { loadRhReportData } from "@/lib/reports/load-report-data";
import { reportFilename } from "@/lib/reports/period";
import type { ReportFormat, ReportType } from "@/lib/reports/types";
import { canViewSalaryAmounts } from "@/lib/permissions";
import { getEmployees } from "@/lib/store";

const VALID_TYPES = new Set<ReportType>(["mensuel", "semestriel", "annuel", "complet"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await requirePermission("rapports", "export");
  if (!auth.ok) return auth.response;

  const { type: rawType } = await params;
  if (!VALID_TYPES.has(rawType as ReportType)) {
    return NextResponse.json({ error: "Type de rapport invalide" }, { status: 400 });
  }
  const type = rawType as ReportType;

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "excel") as ReportFormat;
  if (format !== "excel" && format !== "pdf" && format !== "pptx") {
    return NextResponse.json({ error: "format doit être excel, pdf ou pptx" }, { status: 400 });
  }

  const hideSalaries = !canViewSalaryAmounts(auth.user.permissions, auth.user.username);

  try {
    const data = await loadRhReportData(type, {
      year: url.searchParams.get("year") ?? undefined,
      month: url.searchParams.get("month") ?? undefined,
      semester: url.searchParams.get("semester") ?? undefined,
    }, { hideSalaries, appOrigin: url.origin });

    const filename = reportFilename(type, {
      type,
      year: data.meta.year,
      month: data.meta.month,
      semester: data.meta.semester,
    }, format === "excel" ? "xlsx" : format === "pptx" ? "pptx" : "pdf");

    if (format === "excel") {
      let annex;
      if (type === "complet") {
        const employees = await getEmployees();
        annex = buildEmployeeAnnexRows(employees, hideSalaries);
      }
      const buffer = await buildRhReportExcel(data, annex);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pptx") {
      const buffer = await buildRhReportPptx(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const buffer = buildRhReportPdf(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[api/rapports]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
