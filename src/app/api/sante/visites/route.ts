import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessSection, isAdminUsername } from "@/lib/permissions";
import { employeeDisplayName } from "@/lib/extra-costs";
import {
  createHopitalVisite,
  deleteHopitalVisite,
  getHopitalVisiteById,
  listHopitalVisites,
  updateHopitalVisite,
  type HopitalVisite,
} from "@/lib/repositories/hopital-visite";
import {
  buildSanteVisiteValidationRecord,
  getSanteVisiteStatut,
  parseSanteVisiteValidation,
  serializeSanteVisiteValidation,
  type SanteVisiteValidation,
} from "@/lib/sante-visite";
import { getEmployees } from "@/lib/store";

type PatchVisiteBody = HopitalVisite & {
  validationStatut?: SanteVisiteValidation;
  raisonRejet?: string;
};

function canValidateVisite(session: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) {
  if (isAdminUsername(session.username)) return true;
  return canAccessSection(session.permissions, "sante.file-attente", "validate1", session.username);
}

async function resolveValidatorName(
  session: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
): Promise<string> {
  if (session.matriculAgent) {
    const employees = await getEmployees();
    const emp = employees.find((e) => e.matricule === session.matriculAgent);
    if (emp) return employeeDisplayName(emp);
  }
  return session.username;
}

export async function GET() {
  try {
    return NextResponse.json(await listHopitalVisites());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.matriculeAgent?.trim()) {
      return NextResponse.json({ error: "Matricule agent requis" }, { status: 400 });
    }
    const item = await createHopitalVisite({
      matriculeAgent: body.matriculeAgent.trim(),
      hopital: body.hopital?.trim(),
      dateVisite: body.dateVisite,
      motif: body.motif,
      montant: body.montant != null ? Number(body.montant) : undefined,
      fichiers: body.fichiers,
      validation: serializeSanteVisiteValidation({ statut: "en_attente" }),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchVisiteBody;
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const existing = await getHopitalVisiteById(body.id);
    if (!existing) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });

    const session = await getSessionUser();
    const currentRecord = parseSanteVisiteValidation(existing.validation);
    const nextStatut =
      body.validationStatut ?? getSanteVisiteStatut(body.validation ?? existing.validation);

    let validationValue = existing.validation ?? serializeSanteVisiteValidation(currentRecord);

    if (nextStatut !== currentRecord.statut) {
      if (!session || !canValidateVisite(session)) {
        return NextResponse.json(
          { error: "Permission « Valider niveau 1 » requise pour modifier le statut" },
          { status: 403 }
        );
      }
      if (nextStatut === "rejete" && !body.raisonRejet?.trim()) {
        return NextResponse.json({ error: "Motif du rejet requis" }, { status: 400 });
      }

      const nomValidateur = await resolveValidatorName(session);
      validationValue = serializeSanteVisiteValidation(
        buildSanteVisiteValidationRecord({
          statut: nextStatut,
          nomValidateur,
          matriculeValidateur: session.matriculAgent ?? session.username,
          raisonRejet: body.raisonRejet,
        })
      );
    }

    const item = await updateHopitalVisite({
      ...body,
      validation: validationValue,
      fichiers: body.fichiers ?? existing.fichiers,
    });
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await deleteHopitalVisite(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
