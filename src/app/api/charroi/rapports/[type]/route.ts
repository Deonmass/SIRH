import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-auth";
import { buildCharroiReportExcel } from "@/lib/reports/charroi/export-charroi-excel";
import { buildCharroiReportPdf } from "@/lib/reports/charroi/export-charroi-pdf";
import { buildCharroiReportPptx } from "@/lib/reports/charroi/export-charroi-pptx";
import { loadCharroiReportData } from "@/lib/reports/charroi/load-charroi-report-data";
import { charroiReportFilename } from "@/lib/reports/charroi/period";
import type { CharroiReportType } from "@/lib/reports/charroi/types";
import type { ReportFormat, ReportType } from "@/lib/reports/types";

const VALID_TYPES = new Set<ReportType>(["mensuel", "semestriel", "annuel", "complet"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await requirePermission("charroi.rapports", "export");
  if (!auth.ok) return auth.response;

  const { type: rawType } = await params;
  if (!VALID_TYPES.has(rawType as ReportType)) {
    return NextResponse.json({ error: "Type de rapport invalide" }, { status: 400 });
  }
  const type = rawType as CharroiReportType;

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "excel") as ReportFormat;
  if (format !== "excel" && format !== "pdf" && format !== "pptx") {
    return NextResponse.json({ error: "format doit être excel, pdf ou pptx" }, { status: 400 });
  }

  try {
    const data = await loadCharroiReportData(
      type,
      {
        year: url.searchParams.get("year") ?? undefined,
        month: url.searchParams.get("month") ?? undefined,
        semester: url.searchParams.get("semester") ?? undefined,
      },
      { appOrigin: url.origin }
    );

    const filename = charroiReportFilename(type, data.period, format === "excel" ? "xlsx" : format === "pptx" ? "pptx" : "pdf");

    if (format === "excel") {
      const buffer = await buildCharroiReportExcel(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pptx") {
      const buffer = await buildCharroiReportPptx(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const buffer = buildCharroiReportPdf(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[api/charroi/rapports]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
