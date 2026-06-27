"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MultiFileAttachStrip } from "@/components/sante/MultiFileAttachStrip";
import { SanteMatriculeField } from "@/components/sante/SanteMatriculeField";
import type { Hopital } from "@/lib/repositories/hopitaux";
import type { SanteVisiteFichier } from "@/lib/sante-visite";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";

const emptyForm = {
  matriculeAgent: "",
  hopital: "",
  dateVisite: "",
  motif: "",
  montant: "",
};

async function uploadVisiteFiles(visiteId: string, files: File[]): Promise<SanteVisiteFichier[]> {
  const uploaded: SanteVisiteFichier[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("visiteId", visiteId);
    formData.append("file", file);
    const res = await fetch("/api/sante/visites/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await readApiError(res));
    const data = await res.json();
    uploaded.push({
      name: data.name,
      ref: data.storageRef,
      size: data.size,
      mimeType: data.mimeType,
    });
  }
  return uploaded;
}

export function SanteFormulaireClient() {
  const [hopitaux, setHopitaux] = useState<Hopital[]>([]);
  const [loadingHopitaux, setLoadingHopitaux] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const loadHopitaux = useCallback(async () => {
    setLoadingHopitaux(true);
    try {
      const res = await fetch("/api/sante/hopitaux");
      if (res.ok) setHopitaux(await res.json());
    } finally {
      setLoadingHopitaux(false);
    }
  }, []);

  useEffect(() => {
    void loadHopitaux();
  }, [loadHopitaux]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.matriculeAgent.trim()) {
      await showErrorAlert("Champ requis", "Sélectionnez un matricule agent.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sante/visites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matriculeAgent: form.matriculeAgent,
          hopital: form.hopital,
          dateVisite: form.dateVisite || undefined,
          motif: form.motif || undefined,
          montant: form.montant ? Number(form.montant) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const created = await res.json();

      if (pendingFiles.length > 0) {
        const fichiers = await uploadVisiteFiles(created.id, pendingFiles);
        const patchRes = await fetch("/api/sante/visites", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...created, fichiers }),
        });
        if (!patchRes.ok) throw new Error(await readApiError(patchRes));
      }

      setForm(emptyForm);
      setPendingFiles([]);
      await showSuccessAlert(
        "Visite enregistrée",
        "La demande a été ajoutée à la file d'attente."
      );
    } catch (e) {
      await showErrorAlert(
        "Enregistrement impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  const hopitauxActifs = hopitaux.filter(
    (h) => (h.statut ?? "actif").toLowerCase() !== "inactif"
  );

  return (
    <div>
      <PageHeader
        title="Formulaire santé"
        description="Déclaration d'une visite médicale ou passage à l'hôpital affilié"
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-6"
      >
        <SanteMatriculeField
          value={form.matriculeAgent}
          onChange={(matriculeAgent) => setForm((f) => ({ ...f, matriculeAgent }))}
          disabled={saving}
        />

        <label className="block text-sm">
          <span className="text-[var(--shell-text-muted)]">Hôpital</span>
          {loadingHopitaux ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--shell-text-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Chargement des hôpitaux…
            </div>
          ) : hopitauxActifs.length > 0 ? (
            <select
              value={form.hopital}
              onChange={(e) => setForm((f) => ({ ...f, hopital: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2"
            >
              <option value="">— Sélectionner —</option>
              {hopitauxActifs.map((h) => (
                <option key={h.id} value={h.hopital}>
                  {h.hopital}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.hopital}
              onChange={(e) => setForm((f) => ({ ...f, hopital: e.target.value }))}
              placeholder="Nom de l'hôpital"
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2"
            />
          )}
        </label>

        <label className="block text-sm">
          <span className="text-[var(--shell-text-muted)]">Date de visite</span>
          <input
            type="date"
            value={form.dateVisite}
            onChange={(e) => setForm((f) => ({ ...f, dateVisite: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--shell-text-muted)]">Motif</span>
          <textarea
            value={form.motif}
            onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--shell-text-muted)]">Montant</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.montant}
            onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2"
          />
        </label>

        <MultiFileAttachStrip
          files={pendingFiles}
          onAdd={(files) => setPendingFiles((prev) => [...prev, ...files])}
          onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
          disabled={saving}
        />

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer à la file d&apos;attente
        </button>
      </form>
    </div>
  );
}
