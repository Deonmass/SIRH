import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { captureElementToCanvas } from "@/lib/html-capture";
import { getDeptHead } from "@/lib/position-hierarchy";
import { statusLabel } from "@/lib/postes";
import type { Employee, JobPosition } from "@/lib/types";

function employeeDisplayName(employee: Employee | null | undefined): string {
  if (!employee) return "—";
  return [employee.prenom, employee.postNom, employee.nom].filter(Boolean).join(" ");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s-àâäéèêëïîôùûüç]/gi, "").replace(/\s+/g, "_").slice(0, 80);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ChartSlice = { label: string; value: number; color: string };

function drawStatsChart(
  slices: ChartSlice[],
  title: string,
  width = 640,
  height = 360
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText(title, 24, 32);

  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = 200;
  const cy = height / 2 + 16;
  const radius = 110;
  let start = -Math.PI / 2;

  if (total === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Aucune donnée", cx - 40, cy);
    return canvas;
  }

  for (const slice of slices) {
    if (slice.value <= 0) continue;
    const angle = (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    start += angle;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 6);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("postes", cx, cy + 22);
  ctx.textAlign = "left";

  let ly = 72;
  const lx = 360;
  ctx.font = "13px system-ui, sans-serif";
  for (const slice of slices) {
    ctx.fillStyle = slice.color;
    ctx.fillRect(lx, ly - 10, 14, 14);
    ctx.fillStyle = "#e2e8f0";
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    ctx.fillText(`${slice.label} — ${slice.value} (${pct}%)`, lx + 22, ly);
    ly += 28;
  }

  return canvas;
}

function buildTableRows(
  department: string,
  positions: JobPosition[],
  empById: Map<string, Employee>
) {
  const head = getDeptHead(positions);
  const byId = new Map(positions.map((p) => [p.id, p]));
  const sorted = [
    head,
    ...positions
      .filter((p) => p.id !== head.id)
      .sort((a, b) => a.title.localeCompare(b.title, "fr")),
  ];

  return sorted.map((pos) => {
    const employee = pos.employeeId ? empById.get(pos.employeeId) : null;
    const reportsTo = pos.reportsToId ? byId.get(pos.reportsToId) : null;
    return {
      code: pos.code,
      title: pos.title,
      grade: pos.grade,
      department,
      status: statusLabel(pos.status),
      occupation: employee ? "Occupé" : "Vacant",
      agent: employeeDisplayName(employee),
      matricule: employee?.matricule ?? "—",
      role: pos.id === head.id ? "Responsable" : "Subordonné",
      reportsTo: reportsTo?.title ?? "—",
    };
  });
}

export async function exportOrganigramExcel(
  department: string,
  positions: JobPosition[],
  empById: Map<string, Employee>
) {
  const head = getDeptHead(positions);
  const filled = positions.filter((p) => p.employeeId).length;
  const vacant = positions.filter((p) => !p.employeeId).length;
  const draft = positions.filter((p) => p.status === "draft").length;
  const subordinateCount = positions.filter((p) => p.id !== head.id).length;

  const rows = buildTableRows(department, positions, empById);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIRH RDC";
  workbook.created = new Date();

  const tableSheet = workbook.addWorksheet("Tableau", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const headers = [
    "Code",
    "Intitulé",
    "Grade",
    "Département",
    "Statut fiche",
    "Occupation",
    "Agent",
    "Matricule",
    "Rôle",
    "Rapporte à",
  ];
  tableSheet.addRow(headers);
  const headerRow = tableSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0EA5E9" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (const row of rows) {
    tableSheet.addRow([
      row.code,
      row.title,
      row.grade,
      row.department,
      row.status,
      row.occupation,
      row.agent,
      row.matricule,
      row.role,
      row.reportsTo,
    ]);
  }

  tableSheet.columns = [
    { width: 18 },
    { width: 32 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 28 },
    { width: 14 },
    { width: 14 },
    { width: 28 },
  ];

  for (let r = 2; r <= tableSheet.rowCount; r++) {
    const occ = tableSheet.getCell(r, 6).value;
    if (occ === "Vacant") {
      tableSheet.getRow(r).getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
    } else if (occ === "Occupé") {
      tableSheet.getRow(r).getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD1FAE5" },
      };
    }
  }

  const chartSheet = workbook.addWorksheet("Graphique");
  chartSheet.mergeCells("A1", "D1");
  chartSheet.getCell("A1").value = `Organigramme — ${department}`;
  chartSheet.getCell("A1").font = { bold: true, size: 14 };

  const stats: { label: string; value: number }[] = [
    { label: "Postes", value: positions.length },
    { label: "Occupés", value: filled },
    { label: "Vacants", value: vacant },
    ...(draft > 0 ? [{ label: "Brouillons", value: draft }] : []),
    { label: "Subordonnés", value: subordinateCount },
  ];

  chartSheet.getCell("A3").value = "Indicateur";
  chartSheet.getCell("B3").value = "Valeur";
  chartSheet.getRow(3).font = { bold: true };
  stats.forEach((s, i) => {
    chartSheet.getCell(`A${4 + i}`).value = s.label;
    chartSheet.getCell(`B${4 + i}`).value = s.value;
  });

  const slices: ChartSlice[] = [
    { label: "Occupés", value: filled, color: "#10b981" },
    { label: "Vacants", value: vacant, color: "#f59e0b" },
    ...(draft > 0 ? [{ label: "Brouillons", value: draft, color: "#94a3b8" }] : []),
  ].filter((s) => s.value > 0);

  const chartCanvas = drawStatsChart(
    slices.length ? slices : [{ label: "Postes", value: positions.length, color: "#0ea5e9" }],
    `Répartition — ${department}`
  );
  const chartBase64 = chartCanvas.toDataURL("image/png").split(",")[1];
  const imageId = workbook.addImage({
    base64: chartBase64,
    extension: "png",
  });
  chartSheet.addImage(imageId, {
    tl: { col: 0, row: 8 },
    ext: { width: 520, height: 292 },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `organigramme_${sanitizeFileName(department)}.xlsx`);
}

export async function exportOrganigramPdf(element: HTMLElement, department: string) {
  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    theme: "light",
    backgroundColor: "#eef2f7",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = 297;
  const pageHeight = 210;

  pdf.setFillColor(238, 242, 247);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  let drawWidth = pageWidth;
  let drawHeight = (canvas.height * drawWidth) / canvas.width;
  let x = 0;
  let y = 0;

  if (drawHeight > pageHeight) {
    drawHeight = pageHeight;
    drawWidth = (canvas.width * drawHeight) / canvas.height;
    x = (pageWidth - drawWidth) / 2;
  } else {
    y = pageHeight - drawHeight;
  }

  pdf.addImage(imgData, "PNG", x, y, drawWidth, drawHeight);
  pdf.save(`organigramme_${sanitizeFileName(department)}.pdf`);
}
