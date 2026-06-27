import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import { appendCoordinatesHistoryEntry } from "@/lib/repositories/employes/coordonnees-json";
import { getEmployees, saveEmployee } from "@/lib/store";

type CoordonneesBody = {
  adresse?: string;
  telephone?: string;
  email?: string;
  ville?: string;
  province?: string;
  pays?: string;
  telephoneSecondaire?: string;
  emailPersonnel?: string;
  contactUrgence?: string;
  telephoneUrgence?: string;
  banque?: string;
  numeroCompte?: string;
};

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const matricule = auth.user.matriculAgent?.trim();
  if (!matricule) {
    return NextResponse.json(
      { error: "Aucun employé lié à ce compte" },
      { status: 400 }
    );
  }

  const employees = await getEmployees();
  const employee = employees.find((e) => e.matricule === matricule);
  if (!employee) {
    return NextResponse.json({ error: "Employé lié introuvable" }, { status: 404 });
  }

  const body = (await request.json()) as CoordonneesBody;
  const today = new Date().toISOString().slice(0, 10);

  const withHistory = appendCoordinatesHistoryEntry(employee, {
    effectiveDate: today,
    adresse: body.adresse?.trim() || undefined,
    telephone: body.telephone?.trim() || undefined,
    email: body.email?.trim() || undefined,
    ville: body.ville?.trim() || undefined,
    province: body.province?.trim() || undefined,
    pays: body.pays?.trim() || undefined,
    telephoneSecondaire: body.telephoneSecondaire?.trim() || undefined,
    emailPersonnel: body.emailPersonnel?.trim() || undefined,
    contactUrgence: body.contactUrgence?.trim() || undefined,
    telephoneUrgence: body.telephoneUrgence?.trim() || undefined,
    reason: "Mise à jour via mon profil",
    createdBy: auth.user.username,
  });

  const dossier = getEmployeeDossier(withHistory);
  const updated = await saveEmployee({
    ...withHistory,
    dossier: {
      ...dossier,
      banque: body.banque?.trim() ?? dossier.banque,
      numeroCompte: body.numeroCompte?.trim() ?? dossier.numeroCompte,
    },
  });

  const nextDossier = getEmployeeDossier(updated);
  return NextResponse.json({
    employee: {
      id: updated.id,
      matricule: updated.matricule,
      nom: updated.nom,
      postNom: updated.postNom ?? null,
      prenom: updated.prenom,
      poste: updated.position,
      departement: updated.department,
      adresse: updated.adresse ?? "",
      telephone: updated.telephone ?? "",
      email: updated.email ?? "",
      ville: nextDossier.ville ?? "",
      province: nextDossier.province ?? "",
      pays: nextDossier.pays ?? "",
      telephoneSecondaire: nextDossier.telephoneSecondaire ?? "",
      emailPersonnel: nextDossier.emailPersonnel ?? "",
      contactUrgence: nextDossier.contactUrgence ?? "",
      telephoneUrgence: nextDossier.telephoneUrgence ?? "",
      banque: nextDossier.banque ?? "",
      numeroCompte: nextDossier.numeroCompte ?? "",
    },
  });
}
