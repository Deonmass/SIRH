"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { PageHeader } from "@/components/layout/PageHeader";
import { dossierInputClass } from "@/components/employees/DossierFields";
import { MARITAL_LABELS } from "@/lib/employee-dossier";
import { readApiError, showErrorAlert } from "@/lib/alerts";
import type { MaritalStatus, Sexe } from "@/lib/types";

/** Champs profil + coordonnées (table Supabase `employes`) — dossier complet après création */
export function NouvelEmployeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    postNom: "",
    sexe: "M" as Sexe,
    dateNaissance: "",
    lieuNaissance: "",
    nationalite: "Congolaise (RDC)",
    maritalStatus: "celibataire" as MaritalStatus,
    adresse: "",
    email: "",
    telephone: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          postNom: form.postNom.trim() || undefined,
          sexe: form.sexe,
          dateNaissance: form.dateNaissance || undefined,
          lieuNaissance: form.lieuNaissance.trim() || undefined,
          nationalite: form.nationalite.trim() || "Congolaise (RDC)",
          maritalStatus: form.maritalStatus,
          adresse: form.adresse.trim() || undefined,
          email: form.email.trim() || undefined,
          telephone: form.telephone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        await showErrorAlert("Création impossible", await readApiError(res));
        return;
      }
      const emp = await res.json();
      router.push(employeeDossierHref(emp.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Nouvel employé"
        description="Identité et coordonnées — complétez le dossier (contrat, poste, paie…) après création"
      >
        <Link href="/employes" className="text-sm text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]">
          ← Liste
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--shell-text)]">Profil</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Prénom *">
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Nom *">
              <input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Post-nom">
              <input
                value={form.postNom}
                onChange={(e) => setForm({ ...form, postNom: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Sexe">
              <select
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value as Sexe })}
                className={dossierInputClass}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </Field>
            <Field label="Date de naissance">
              <input
                type="date"
                value={form.dateNaissance}
                onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Lieu de naissance">
              <input
                value={form.lieuNaissance}
                onChange={(e) => setForm({ ...form, lieuNaissance: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Nationalité">
              <input
                value={form.nationalite}
                onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="État civil">
              <select
                value={form.maritalStatus}
                onChange={(e) => setForm({ ...form, maritalStatus: e.target.value as MaritalStatus })}
                className={dossierInputClass}
              >
                {Object.entries(MARITAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--shell-text)]">Coordonnées</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Adresse" className="lg:col-span-3">
              <input
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Email pro">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <Field label="Téléphone">
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className={dossierInputClass}
              />
            </Field>
            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white disabled:opacity-50 sm:w-auto sm:min-w-[16rem] sm:px-8"
              >
                {loading ? "Création…" : "Créer et compléter le dossier"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-xs text-[var(--shell-text-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
