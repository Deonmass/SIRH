import { NextResponse } from "next/server";
import { createEmployee, getEmployees } from "@/lib/store";
import {
  createDefaultDocuments,
  createDefaultWorkflow,
} from "@/lib/constants";
import type { Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const employees = await getEmployees();
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.nom?.trim() || !body.prenom?.trim()) {
    return NextResponse.json(
      { error: "Le nom et le prénom sont obligatoires." },
      { status: 400 }
    );
  }

  const employee = await createEmployee({
    nom: String(body.nom).trim(),
    prenom: String(body.prenom).trim(),
    postNom: body.postNom?.trim() || undefined,
    sexe: body.sexe ?? "M",
    dateNaissance: body.dateNaissance || undefined,
    lieuNaissance: body.lieuNaissance?.trim() || undefined,
    nationalite: body.nationalite?.trim() || "Congolaise (RDC)",
    maritalStatus: body.maritalStatus ?? "celibataire",
    adresse: body.adresse?.trim() || undefined,
    email: body.email?.trim() || undefined,
    telephone: body.telephone?.trim() || undefined,
    grade: "Agent",
    status: "candidat",
    employeeKind: "interne",
    subcontractorId: null,
    journalierProviderId: null,
    contractType: "CDI",
    department: "",
    position: "",
    category: 3,
    childrenCount: 0,
    salary: {
      baseSalary: 0,
      currency: "USD",
      category: 3,
      allowances: [],
    },
    workflow: createDefaultWorkflow(0),
    documents: createDefaultDocuments(),
    family: body.family ?? [],
    movements: [],
    leaveBalance: { acquired: 0, taken: 0, remaining: 0 },
    warningsCount: 0,
    overtime: { hours130: 0, hours160: 0, hours200: 0 },
    disciplinaryRecords: [],
  } as Omit<Employee, "id" | "createdAt" | "updatedAt" | "matricule">);

  return NextResponse.json(employee, { status: 201 });
}
