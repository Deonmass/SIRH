import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { moisAnneeLabelFr } from "@/lib/paie-utils";
import type {
  AppSettings,
  Employee,
  PaiePayrollResultSnapshot,
  PaieRecord,
  PayrollResult,
  PayslipData,
} from "@/lib/types";

function snapshotToPayrollResult(s: PaiePayrollResultSnapshot): PayrollResult {
  return {
    baseSalary: s.baseSalary,
    allowancesTotal: 0,
    grossSalary: s.grossSalary,
    cnssEmployee: s.cnssEmployee,
    ipr: s.ipr,
    netSalary: s.netSalary,
    housingAllowance: s.housingAllowance,
    transportAllowance: s.transportAllowance,
    overtimePay: s.overtimePay,
    cnssEmployer: s.cnssEmployer,
    totalEmployerCost: s.totalEmployerCost,
    inpp: s.inpp,
    onem: s.onem,
    taxableBase: s.baseSalary,
    otherDeductions: 0,
    totalLegalDeductions: s.totalLegalDeductions,
    familyAllowanceEstimate: 0,
    currency: s.currency,
  };
}

export function paieRecordToPayslipData(employee: Employee, record: PaieRecord): PayslipData {
  const cfg = record.payrollConfig;
  const s = record.synthese;
  return {
    id: record.id,
    employeeId: employee.id,
    period: record.moisAnnee,
    periodLabel: moisAnneeLabelFr(record.moisAnnee),
    generatedAt: record.clotureLe ?? new Date().toISOString(),
    situation: {
      matricule: employee.matricule,
      fullName: [employee.prenom, employee.postNom, employee.nom].filter(Boolean).join(" "),
      department: employee.department,
      position: employee.position,
      grade: employee.grade,
      cnssNumber: employee.numeroCnss,
      contractType: employee.contractType,
      hireDate: employee.hireDate,
      dependents: employee.family.filter((m) => m.aCharge).length,
      leaveRemaining: employee.leaveBalance.remaining,
      status: employee.status,
      workMonthMode: employee.workMonthMode,
      pointageSummary: `P: ${cfg.daysPresent ?? 0} · M: ${cfg.daysSick ?? 0} · C: ${cfg.daysAnnualLeave ?? 0} · F: ${cfg.daysHoliday ?? 0} · HS: ${s.heures_sup_total ?? 0} h`,
    },
    payroll: snapshotToPayrollResult(record.payrollResult),
    currency: record.payrollResult.currency,
    payrollConfig: record.payrollConfig,
  };
}

async function renderPayslipHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Impossible de préparer l'export PDF");
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    setTimeout(resolve, 400);
  });

  const article = doc.querySelector(".bp") as HTMLElement | null;
  if (!article) {
    document.body.removeChild(iframe);
    throw new Error("Modèle bulletin introuvable");
  }

  try {
    return await html2canvas(article, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, newPage: boolean): void {
  if (newPage) pdf.addPage();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;

  let drawWidth = pageWidth - margin * 2;
  let drawHeight = (canvas.height * drawWidth) / canvas.width;
  let x = margin;
  let y = margin;

  if (drawHeight > pageHeight - margin * 2) {
    drawHeight = pageHeight - margin * 2;
    drawWidth = (canvas.width * drawHeight) / canvas.height;
    x = (pageWidth - drawWidth) / 2;
  }

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, drawWidth, drawHeight);
}

/** Génère un PDF A4 portrait à partir du HTML bulletin (renderPayslipHtml). */
export async function exportPayslipHtmlToPdf(html: string, filename: string): Promise<void> {
  const canvas = await renderPayslipHtmlToCanvas(html);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCanvasToPdf(pdf, canvas, false);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Plusieurs bulletins dans un seul PDF (une page par agent). */
export async function exportPayslipHtmlListToPdf(htmlList: string[], filename: string): Promise<void> {
  if (htmlList.length === 0) throw new Error("Aucun bulletin à exporter");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  for (let i = 0; i < htmlList.length; i++) {
    const canvas = await renderPayslipHtmlToCanvas(htmlList[i]!);
    addCanvasToPdf(pdf, canvas, i > 0);
  }
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export async function exportPaieRecordPdf(
  employee: Employee,
  record: PaieRecord,
  settings: AppSettings,
  renderHtml: (data: PayslipData, settings: AppSettings) => string
): Promise<void> {
  const data = paieRecordToPayslipData(employee, record);
  const html = renderHtml(data, settings);
  const filename = `bulletin-${record.moisAnnee}-${employee.matricule}.pdf`;
  await exportPayslipHtmlToPdf(html, filename);
}

export async function exportPaieRecordsPdfBatch(
  items: { employee: Employee; record: PaieRecord }[],
  settings: AppSettings,
  renderHtml: (data: PayslipData, settings: AppSettings) => string,
  filename: string
): Promise<void> {
  const htmlList = items.map(({ employee, record }) =>
    renderHtml(paieRecordToPayslipData(employee, record), settings)
  );
  await exportPayslipHtmlListToPdf(htmlList, filename);
}
