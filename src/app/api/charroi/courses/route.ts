import { NextResponse } from "next/server";
import {
  assignCourseVehicule,
  closeCourseVehicule,
  createCourseDemande,
  deleteCourseVehicule,
  listCoursesVehicule,
  startCourseVehicule,
  updateCourseAffectation,
  updateCourseDemande,
} from "@/lib/repositories/courses-vehicule";

export async function GET() {
  try {
    return NextResponse.json(await listCoursesVehicule());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "assign") {
      if (!body.id || !body.vehiculeId || !body.chauffeur?.trim()) {
        return NextResponse.json(
          { error: "id, vehiculeId et chauffeur requis" },
          { status: 400 }
        );
      }
      const course = await assignCourseVehicule(body.id, {
        vehiculeId: body.vehiculeId,
        chauffeur: body.chauffeur.trim(),
      });
      return NextResponse.json(course);
    }

    if (body.action === "update_demande") {
      if (!body.id || !body.matriculeAgent?.trim()) {
        return NextResponse.json({ error: "id et matricule agent requis" }, { status: 400 });
      }
      if (!body.dateDemande) {
        return NextResponse.json({ error: "Date de demande requise" }, { status: 400 });
      }
      const course = await updateCourseDemande(body.id, {
        dateDemande: body.dateDemande,
        matriculeAgent: body.matriculeAgent.trim(),
        typeCourseId: body.typeCourseId,
        depart: body.depart,
        destination: body.destination,
        motif: body.motif,
      });
      return NextResponse.json(course);
    }

    if (body.action === "update_affectation") {
      if (!body.id || !body.vehiculeId || !body.chauffeur?.trim()) {
        return NextResponse.json(
          { error: "id, vehiculeId et chauffeur requis" },
          { status: 400 }
        );
      }
      const course = await updateCourseAffectation(body.id, {
        vehiculeId: body.vehiculeId,
        chauffeur: body.chauffeur.trim(),
      });
      return NextResponse.json(course);
    }

    if (body.action === "depart") {
      if (!body.id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const course = await startCourseVehicule(body.id, {
        kmhDepart: body.kmhDepart != null ? Number(body.kmhDepart) : undefined,
        niveauCarburant:
          body.niveauCarburant != null && body.niveauCarburant !== ""
            ? Number(body.niveauCarburant)
            : undefined,
        passagers: body.passagers != null ? Number(body.passagers) : undefined,
        observationDepart: body.observationDepart ?? body.observations,
      });
      return NextResponse.json(course);
    }

    if (body.action === "cloturer") {
      if (!body.id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const course = await closeCourseVehicule(body.id, {
        kmhArrive: body.kmhArrive != null ? Number(body.kmhArrive) : undefined,
        observationArrive: body.observationArrive ?? body.observations,
      });
      return NextResponse.json(course);
    }

    if (body.action === "execute") {
      if (!body.id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const course = await startCourseVehicule(body.id, {
        kmhDepart: body.kmhDepart != null ? Number(body.kmhDepart) : undefined,
        niveauCarburant:
          body.niveauCarburant != null && body.niveauCarburant !== ""
            ? Number(body.niveauCarburant)
            : undefined,
        passagers: body.passagers != null ? Number(body.passagers) : undefined,
        observationDepart: body.observations,
      });
      const closed = await closeCourseVehicule(body.id, {
        kmhArrive: body.kmhArrive != null ? Number(body.kmhArrive) : undefined,
      });
      return NextResponse.json(closed);
    }

    if (!body.matriculeAgent?.trim()) {
      return NextResponse.json({ error: "Matricule agent requis" }, { status: 400 });
    }
    if (!body.dateDemande) {
      return NextResponse.json({ error: "Date de demande requise" }, { status: 400 });
    }

    const course = await createCourseDemande({
      dateDemande: body.dateDemande,
      matriculeAgent: body.matriculeAgent.trim(),
      typeCourseId: body.typeCourseId,
      depart: body.depart,
      destination: body.destination,
      motif: body.motif,
    });
    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await deleteCourseVehicule(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
