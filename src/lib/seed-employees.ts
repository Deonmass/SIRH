import { v4 as uuidv4 } from "uuid";
import { createDefaultDocuments, createDefaultWorkflow } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_DEPARTMENTS, DEFAULT_GRADES } from "./default-settings";
import type {
  Employee,
  EmployeeStatus,
  Grade,
  MaritalStatus,
  Sexe,
} from "./types";

const NOMS = [
  "Kabila", "Mukendi", "Tshilombo", "Ilunga", "Mwamba", "Kasongo", "Mutombo",
  "Ngoy", "Kalala", "Banza", "Mbuyi", "Kabasele", "Luboya", "Mpiana", "Nsimba",
  "Kapinga", "Mwanza", "Kabongo", "Tshibanda", "Kazadi",
];
const PRENOMS_M = [
  "Patrick", "Jean", "Joseph", "Pierre", "André", "Paul", "David", "Emmanuel",
  "Moïse", "Daniel", "Samuel", "Michel", "François", "Albert", "Christian",
];
const PRENOMS_F = [
  "Marie", "Grace", "Amina", "Chantal", "Rachel", "Esther", "Sarah", "Julie",
  "Nathalie", "Brigitte", "Hélène", "Claudine", "Joséphine", "Thérèse", "Anne",
];
const POSTES = [
  "Comptable", "Commercial", "Technicien", "Assistant RH", "Développeur",
  "Chauffeur", "Magasinier", "Secrétaire", "Contrôleur", "Ingénieur",
  "Chef de projet", "Analyste", "Opérateur", "Superviseur", "Directeur adjoint",
];

const STATUSES: EmployeeStatus[] = [
  "actif", "actif", "actif", "actif", "actif", "actif", "actif", "actif",
  "essai", "essai", "essai", "candidat", "candidat", "pre_embauche",
  "conge", "conge", "suspendu", "preavis", "sorti", "licencie",
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function randomDate(startYear: number, endYear: number, seed: number): string {
  const y = startYear + (seed % (endYear - startYear + 1));
  const m = (seed % 12) + 1;
  const d = (seed % 28) + 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ageFromBirth(dateStr: string): number {
  const birth = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export function generateEmployees(count = 100): Employee[] {
  const employees: Employee[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    const sexe: Sexe = i % 3 === 0 ? "F" : "M";
    const prenom = sexe === "F" ? pick(PRENOMS_F, i) : pick(PRENOMS_M, i + 7);
    const nom = pick(NOMS, i * 3);
    const status = pick(STATUSES, i + 11);
    const category = (i % 7) + 1;
    const catInfo = DEFAULT_CATEGORIES.find((c) => c.value === category)!;
    const department = pick(DEFAULT_DEPARTMENTS, i);
    const grade = pick(DEFAULT_GRADES, i + 2) as Grade;
    const maritalStatus: MaritalStatus =
      i % 4 === 0 ? "celibataire" : i % 4 === 1 ? "marie" : i % 4 === 2 ? "divorce" : "veuf";
    const childrenCount = maritalStatus === "marie" ? (i % 4) : i % 2;
    const dateNaissance = randomDate(1970, 2002, i);
    const hireDate =
      status === "candidat" || status === "pre_embauche"
        ? undefined
        : randomDate(2018, 2025, i + 50);

    const receivedDocs: string[] = ["doc_cni", "doc_photo"];
    if (i % 3 !== 0) receivedDocs.push("doc_contrat", "doc_reglement");
    if (i % 4 === 0) receivedDocs.push("doc_cnss", "doc_numero_cnss");
    if (i % 5 === 0) receivedDocs.push("doc_onem", "doc_onem_attestation");
    if (i % 2 === 0) receivedDocs.push("doc_bancaire", "doc_diplomes");
    if (maritalStatus === "marie" && i % 3 === 0) receivedDocs.push("doc_acte_mariage");
    if (childrenCount > 0 && i % 4 === 1) receivedDocs.push("doc_jugement_enfant", "doc_famille");

    const workflowDone =
      status === "actif" ? 12 : status === "essai" ? 10 : status === "pre_embauche" ? 8 : i % 7;

    const family =
      maritalStatus === "marie"
        ? [
            { id: uuidv4(),
              relation: "conjoint" as const,
              sexe: sexe === "M" ? ("F" as const) : ("M" as const),
              nom: pick(NOMS, i + 5),
              prenom: sexe === "M" ? pick(PRENOMS_F, i) : pick(PRENOMS_M, i),
              dateNaissance: randomDate(1975, 1998, i + 20),
              aCharge: false,
            },
            ...Array.from({ length: childrenCount }, (_, c) => ({
              id: uuidv4(),
              relation: "enfant" as const,
              sexe: c % 2 === 0 ? ("F" as const) : ("M" as const),
              nom,
              prenom: pick(PRENOMS_F, i + c),
              dateNaissance: randomDate(2010, 2022, i + c),
              aCharge: true,
              scolarise: c % 2 === 0,
              jugementRecu: i % 4 === 1,
            })),
          ]
        : [];

    const hasCnss = i % 4 === 0 || i % 7 === 0;
    const hasOnem = i % 5 === 0;

    employees.push({
      id: uuidv4(),
      matricule: `RDC-2026-${String(i + 1).padStart(4, "0")}`,
      nom,
      prenom,
      sexe,
      grade,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@entreprise.cd`,
      telephone: `+243 ${800 + (i % 100)} ${100 + (i % 900)} ${100 + (i % 900)}`,
      dateNaissance,
      nationalite: "Congolaise",
      adresse: `Kinshasa, Commune ${pick(["Gombe", "Limete", "Ngaliema", "Kintambo"], i)}`,
      numeroCnss: hasCnss ? `CNSS-${2015 + (i % 10)}-${10000 + i}` : undefined,
      numeroOnem: hasOnem ? `ONEM-ENG-${2020 + (i % 6)}-${i}` : undefined,
      status,
      employeeKind: i % 12 === 0 ? "externe" : i % 15 === 0 ? "journalier" : "interne",
      subcontractorId: null,
      journalierProviderId: null,
      contractType: i % 8 === 0 ? "CDD" : "CDI",
      contractEndDate: i % 8 === 0 ? randomDate(2026, 2027, i) : undefined,
      department,
      position: pick(POSTES, i),
      category,
      hireDate,
      trialEndDate:
        status === "essai" && hireDate
          ? randomDate(2026, 2026, i + 100)
          : undefined,
      maritalStatus,
      childrenCount,
      salary: {
        baseSalary: catInfo.minSalary + (i % 5) * 50,
        currency: "USD",
        category,
        allowances: [
          {
            id: uuidv4(),
            type: "transport",
            label: "Prime transport",
            amount: 40 + (i % 6) * 10,
            currency: "USD",
            taxable: false,
            cotisable: false,
          },
          ...(category >= 4
            ? [
                {
                  id: uuidv4(),
                  type: "fonction" as const,
                  label: "Prime de fonction",
                  amount: 80 + (i % 4) * 25,
                  currency: "USD" as const,
                  taxable: true,
                  cotisable: true,
                },
              ]
            : []),
        ],
      },
      workflow: createDefaultWorkflow(workflowDone),
      documents: createDefaultDocuments(receivedDocs),
      family,
      movements: hireDate
        ? [
            {
              id: uuidv4(),
              employeeId: "",
              type: "embauche",
              date: hireDate,
              toPosition: pick(POSTES, i),
              toDepartment: department,
              toSalary: catInfo.minSalary,
              reason: "Embauche initiale",
              effectiveDate: hireDate,
            },
          ]
        : [],
      leaveBalance: {
        acquired: status === "actif" ? 12 + (i % 12) : 0,
        taken: i % 10,
        remaining: status === "actif" ? 5 + (i % 20) : 0,
      },
      warningsCount: i % 17 === 0 ? 2 : i % 23 === 0 ? 1 : 0,
      performanceScore: status === "actif" || status === "essai" ? 1 + (i % 5) : undefined,
      performanceReviewDate: status === "actif" ? randomDate(2025, 2026, i) : undefined,
      recruitmentStartDate:
        status === "candidat" || status === "pre_embauche"
          ? randomDate(2026, 2026, i)
          : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  employees.forEach((e) => {
    e.movements.forEach((m) => {
      m.employeeId = e.id;
    });
    if (e.maritalStatus === "marie" && !e.documents.find((d) => d.id === "doc_acte_mariage")?.received) {
      const doc = e.documents.find((d) => d.id === "doc_acte_mariage");
      if (doc) doc.required = true;
    }
    if (e.childrenCount > 0) {
      const jug = e.documents.find((d) => d.id === "doc_jugement_enfant");
      if (jug && e.family.some((f) => f.relation === "enfant" && f.aCharge)) {
        jug.required = true;
      }
    }
  });

  return employees;
}

export { ageFromBirth };
