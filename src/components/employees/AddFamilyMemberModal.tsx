"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  DossierField,
  DossierSelect,
  DossierTextInput,
  dossierInputClass,
} from "./DossierFields";
import type { Employee, FamilyMember, Sexe } from "@/lib/types";
import { showErrorAlert } from "@/lib/alerts";

const RELATION_OPTIONS: { value: FamilyMember["relation"]; label: string }[] = [
  { value: "pere", label: "Père" },
  { value: "mere", label: "Mère" },
  { value: "enfant", label: "Enfant" },
  { value: "conjoint", label: "Conjoint(e)" },
  { value: "autre", label: "Autre" },
];

function defaultSexeForRelation(relation: FamilyMember["relation"]): Sexe | undefined {
  if (relation === "pere") return "M";
  if (relation === "mere") return "F";
  return undefined;
}

export function AddFamilyMemberModal({
  employee,
  existing,
  initialRelation,
  onSave,
  onClose,
  saving = false,
}: {
  employee: Employee;
  existing?: FamilyMember | null;
  initialRelation?: FamilyMember["relation"];
  onSave: (member: FamilyMember) => Promise<boolean> | boolean;
  onClose: () => void;
  saving?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const busy = saving || submitting;
  const defaultRelation = existing?.relation ?? initialRelation ?? "enfant";
  const [form, setForm] = useState<Omit<FamilyMember, "id">>({
    relation: defaultRelation,
    sexe: existing?.sexe ?? defaultSexeForRelation(defaultRelation),
    nom: existing?.nom ?? employee.nom,
    prenom: existing?.prenom ?? "",
    dateNaissance: existing?.dateNaissance ?? "",
    aCharge: existing?.aCharge ?? false,
    scolarise: existing?.scolarise ?? false,
    jugementRecu: existing?.jugementRecu ?? false,
  });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  function handleRelationChange(relation: FamilyMember["relation"]) {
    setForm((f) => ({
      ...f,
      relation,
      sexe: defaultSexeForRelation(relation) ?? f.sexe,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.prenom.trim()) return;
    if (!form.dateNaissance.trim()) {
      void showErrorAlert(
        "Date de naissance requise",
        "Indiquez la date de naissance avant d'enregistrer le membre de la famille."
      );
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onSave({
        ...form,
        id: existing?.id ?? uuidv4(),
        nom: form.nom.trim() || employee.nom,
        prenom: form.prenom.trim(),
      });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onClose();
      }}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-family-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--shell-border)] px-5 py-4">
          <h3 id="add-family-title" className="font-semibold text-[var(--shell-text)]">
            {existing ? "Modifier le membre" : "Ajouter un membre de la famille"}
          </h3>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--shell-bg)]/60 backdrop-blur-[1px]">
            <Loader2 className="h-7 w-7 animate-spin text-sky-500" aria-label="Enregistrement…" />
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 p-5">
          <DossierField label="Lien de parenté" required>
            <DossierSelect
              value={form.relation}
              onChange={(v) => handleRelationChange(v as FamilyMember["relation"])}
              options={RELATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </DossierField>
          <DossierField label="Sexe">
            <DossierSelect
              value={form.sexe ?? ""}
              onChange={(v) => setForm({ ...form, sexe: v as Sexe })}
              options={[
                { value: "M", label: "Homme" },
                { value: "F", label: "Femme" },
              ]}
            />
          </DossierField>
          <div className="grid gap-4 sm:grid-cols-2">
            <DossierField label="Prénom" required>
              <DossierTextInput
                value={form.prenom}
                onChange={(prenom) => setForm({ ...form, prenom })}
                required
              />
            </DossierField>
            <DossierField label="Nom">
              <DossierTextInput value={form.nom} onChange={(nom) => setForm({ ...form, nom })} />
            </DossierField>
          </div>
          <DossierField label="Date de naissance" required>
            <DossierTextInput
              type="date"
              value={form.dateNaissance}
              onChange={(dateNaissance) => setForm({ ...form, dateNaissance })}
              required
            />
          </DossierField>
          <label className="flex items-center gap-2 text-sm text-[var(--shell-text-muted)]">
            <input
              type="checkbox"
              checked={form.aCharge}
              onChange={(e) => setForm({ ...form, aCharge: e.target.checked })}
              className="rounded"
            />
            Personne à charge
          </label>
          {form.relation === "enfant" && (
            <>
              <label className="flex items-center gap-2 text-sm text-[var(--shell-text-muted)]">
                <input
                  type="checkbox"
                  checked={form.scolarise ?? false}
                  onChange={(e) => setForm({ ...form, scolarise: e.target.checked })}
                  className="rounded"
                />
                Scolarisé(e)
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--shell-text-muted)]">
                <input
                  type="checkbox"
                  checked={form.jugementRecu ?? false}
                  onChange={(e) => setForm({ ...form, jugementRecu: e.target.checked })}
                  className="rounded"
                />
                Jugement / garde reçu
              </label>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={`${dossierInputClass} flex-1 text-center disabled:opacity-50`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {existing ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
