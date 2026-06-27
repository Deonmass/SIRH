import { NextResponse } from "next/server";
import { listCharroiVehicules } from "@/lib/repositories/charroi";
import {
  createVehicule,
  declareVehiculePanne,
  deleteVehicule,
  listVehicules,
  remettreVehiculeEnService,
  updateVehicule,
  type Vehicule,
} from "@/lib/repositories/vehicules";

export async function GET(request: Request) {
  try {
    const planning = new URL(request.url).searchParams.get("planning") === "1";
    if (planning) {
      return NextResponse.json(await listCharroiVehicules());
    }
    return NextResponse.json(await listVehicules());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.marque?.trim()) {
      return NextResponse.json({ error: "Marque requise" }, { status: 400 });
    }
    const item = await createVehicule({
      marque: body.marque.trim(),
      vehicleType: body.vehicleType,
      numeroChassis: body.numeroChassis,
      plaque: body.plaque,
      province: body.province,
      miseCirculation: body.miseCirculation,
      cv: body.cv != null && body.cv !== "" ? Number(body.cv) : undefined,
      centreDeCout: body.centreDeCout,
      assureur: body.assureur,
      departement: body.departement,
      utilisateur: body.utilisateur,
      societeProprietaire: body.societeProprietaire,
      statut: body.statut,
      kilometrageInitiale:
        body.kilometrageInitiale != null && body.kilometrageInitiale !== ""
          ? Number(body.kilometrageInitiale)
          : undefined,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "declare_panne") {
      if (!body.id || !body.description?.trim()) {
        return NextResponse.json({ error: "id et description requis" }, { status: 400 });
      }
      const item = await declareVehiculePanne(body.id, body.description, body.at);
      return NextResponse.json(item);
    }

    if (body.action === "remise_service") {
      if (!body.id || !body.description?.trim()) {
        return NextResponse.json({ error: "id et description requis" }, { status: 400 });
      }
      const item = await remettreVehiculeEnService(body.id, body.description, body.at);
      return NextResponse.json(item);
    }

    const vehicule = body as Vehicule;
    if (!vehicule.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    if (!vehicule.marque?.trim()) {
      return NextResponse.json({ error: "Marque requise" }, { status: 400 });
    }
    const item = await updateVehicule(vehicule);
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
    await deleteVehicule(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
