import { rebuildPositionHierarchy } from "./position-hierarchy";
import type { Employee, JobPosition, JobPositionPayroll } from "./types";

function defaultPayroll(
  partial: Partial<JobPositionPayroll> & Pick<JobPositionPayroll, "baseSalary" | "category">
): JobPositionPayroll {
  return {
    currency: "USD",
    smigGrade: 3,
    housingAllowance: 0,
    transportDaily: 0,
    unionMember: false,
    allowances: [],
    ...partial,
  };
}

export function generateSeedPositions(employees: Employee[]): JobPosition[] {
  const now = new Date().toISOString();
  const positions: JobPosition[] = [];
  const byKey = new Map<string, JobPosition>();

  let dgAssigned = false;

  for (const emp of employees.filter((e) => e.status === "actif" || e.status === "essai")) {
    const key = `${emp.department}::${emp.position}`;
    if (byKey.has(key)) {
      const existing = byKey.get(key)!;
      if (!existing.employeeId) existing.employeeId = emp.id;
      continue;
    }
    const id = crypto.randomUUID();
    const code = `POSTE-${emp.department.slice(0, 3).toUpperCase()}-${String(positions.length + 1).padStart(3, "0")}`;
    let title = emp.position || "Agent";
    if (
      !dgAssigned &&
      emp.department === "Direction Générale" &&
      emp.grade === "Direction"
    ) {
      title = "Directeur Général";
      dgAssigned = true;
    }

    const pos: JobPosition = {
      id,
      code,
      title,
      department: emp.department,
      grade: emp.grade,
      reportsToId: null,
      status: "active",
      contractType: emp.contractType,
      location: "Kinshasa",
      headcount: 1,
      description: `Fiche de poste — ${emp.position} au sein de ${emp.department}.`,
      missions:
        "Assurer les missions opérationnelles du service.\nContribuer aux objectifs départementaux.\nRespecter les procédures internes et la réglementation RDC.",
      requirements:
        "Formation adaptée au grade.\nExpérience dans le domaine.\nMaîtrise des outils bureautiques.",
      competencies: "Rigueur, communication, travail en équipe, sens du service.",
      kpi: "Atteinte des objectifs trimestriels, qualité des livrables.",
      employeeId: emp.id,
      payroll: defaultPayroll({
        baseSalary: emp.salary.baseSalary,
        currency: emp.salary.currency,
        category: emp.salary.category,
        allowances: emp.salary.allowances.map((a) => ({ ...a })),
      }),
      createdAt: now,
      updatedAt: now,
    };
    byKey.set(key, pos);
    positions.push(pos);
  }

  const vacantTemplates: Omit<JobPosition, "id" | "code" | "createdAt" | "updatedAt">[] = [
    {
      title: "Responsable paie",
      department: "Ressources Humaines",
      grade: "Cadre",
      reportsToId: null,
      status: "vacant",
      contractType: "CDI",
      location: "Kinshasa",
      headcount: 1,
      description: "Pilotage de la paie, déclarations sociales et conformité CNSS/INPP/ONEM.",
      missions:
        "Superviser le calcul des salaires.\nValider les bulletins et déclarations.\nFormer les équipes RH sur la paie RDC.",
      requirements: "5 ans expérience paie RDC, maîtrise SMIG et fiscalité salariale.",
      competencies: "Excel avancé, rigueur, confidentialité, relationnel.",
      kpi: "Zéro erreur de paie, déclarations à temps.",
      employeeId: null,
      payroll: defaultPayroll({ baseSalary: 1200, category: 4 }),
    },
    {
      title: "Ingénieur commercial",
      department: "Commercial",
      grade: "Cadre",
      reportsToId: null,
      status: "vacant",
      contractType: "CDI",
      location: "Kinshasa",
      headcount: 2,
      description: "Développement du portefeuille clients B2B.",
      missions: "Prospection, négociation, suivi clientèle, reporting commercial.",
      requirements: "Bac+3 commercial, expérience secteur.",
      competencies: "Négociation, présentation, autonomie.",
      employeeId: null,
      payroll: defaultPayroll({ baseSalary: 950, category: 4 }),
    },
    {
      title: "Technicien maintenance",
      department: "Opérations",
      grade: "Agent maîtrise",
      reportsToId: null,
      status: "vacant",
      contractType: "CDD",
      location: "Kinshasa",
      headcount: 1,
      description: "Maintenance préventive et curative des équipements.",
      missions: "Interventions terrain, diagnostics, rapports d'intervention.",
      requirements: "Formation technique, permis de conduire.",
      competencies: "Sécurité, réactivité, habileté manuelle.",
      employeeId: null,
      payroll: defaultPayroll({ baseSalary: 450, category: 2 }),
    },
  ];

  for (const t of vacantTemplates) {
    positions.push({
      ...t,
      id: crypto.randomUUID(),
      code: `POSTE-VAC-${String(positions.length + 1).padStart(3, "0")}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  rebuildPositionHierarchy(positions);
  return positions;
}
