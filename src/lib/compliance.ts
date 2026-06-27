import { DOCUMENT_COMPLIANCE_LABELS } from "./constants";
import { documentIsFilled } from "./document-compliance";
import type { DocumentItem, Employee } from "./types";

export interface DocumentGapRow {
  documentId: string;
  documentLabel: string;
  missingCount: number;
  employees: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    department: string;
    status: string;
  }[];
}

export interface ComplianceReport {
  byDocument: DocumentGapRow[];
  employeesWithIncompleteDossier: number;
  totalActive: number;
  fieldGaps: {
    type: "numero_cnss" | "numero_onem" | "acte_mariage" | "jugement_enfant";
    label: string;
    missingCount: number;
    employees: DocumentGapRow["employees"];
  }[];
}

const ACTIVE_STATUSES = ["actif", "essai", "pre_embauche", "conge", "preavis"];

export function computeComplianceReport(employees: Employee[]): ComplianceReport {
  const active = employees.filter((e) => ACTIVE_STATUSES.includes(e.status));
  const docMap = new Map<string, DocumentGapRow>();

  for (const emp of active) {
    for (const doc of emp.documents) {
      if (!doc.required || documentIsFilled(doc)) continue;
      const existing = docMap.get(doc.id) ?? {
        documentId: doc.id,
        documentLabel: DOCUMENT_COMPLIANCE_LABELS[doc.id] ?? doc.label,
        missingCount: 0,
        employees: [],
      };
      existing.missingCount++;
      existing.employees.push({
        id: emp.id,
        matricule: emp.matricule,
        nom: emp.nom,
        prenom: emp.prenom,
        department: emp.department,
        status: emp.status,
      });
      docMap.set(doc.id, existing);
    }
  }

  const fieldGaps: ComplianceReport["fieldGaps"] = [];

  const noCnss = active.filter((e) => !e.numeroCnss?.trim());
  if (noCnss.length) {
    fieldGaps.push({
      type: "numero_cnss",
      label: "Numéro CNSS non renseigné",
      missingCount: noCnss.length,
      employees: noCnss.map(mapEmp),
    });
  }

  const noOnem = active.filter((e) => !e.numeroOnem?.trim());
  if (noOnem.length) {
    fieldGaps.push({
      type: "numero_onem",
      label: "Numéro ONEM non renseigné",
      missingCount: noOnem.length,
      employees: noOnem.map(mapEmp),
    });
  }

  const marriedNoActe = active.filter(
    (e) =>
      e.maritalStatus === "marie" &&
      !e.documents.find((d) => d.id === "doc_acte_mariage")?.received
  );
  if (marriedNoActe.length) {
    fieldGaps.push({
      type: "acte_mariage",
      label: "Acte de mariage manquant (salariés mariés)",
      missingCount: marriedNoActe.length,
      employees: marriedNoActe.map(mapEmp),
    });
  }

  const childNoJugement = active.filter((e) => {
    const hasChild = e.family.some((f) => f.relation === "enfant" && f.aCharge);
    const docOk = e.documents.find((d) => d.id === "doc_jugement_enfant")?.received;
    const familyOk = e.family.some((f) => f.relation === "enfant" && f.jugementRecu);
    return hasChild && !docOk && !familyOk;
  });
  if (childNoJugement.length) {
    fieldGaps.push({
      type: "jugement_enfant",
      label: "Jugement garde/adoption manquant (enfants à charge)",
      missingCount: childNoJugement.length,
      employees: childNoJugement.map(mapEmp),
    });
  }

  const incomplete = active.filter((e) => {
    const missingDoc = e.documents.some((d) => d.required && !documentIsFilled(d));
    const missingCnss = !e.numeroCnss?.trim();
    return missingDoc || missingCnss;
  }).length;

  return {
    byDocument: Array.from(docMap.values()).sort((a, b) => b.missingCount - a.missingCount),
    employeesWithIncompleteDossier: incomplete,
    totalActive: active.length,
    fieldGaps,
  };
}

function mapEmp(e: Employee) {
  return {
    id: e.id,
    matricule: e.matricule,
    nom: e.nom,
    prenom: e.prenom,
    department: e.department,
    status: e.status,
  };
}

export function getDocumentGapsForEmployee(employee: Employee): DocumentItem[] {
  return employee.documents.filter((d) => d.required && !documentIsFilled(d));
}
