import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { departmentForMatricule } from "@/lib/conges-validation-access";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import { getEmployees } from "@/lib/store";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const employees = await getEmployees();
  const validatorDepartment = departmentForMatricule(user.matriculAgent, employees);
  let employee = null;

  if (user.matriculAgent?.trim()) {
    const linked = employees.find((e) => e.matricule === user.matriculAgent?.trim());
    if (linked) {
      const dossier = getEmployeeDossier(linked);
      employee = {
        id: linked.id,
        matricule: linked.matricule,
        nom: linked.nom,
        postNom: linked.postNom ?? null,
        prenom: linked.prenom,
        poste: linked.position,
        departement: linked.department,
        adresse: linked.adresse ?? "",
        telephone: linked.telephone ?? "",
        email: linked.email ?? "",
        ville: dossier.ville ?? "",
        province: dossier.province ?? "",
        pays: dossier.pays ?? "",
        telephoneSecondaire: dossier.telephoneSecondaire ?? "",
        emailPersonnel: dossier.emailPersonnel ?? "",
        contactUrgence: dossier.contactUrgence ?? "",
        telephoneUrgence: dossier.telephoneUrgence ?? "",
        banque: dossier.banque ?? "",
        numeroCompte: dossier.numeroCompte ?? "",
      };
    }
  }

  return NextResponse.json({
    user: {
      id: String(user.id),
      username: user.username,
      matriculAgent: user.matriculAgent,
      validatorDepartment: validatorDepartment ?? null,
    },
    employee,
  });
}
