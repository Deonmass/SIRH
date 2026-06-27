import { buildPayslipSummaryLines } from "@/lib/payroll-summary";
import {
  buildPayslipDetailLines,
  type PayslipHtmlLine,
} from "@/lib/payslip-detail-lines";
import { companyLogoDisplaySrc } from "@/lib/company-logo";
import { normalizePayslipTemplate } from "@/lib/payslip-template-default";
import type {
  AppSettings,
  PayslipData,
  PayslipTemplateConfig,
} from "@/lib/types";

function fmt(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}\u00a0${currency}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PayslipRenderOptions = {
  /** Origine du site (ex. https://app.local) pour afficher le logo dans iframe srcDoc */
  assetBaseUrl?: string;
};

function buildStyles(t: PayslipTemplateConfig): string {
  const compact = t.layout === "compact";
  const minimal = t.layout === "minimal";
  const modern = t.layout === "modern";
  const sectionPad = compact ? "10px 16px" : minimal ? "12px 20px" : "16px 24px";
  const headerPad = compact ? "14px 16px" : "20px 24px";

  let headerBg = t.headerBg;
  let headerColor = t.headerTextColor;
  if (t.headerStyle === "accent") {
    headerBg = t.accentColor;
    headerColor = "#ffffff";
  } else if (t.headerStyle === "light") {
    headerColor = t.accentColor;
  }

  const articleBorder =
    minimal ? "none" : modern ? `1px solid ${t.borderColor}` : `2px solid ${t.borderColor}`;

  const articleShadow = modern ? "0 4px 24px rgba(15,23,42,0.08)" : "none";

  let tableExtra = "";
  if (t.tableStyle === "striped") {
    tableExtra = `tbody tr:nth-child(even) td { background: #f8fafc; }`;
  } else if (t.tableStyle === "bordered") {
    tableExtra = `
      table { border: 1px solid ${t.borderColor}; }
      td { padding: 6px 8px; border: 1px solid ${t.borderColor}; }
    `;
  }

  const modernAccent = modern
    ? `.bp header { border-top: 4px solid ${t.accentColor}; }`
    : "";

  return `
    * { box-sizing: border-box; }
    body {
      font-family: ${t.fontFamily};
      margin: 0;
      padding: ${compact ? 16 : 24}px;
      color: ${t.textColor};
      font-size: ${t.fontSize}px;
      background: ${minimal ? "#f1f5f9" : t.bodyBg};
    }
    .bp {
      max-width: ${t.maxWidth}px;
      margin: 0 auto;
      border: ${articleBorder};
      border-radius: ${t.borderRadius}px;
      overflow: hidden;
      background: ${t.bodyBg};
      box-shadow: ${articleShadow};
    }
    header {
      background: ${headerBg};
      color: ${headerColor};
      padding: ${headerPad};
      ${t.headerStyle === "light" ? `border-bottom: 2px solid ${t.accentColor};` : ""}
    }
    ${modernAccent}
    header h1 {
      margin: 0;
      font-size: ${compact ? 15 : 18}px;
      letter-spacing: 0.05em;
      color: ${headerColor};
    }
    header .co { margin-top: 8px; font-size: ${compact ? 10 : 12}px; opacity: 0.92; }
    .header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }
    .header-titles { min-width: 0; flex: 1; }
    .company-logo {
      height: ${compact ? 40 : 52}px;
      width: auto;
      max-width: ${compact ? 96 : 128}px;
      object-fit: contain;
      flex-shrink: 0;
      background: transparent;
      border: none;
      padding: 0;
      display: block;
    }
    header .period {
      flex-shrink: 0;
      text-align: right;
      font-size: ${compact ? 10 : 12}px;
    }
    .employee {
      padding: ${sectionPad};
      background: ${minimal ? t.bodyBg : "#f8fafc"};
      border-bottom: 1px solid ${t.borderColor};
    }
    .employee h2 { margin: 0 0 4px; font-size: ${compact ? 14 : 16}px; color: ${t.textColor}; }
    .employee p { margin: 0; color: #64748b; font-size: ${compact ? 10 : 12}px; word-spacing: 0.05em; }
    section { padding: ${sectionPad}; }
    section h3 {
      margin: 0 0 ${compact ? 8 : 12}px;
      font-size: ${compact ? 10 : 11}px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${t.accentColor};
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${compact ? "6px 12px" : "8px 16px"};
      font-size: ${compact ? 10 : 12}px;
    }
    .grid span { display: block; color: #64748b; font-size: ${compact ? 9 : 10}px; margin-bottom: 2px; }
    .grid strong { display: block; font-weight: 600; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td {
      padding: ${compact ? "6px 4px" : "8px 6px"};
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      line-height: 1.45;
      word-wrap: break-word;
    }
    td.label { width: 62%; padding-right: 12px; }
    td.num { width: 38%; text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; padding-left: 8px; }
    td .formula {
      display: block;
      margin-top: 3px;
      font-size: ${compact ? 8 : 9}px;
      color: #94a3b8;
      font-weight: 400;
      line-height: 1.35;
    }
    tr.section td {
      font-weight: 700;
      font-size: ${compact ? 9 : 10}px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${t.accentColor};
      border-bottom: 1px solid ${t.borderColor};
      padding-top: ${compact ? 8 : 12}px;
      background: #f8fafc;
    }
    tr.info td.label { color: #475569; }
    tr.info td.num { color: #64748b; font-weight: 500; }
    tr.total td {
      font-weight: 700;
      border-top: 2px solid ${t.accentColor};
      border-bottom: none;
      padding-top: ${compact ? 6 : 10}px;
      color: ${t.accentColor};
    }
    tr.deduction td.num { color: #b45309; }
    .cnss { padding: 0 ${compact ? 16 : 24}px 12px; font-size: ${compact ? 10 : 11}px; color: #64748b; line-height: 1.5; word-spacing: 0.04em; }
    footer {
      padding: ${compact ? "10px 16px" : "12px 24px"};
      background: ${minimal ? "#f8fafc" : "#f1f5f9"};
      font-size: ${compact ? 9 : 10}px;
      color: #64748b;
      border-top: 1px solid ${t.borderColor};
    }
    ${tableExtra}
    @media print { body { padding: 0; background: #fff; } .bp { border: none; box-shadow: none; } }
  `;
}

export function renderPayslipHtml(
  data: PayslipData,
  templateInput: PayslipTemplateConfig,
  settings: AppSettings,
  options?: PayslipRenderOptions
): string {
  const template = normalizePayslipTemplate(templateInput);
  const cur = data.currency;
  const s = data.situation;
  const p = data.payroll;

  const summaryLines: PayslipHtmlLine[] = data.payrollConfig
    ? buildPayslipDetailLines(p, data.payrollConfig, settings)
    : buildPayslipSummaryLines(p).map((line) => ({ ...line }));

  const logoUrl =
    template.showCompanyLogo && settings.companyLogoUrl
      ? companyLogoDisplaySrc(settings.companyLogoUrl, options?.assetBaseUrl)
      : null;
  const logoBlock = logoUrl
    ? `<img class="company-logo" src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(settings.companyName)}" />`
    : "";

  const situationBlock = template.showSituation
    ? `
    <section class="situation">
      <h3>Situation du salarié</h3>
      <div class="grid">
        <div><span>Matricule</span><strong>${s.matricule}</strong></div>
        <div><span>Poste</span><strong>${s.position}</strong></div>
        <div><span>Département</span><strong>${s.department}</strong></div>
        <div><span>Grade</span><strong>${s.grade}</strong></div>
        <div><span>Contrat</span><strong>${s.contractType}</strong></div>
        <div><span>Personnes à charge</span><strong>${s.dependents}</strong></div>
        <div><span>Congés restants</span><strong>${s.leaveRemaining} j</strong></div>
        <div><span>Statut</span><strong>${s.status}</strong></div>
        ${s.cnssNumber ? `<div><span>N° CNSS</span><strong>${s.cnssNumber}</strong></div>` : ""}
        ${template.showPointage && s.pointageSummary ? `<div><span>Pointage</span><strong>${s.pointageSummary}</strong></div>` : ""}
      </div>
    </section>`
    : "";

  const cnssBlock = template.showCnssBlock
    ? `<p class="cnss">Base CNSS\u00a0: ${fmt(p.baseCnss ?? p.baseSalary, cur)} \u00b7 CNSS salarié\u00a0: ${fmt(p.cnssEmployee, cur)} \u00b7 IRPP (DGI)\u00a0: ${fmt(p.ipr, cur)}</p>`
    : "";

  const rows = summaryLines
    .map((line) => {
      const cls =
        line.variant === "section"
          ? "section"
          : line.variant === "total"
            ? "total"
            : line.variant === "deduction"
              ? "deduction"
              : line.variant === "info"
                ? "info"
                : "";
      const formulaHtml = line.formula
        ? `<span class="formula">${escapeHtml(line.formula)}</span>`
        : "";
      const valueCell =
        line.hideValue || (line.variant === "section" && line.value === 0)
          ? ""
          : fmt(Math.abs(line.value), cur);
      return `<tr class="${cls}"><td class="label">${escapeHtml(line.label)}${formulaHtml}</td><td class="num">${valueCell}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Bulletin ${data.periodLabel} — ${s.fullName}</title>
  <style>${buildStyles(template)}</style>
</head>
<body>
  <article class="bp">
    <header>
      <div class="header-top">
        <div class="header-brand">
          ${logoBlock}
          <div class="header-titles">
            <h1>${escapeHtml(template.title)}</h1>
            <div class="co">${escapeHtml(settings.companyName)}${settings.companyAddress ? ` · ${escapeHtml(settings.companyAddress)}` : ""}</div>
          </div>
        </div>
        <div class="period">Période<br/><strong>${escapeHtml(data.periodLabel)}</strong></div>
      </div>
    </header>
    <div class="employee">
      <h2>${escapeHtml(s.fullName)}</h2>
      <p>${escapeHtml(s.matricule)} \u00b7 ${escapeHtml(s.department)}</p>
    </div>
    ${situationBlock}
    <section>
      <h3>Détail de la rémunération</h3>
      <table>${rows}</table>
    </section>
    ${cnssBlock}
    <footer>${template.footerNote}</footer>
  </article>
</body>
</html>`;
}
