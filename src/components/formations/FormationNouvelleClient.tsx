"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { FORMATION_NIVEAU_OPTIONS } from "@/lib/formations-utils";

export function FormationNouvelleClient() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titre: "",
    dateDebut: today,
    dateFin: today,
    niveau: "",
    instructeur: "",
    commentaire: "",
  });

  async function submit() {
    if (!form.titre.trim()) {
      showErrorAlert("Le titre est requis");
      return;
    }
    if (form.dateFin < form.dateDebut) {
      showErrorAlert("La date de fin doit être après le début");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: form.titre,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin,
          niveau: form.niveau || undefined,
          instructeur: form.instructeur || undefined,
          commentaire: form.commentaire || undefined,
          participation: [],
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      showSuccessAlert("Formation créée");
      router.push("/formations/gestion");
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader compact title="Nouvelle formation" />
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--shell-text-muted)]">Titre *</span>
          <input
            className="input w-full"
            value={form.titre}
            onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--shell-text-muted)]">Date début *</span>
            <input
              type="date"
              className="input w-full"
              value={form.dateDebut}
              onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--shell-text-muted)]">Date fin *</span>
            <input
              type="date"
              className="input w-full"
              value={form.dateFin}
              onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--shell-text-muted)]">Niveau</span>
          <select
            className="input w-full"
            value={form.niveau}
            onChange={(e) => setForm((f) => ({ ...f, niveau: e.target.value }))}
          >
            <option value="">— Sélectionner —</option>
            {FORMATION_NIVEAU_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--shell-text-muted)]">Instructeur</span>
          <input
            className="input w-full"
            value={form.instructeur}
            onChange={(e) => setForm((f) => ({ ...f, instructeur: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--shell-text-muted)]">Commentaire</span>
          <textarea
            className="input min-h-[80px] w-full"
            value={form.commentaire}
            onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))}
          />
        </label>
        <SaveButton
          saving={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          Enregistrer
        </SaveButton>
      </div>
    </>
  );
}
