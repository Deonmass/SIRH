import { MARITAL_LABELS } from "@/lib/employee-dossier";
import { parseEmployeStatut } from "@/lib/repositories/employes/employe-statut";
import type {
  ContractType,
  Currency,
  EmployeeStatus,
  Grade,
  MaritalStatus,
  Sexe,
} from "@/lib/types";
import type { EmployeImportRow, PosteImportRow } from "./types";
import type ExcelJS from "exceljs";

export function normalizeImportKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[\s./-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeText(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).replace(/\s+/g, " ").trim();
  return trimmed || undefined;
}

export function normalizePersonName(value?: string | null): string {
  return normalizeText(value) ?? "";
}

/** Date locale YYYY-MM-DD sans décalage UTC. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Numéro de série Excel → date (epoch 1899-12-30). */
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 600000) return null;
  const base = new Date(1899, 11, 30);
  const date = new Date(base);
  date.setDate(date.getDate() + Math.floor(serial));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Accepte : objet Date, série Excel, AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA,
 * JJ.MM.AAAA, avec ou sans heure, et mois en lettres courants.
 */
export function parseImportDate(value: ExcelJS.CellValue | string | undefined): string | undefined {
  if (value == null || value === "") return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : formatLocalDate(value);
  }

  if (typeof value === "number") {
    const fromSerial = excelSerialToDate(value);
    return fromSerial ? formatLocalDate(fromSerial) : undefined;
  }

  if (typeof value === "object") {
    if ("result" in value && value.result != null) {
      return parseImportDate(value.result as ExcelJS.CellValue);
    }
    if ("text" in value && value.text != null) {
      return parseImportDate(String(value.text));
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return parseImportDate(value.richText.map((p) => p.text).join(""));
    }
  }

  const raw = String(value).trim();
  if (!raw) return undefined;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const fr = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (fr) {
    let [, d, m, y] = fr;
    if (y.length === 2) y = Number(y) > 30 ? `19${y}` : `20${y}`;
    const day = Number(d);
    const month = Number(m);
    const year = Number(y);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const isoLike = raw.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (isoLike) {
    const [, y, m, d] = isoLike;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && /[a-zA-Z]/.test(raw)) {
    return formatLocalDate(parsed);
  }

  const asNumber = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (Number.isFinite(asNumber)) {
    const fromSerial = excelSerialToDate(asNumber);
    if (fromSerial) return formatLocalDate(fromSerial);
  }

  return undefined;
}

const SEXE_ALIASES: Record<string, Sexe> = {
  m: "M",
  h: "M",
  homme: "M",
  masculin: "M",
  male: "M",
  garcon: "M",
  f: "F",
  femme: "F",
  feminin: "F",
  feminine: "F",
  female: "F",
  fille: "F",
};

export function parseImportSexe(value?: string | null): Sexe | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  return SEXE_ALIASES[normalizeImportKey(text)] ?? undefined;
}

const MARITAL_ALIASES: Record<string, MaritalStatus> = (() => {
  const map: Record<string, MaritalStatus> = {
    celibataire: "celibataire",
    single: "celibataire",
    marie: "marie",
    mariee: "marie",
    maries: "marie",
    married: "marie",
    divorce: "divorce",
    divorcee: "divorce",
    divorces: "divorce",
    veuf: "veuf",
    veuve: "veuf",
    widowed: "veuf",
  };
  for (const [key, label] of Object.entries(MARITAL_LABELS)) {
    map[normalizeImportKey(label)] = key as MaritalStatus;
    map[normalizeImportKey(key)] = key as MaritalStatus;
  }
  return map;
})();

export function parseImportMaritalStatus(value?: string | null): MaritalStatus | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  return MARITAL_ALIASES[normalizeImportKey(text)];
}

export function parseImportCurrency(value?: string | null): Currency | undefined {
  const text = normalizeText(value)?.toUpperCase();
  if (!text) return undefined;
  const key = normalizeImportKey(text);
  if (key === "cdf" || key === "fc" || key === "franc" || key === "francs") return "CDF";
  if (key === "usd" || key === "dollar" || key === "dollars" || key === "$") return "USD";
  return undefined;
}

export function parseImportNumber(value: ExcelJS.CellValue | string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "object" && "result" in value && value.result != null) {
    return parseImportNumber(value.result as ExcelJS.CellValue);
  }

  let raw = String(value).trim().replace(/\s/g, "");
  if (!raw) return undefined;

  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizePhone(value?: string | null): string | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;

  let digits = text.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("243") && !digits.startsWith("+")) digits = `+${digits}`;
  if (/^0\d{9}$/.test(digits)) digits = `+243${digits.slice(1)}`;

  return digits || text;
}

export function normalizeEmail(value?: string | null): string | undefined {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) return undefined;
  return text.includes("@") ? text : undefined;
}

const GRADES: Grade[] = [
  "Direction",
  "Cadre supérieur",
  "Cadre",
  "Agent maîtrise",
  "Agent",
  "Ouvrier",
];

const CONTRACTS: ContractType[] = ["CDI", "CDD", "apprentissage", "stage", "consultant"];

export function parseImportGrade(value?: string | null): Grade | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const key = normalizeImportKey(text);
  const exact = GRADES.find((g) => normalizeImportKey(g) === key);
  if (exact) return exact;
  if (key.includes("direction")) return "Direction";
  if (key.includes("cadre_superieur") || key.includes("cadre_sup")) return "Cadre supérieur";
  if (key.includes("cadre")) return "Cadre";
  if (key.includes("maitrise")) return "Agent maîtrise";
  if (key.includes("ouvrier")) return "Ouvrier";
  if (key.includes("agent")) return "Agent";
  return undefined;
}

export function parseImportContract(value?: string | null): ContractType | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const key = normalizeImportKey(text);
  const hit = CONTRACTS.find((c) => normalizeImportKey(c) === key);
  if (hit) return hit;
  if (key.includes("cdi")) return "CDI";
  if (key.includes("cdd")) return "CDD";
  if (key.includes("apprent")) return "apprentissage";
  if (key.includes("stage")) return "stage";
  if (key.includes("consult")) return "consultant";
  return undefined;
}

export function parseImportEmployeeStatus(value?: string | null): EmployeeStatus | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const parsed = parseEmployeStatut(text);
  return parsed;
}

export function normalizeEmployeImportRow(row: EmployeImportRow): EmployeImportRow {
  return {
    ...row,
    matricule: normalizeText(row.matricule),
    prenom: normalizePersonName(row.prenom),
    nom: normalizePersonName(row.nom),
    postNom: normalizeText(row.postNom),
    sexe: parseImportSexe(row.sexe),
    dateNaissance: parseImportDate(row.dateNaissance),
    lieuNaissance: normalizeText(row.lieuNaissance),
    nationalite: normalizeText(row.nationalite),
    statutMatrimonial: parseImportMaritalStatus(row.statutMatrimonial),
    adresse: normalizeText(row.adresse),
    email: normalizeEmail(row.email),
    telephone: normalizePhone(row.telephone),
    grade: parseImportGrade(row.grade),
    departement: normalizeText(row.departement),
    intitulePoste: normalizeText(row.intitulePoste),
    typeContrat: parseImportContract(row.typeContrat),
    statut: parseImportEmployeeStatus(row.statut),
    dateEmbauche: parseImportDate(row.dateEmbauche),
    categorie: row.categorie,
    salaireBase: row.salaireBase,
    devise: parseImportCurrency(row.devise),
    numeroCnss: normalizeText(row.numeroCnss),
    numeroOnem: normalizeText(row.numeroOnem),
    codePoste: normalizeText(row.codePoste),
  };
}

export function normalizePosteImportRow(row: PosteImportRow): PosteImportRow {
  return {
    ...row,
    code: normalizeText(row.code),
    intitule: normalizePersonName(row.intitule),
    departement: normalizeText(row.departement) ?? "",
    grade: parseImportGrade(row.grade) ?? normalizeText(row.grade),
    typeContrat: parseImportContract(row.typeContrat) ?? normalizeText(row.typeContrat),
    lieu: normalizeText(row.lieu),
    effectif: row.effectif ?? parseImportNumber(row.effectif as unknown as string),
    description: normalizeText(row.description),
    missions: normalizeText(row.missions),
    exigences: normalizeText(row.exigences),
    competences: normalizeText(row.competences),
    kpi: normalizeText(row.kpi),
    matriculeEmploye: normalizeText(row.matriculeEmploye),
    salaireBase: row.salaireBase ?? parseImportNumber(row.salaireBase as unknown as string),
    devise: parseImportCurrency(row.devise) ?? normalizeText(row.devise),
  };
}
