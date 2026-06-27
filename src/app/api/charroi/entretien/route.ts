import { NextResponse } from "next/server";
import {
  getEntretienDashboard,
  listEntretienSuivi,
  recordVehiculeEntretien,
  updateVehiculeEntretienSeuils,
} from "@/lib/repositories/vehicules/entretien-suivi.repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("dashboard") === "1") {
      return NextResponse.json(await getEntretienDashboard());
    }
    return NextResponse.json(await listEntretienSuivi());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "record_entretien") {
      if (!body.vehiculeId || !body.date) {
        return NextResponse.json(
          { error: "vehiculeId et date requis" },
          { status: 400 }
        );
      }
      const types = Array.isArray(body.types)
        ? body.types.map((t: unknown) => String(t).trim()).filter(Boolean)
        : body.type
          ? [String(body.type).trim()].filter(Boolean)
          : [];
      if (types.length === 0) {
        return NextResponse.json(
          { error: "Au moins un type d'entretien requis" },
          { status: 400 }
        );
      }
      const result = await recordVehiculeEntretien({
        vehiculeId: String(body.vehiculeId),
        date: String(body.date),
        types,
        type: types.join(" · "),
        kmOdometre: body.kmOdometre != null ? Number(body.kmOdometre) : undefined,
        kmParcourusDepuis:
          body.kmParcourusDepuis != null ? Number(body.kmParcourusDepuis) : undefined,
        cout: body.cout != null ? Number(body.cout) : undefined,
        prestataire: body.prestataire,
        notes: body.notes,
        intervalleKm: body.intervalleKm != null ? Number(body.intervalleKm) : undefined,
        alerteAvantKm: body.alerteAvantKm != null ? Number(body.alerteAvantKm) : undefined,
      });
      return NextResponse.json(result);
    }

    if (body.action === "update_seuils") {
      if (!body.vehiculeId) {
        return NextResponse.json({ error: "vehiculeId requis" }, { status: 400 });
      }
      const config = await updateVehiculeEntretienSeuils(String(body.vehiculeId), {
        intervalleKm: body.intervalleKm != null ? Number(body.intervalleKm) : undefined,
        alerteAvantKm: body.alerteAvantKm != null ? Number(body.alerteAvantKm) : undefined,
      });
      return NextResponse.json(config);
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
