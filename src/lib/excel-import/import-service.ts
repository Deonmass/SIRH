import {
  createDefaultDocuments,
  createDefaultWorkflow,
} from "@/lib/constants";
import {
  normalizeEmployeImportRow,
  normalizePosteImportRow,
  parseImportContract,
  parseImportCurrency,
  parseImportDate,
  parseImportGrade,
  parseImportMaritalStatus,
  parseImportSexe,
  parseImportEmployeeStatus,
} from "@/lib/excel-import/normalize-import";
import { seedCoordinatesHistoryFromEmployee } from "@/lib/repositories/employes/coordonnees-json";
import {
  createEmployee,
  createPosition,
  getEmployees,
  getPositions,
  getSettings,
  saveEmployee,
  savePosition,
} from "@/lib/store";
import { emptyJobPosition } from "@/lib/postes";
import type { Employee } from "@/lib/types";
import type { EmployeImportRow, PosteImportRow } from "./types";

export async function importEmployeRow(raw: EmployeImportRow): Promise<Employee> {
  const row = normalizeEmployeImportRow(raw);

  if (!row.prenom?.trim() || !row.nom?.trim()) {
    throw new Error("Prénom et nom obligatoires.");
  }

  const employees = await getEmployees();
  const matricule = row.matricule?.trim();
  if (matricule && employees.some((e) => e.matricule === matricule)) {
    throw new Error(`Matricule « ${matricule} » déjà utilisé.`);
  }

  const maritalStatus = parseImportMaritalStatus(row.statutMatrimonial) ?? "celibataire";
  const grade = parseImportGrade(row.grade) ?? "Agent";
  const contractType = parseImportContract(row.typeContrat) ?? "CDI";
  const status = row.statut ? parseImportEmployeeStatus(row.statut) ?? "candidat" : "candidat";
  const currency = parseImportCurrency(row.devise) ?? "USD";
  const category = row.categorie ?? 3;
  const baseSalary = row.salaireBase ?? 0;

  let employee = await createEmployee({
    matricule,
    nom: row.nom.trim(),
    prenom: row.prenom.trim(),
    postNom: row.postNom?.trim() || undefined,
    sexe: parseImportSexe(row.sexe) ?? "M",
    dateNaissance: parseImportDate(row.dateNaissance),
    lieuNaissance: row.lieuNaissance?.trim() || undefined,
    nationalite: row.nationalite?.trim() || "Congolaise (RDC)",
    maritalStatus,
    adresse: row.adresse?.trim() || undefined,
    email: row.email?.trim() || undefined,
    telephone: row.telephone?.trim() || undefined,
    numeroCnss: row.numeroCnss?.trim() || undefined,
    numeroOnem: row.numeroOnem?.trim() || undefined,
    grade,
    status,
    employeeKind: "interne",
    subcontractorId: null,
    journalierProviderId: null,
    contractType,
    department: row.departement?.trim() || "",
    position: row.intitulePoste?.trim() || "",
    category,
    hireDate: parseImportDate(row.dateEmbauche),
    childrenCount: 0,
    salary: {
      baseSalary,
      currency,
      category,
      allowances: [],
    },
    workflow: createDefaultWorkflow(0),
    documents: createDefaultDocuments(),
    family: [],
    movements: [],
    leaveBalance: { acquired: 0, taken: 0, remaining: 0 },
    warningsCount: 0,
    overtime: { hours130: 0, hours160: 0, hours200: 0 },
    disciplinaryRecords: [],
  } as Omit<Employee, "id" | "createdAt" | "updatedAt" | "matricule"> & {
    matricule?: string;
  });

  const coordsHistory = seedCoordinatesHistoryFromEmployee(employee);
  if (coordsHistory.length) {
    employee = await saveEmployee({
      ...employee,
      coordinatesHistory: coordsHistory,
    });
  }

  const codePoste = row.codePoste?.trim();
  if (codePoste) {
    const positions = await getPositions();
    const linked = positions.find((p) => p.code === codePoste);
    if (linked) {
      employee = await saveEmployee({
        ...employee,
        positionId: linked.id,
        position: linked.title,
        department: linked.department,
        grade: linked.grade,
        contractType: linked.contractType,
      });
      if (!linked.employeeId) {
        await savePosition({
          ...linked,
          employeeId: employee.id,
          status: linked.status === "draft" ? "active" : linked.status,
        });
      }
    }
  }

  return employee;
}

export async function importPosteRow(raw: PosteImportRow) {
  const row = normalizePosteImportRow(raw);

  if (!row.intitule?.trim() || !row.departement?.trim()) {
    throw new Error("Intitulé et département obligatoires.");
  }

  const positions = await getPositions();
  const code = row.code?.trim();
  if (code && positions.some((p) => p.code === code)) {
    throw new Error(`Code poste « ${code} » déjà utilisé.`);
  }

  const settings = await getSettings();
  const base = emptyJobPosition(settings);
  const grade = parseImportGrade(row.grade) ?? base.grade;
  const contractType = parseImportContract(row.typeContrat) ?? base.contractType;
  const currency = parseImportCurrency(row.devise) ?? base.payroll.currency;
  const baseSalary = row.salaireBase ?? base.payroll.baseSalary;

  let employeeId: string | null = null;
  const matricule = row.matriculeEmploye?.trim();
  if (matricule) {
    const employees = await getEmployees();
    const emp = employees.find((e) => e.matricule === matricule);
    if (!emp) throw new Error(`Matricule employé « ${matricule} » introuvable.`);
    employeeId = emp.id;
  }

  const payroll = {
    ...base.payroll,
    baseSalary,
    currency,
    category: base.payroll.smigGrade ?? base.payroll.category,
  };

  const position = await createPosition({
    ...base,
    code,
    title: row.intitule.trim(),
    department: row.departement.trim(),
    grade,
    contractType,
    location: row.lieu?.trim() || base.location,
    headcount: row.effectif && row.effectif > 0 ? Math.floor(row.effectif) : 1,
    description: row.description?.trim() || "",
    missions: row.missions?.trim() || "",
    requirements: row.exigences?.trim() || "",
    competencies: row.competences?.trim() || "",
    kpi: row.kpi?.trim() || "",
    employeeId,
    status: employeeId ? "active" : "vacant",
    payroll,
  });

  if (employeeId) {
    const employees = await getEmployees();
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      await saveEmployee({
        ...emp,
        positionId: position.id,
        position: position.title,
        department: position.department,
        grade: position.grade,
        contractType: position.contractType,
      });
    }
  }

  return position;
}
