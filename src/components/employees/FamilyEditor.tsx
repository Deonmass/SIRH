"use client";

import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Employee, FamilyMember, MaritalStatus } from "@/lib/types";

export function FamilyEditor({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (data: Partial<Employee>) => void;
}) {
  const [family, setFamily] = useState(employee.family);
  const [maritalStatus, setMaritalStatus] = useState(employee.maritalStatus);
  const [numeroCnss, setNumeroCnss] = useState(employee.numeroCnss ?? "");
  const [numeroOnem, setNumeroOnem] = useState(employee.numeroOnem ?? "");

  function addMember() {
    setFamily([
      ...family,
      {
        id: uuidv4(),
        relation: "enfant",
        nom: employee.nom,
        prenom: "",
        dateNaissance: "",
        aCharge: true,
        scolarise: false,
        jugementRecu: false,
      },
    ]);
  }

  function updateMember(id: string, patch: Partial<FamilyMember>) {
    setFamily(family.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeMember(id: string) {
    setFamily(family.filter((m) => m.id !== id));
  }

  function persist() {
    const childrenCount = family.filter((f) => f.relation === "enfant").length;
    onSave({
      family,
      maritalStatus,
      childrenCount,
      numeroCnss: numeroCnss || undefined,
      numeroOnem: numeroOnem || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Situation familiale & numéros sociaux</h2>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-400">Statut matrimonial</span>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              >
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="divorce">Divorcé(e)</option>
                <option value="veuf">Veuf(ve)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">N° CNSS</span>
              <input
                value={numeroCnss}
                onChange={(e) => setNumeroCnss(e.target.value)}
                placeholder="CNSS-YYYY-XXXXX"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">N° ONEM</span>
              <input
                value={numeroOnem}
                onChange={(e) => setNumeroOnem(e.target.value)}
                placeholder="ONEM-ENG-XXXX"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
          {maritalStatus === "marie" && (
            <p className="text-xs text-amber-400/90">
              Acte de mariage requis — document « Acte de mariage » dans l&apos;onglet Documents
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Membres de la famille</h2>
            <button
              type="button"
              onClick={addMember}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {family.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun membre — cliquez sur Ajouter</p>
          ) : (
            family.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-white/10 p-4 space-y-3"
              >
                <div className="flex justify-between">
                  <select
                    value={m.relation}
                    onChange={(e) =>
                      updateMember(m.id, {
                        relation: e.target.value as FamilyMember["relation"],
                      })
                    }
                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                  >
                    <option value="conjoint">Conjoint(e)</option>
                    <option value="enfant">Enfant</option>
                    <option value="autre">Autre</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Prénom"
                    value={m.prenom}
                    onChange={(e) => updateMember(m.id, { prenom: e.target.value })}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <input
                    placeholder="Nom"
                    value={m.nom}
                    onChange={(e) => updateMember(m.id, { nom: e.target.value })}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="date"
                    value={m.dateNaissance}
                    onChange={(e) => updateMember(m.id, { dateNaissance: e.target.value })}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={m.aCharge}
                      onChange={(e) => updateMember(m.id, { aCharge: e.target.checked })}
                    />
                    À charge
                  </label>
                  {m.relation === "enfant" && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={m.scolarise ?? false}
                          onChange={(e) => updateMember(m.id, { scolarise: e.target.checked })}
                        />
                        Scolarisé
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={m.jugementRecu ?? false}
                          onChange={(e) =>
                            updateMember(m.id, { jugementRecu: e.target.checked })
                          }
                        />
                        Jugement reçu
                      </label>
                    </>
                  )}
                </div>
                {m.relation === "enfant" && m.aCharge && !m.jugementRecu && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Joindre le jugement dans Documents → « Jugement garde / adoption »
                  </p>
                )}
                {m.aCharge && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 w-fit">
                    Éligible allocations familiales CNSS
                  </Badge>
                )}
              </div>
            ))
          )}
          <button
            type="button"
            onClick={persist}
            className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500"
          >
            Enregistrer famille & numéros sociaux
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
