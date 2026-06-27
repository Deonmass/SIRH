"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Briefcase,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserCircle,
  X,
} from "lucide-react";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type ProfileEmployee = {
  id: string;
  matricule: string;
  nom: string;
  postNom: string | null;
  prenom: string;
  poste: string;
  departement: string;
  adresse: string;
  telephone: string;
  email: string;
  ville: string;
  province: string;
  pays: string;
  telephoneSecondaire: string;
  emailPersonnel: string;
  contactUrgence: string;
  telephoneUrgence: string;
  banque: string;
  numeroCompte: string;
};

type ProfilePayload = {
  user: {
    id: string;
    username: string;
    matriculAgent: string | null;
    validatorDepartment: string | null;
  };
  employee: ProfileEmployee | null;
};

export function UserProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loadError, setLoadError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [coords, setCoords] = useState<ProfileEmployee | null>(null);
  const [coordsSaving, setCoordsSaving] = useState(false);
  const [coordsError, setCoordsError] = useState("");
  const [coordsSaved, setCoordsSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/auth/profile", { cache: "no-store" });
      const data = (await res.json()) as ProfilePayload & { error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Impossible de charger le profil");
        return;
      }
      setProfile(data);
      setCoords(data.employee);
    } catch {
      setLoadError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSaved(false);
    setCoordsError("");
    setCoordsSaved(false);
    void loadProfile();
  }, [open, loadProfile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const displayName = profile?.employee
    ? `${profile.employee.prenom} ${profile.employee.nom}${profile.employee.postNom ? ` ${profile.employee.postNom}` : ""}`.trim()
    : profile?.user.username ?? user?.username ?? "Utilisateur";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword.length < 3) {
      setPasswordError("Le mot de passe doit contenir au moins 3 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordError(data.error ?? "Impossible de changer le mot de passe");
        return;
      }
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => setPasswordSaved(false), 2500);
    } catch {
      setPasswordError("Erreur réseau");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleCoordsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) return;
    setCoordsError("");
    setCoordsSaved(false);
    setCoordsSaving(true);
    try {
      const res = await fetch("/api/auth/profile/coordonnees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adresse: coords.adresse,
          telephone: coords.telephone,
          email: coords.email,
          ville: coords.ville,
          province: coords.province,
          pays: coords.pays,
          telephoneSecondaire: coords.telephoneSecondaire,
          emailPersonnel: coords.emailPersonnel,
          contactUrgence: coords.contactUrgence,
          telephoneUrgence: coords.telephoneUrgence,
          banque: coords.banque,
          numeroCompte: coords.numeroCompte,
        }),
      });
      const data = (await res.json()) as { employee?: ProfileEmployee; error?: string };
      if (!res.ok) {
        setCoordsError(data.error ?? "Impossible d'enregistrer les coordonnées");
        return;
      }
      if (data.employee) {
        setCoords(data.employee);
        setProfile((prev) => (prev ? { ...prev, employee: data.employee! } : prev));
      }
      setCoordsSaved(true);
      window.setTimeout(() => setCoordsSaved(false), 2500);
    } catch {
      setCoordsError("Erreur réseau");
    } finally {
      setCoordsSaving(false);
    }
  }

  function updateCoord(field: keyof ProfileEmployee, value: string) {
    setCoords((prev) => (prev ? { ...prev, [field]: value } : prev));
    setCoordsSaved(false);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-lg font-bold text-white">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h2 id="user-profile-title" className="truncate font-semibold text-[var(--shell-text)]">
                Mon profil
              </h2>
              <p className="truncate text-sm text-[var(--shell-text-muted)]">{displayName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[var(--shell-text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : loadError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {loadError}
            </p>
          ) : (
            <div className="space-y-6">
              <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--shell-text)]">
                  <UserCircle className="h-4 w-4 text-sky-600" />
                  Compte
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Identifiant" value={profile?.user.username ?? "—"} />
                  <InfoItem
                    label="Matricule employé"
                    value={profile?.user.matriculAgent ?? "Non lié"}
                  />
                  {profile?.user.validatorDepartment && (
                    <InfoItem
                      label="Département (validation)"
                      value={profile.user.validatorDepartment}
                      className="sm:col-span-2"
                    />
                  )}
                </dl>
              </section>

              {profile?.employee && (
                <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--shell-text)]">
                    Employé lié
                  </h3>
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    <ReadonlyChip icon={Briefcase} label="Poste" value={profile.employee.poste} />
                    <ReadonlyChip
                      icon={Building2}
                      label="Département"
                      value={profile.employee.departement}
                    />
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--shell-text)]">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Changer le mot de passe
                </h3>
                <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-3">
                  <Field
                    label="Mot de passe actuel"
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Nouveau mot de passe"
                      type="password"
                      value={newPassword}
                      onChange={setNewPassword}
                      autoComplete="new-password"
                    />
                    <Field
                      label="Confirmer"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-400">{passwordError}</p>
                  )}
                  {passwordSaved && (
                    <p className="text-sm text-emerald-500">Mot de passe mis à jour.</p>
                  )}
                  <div className="flex justify-end">
                    <SaveButton
                      type="submit"
                      saving={passwordSaving}
                      icon={KeyRound}
                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                      Mettre à jour le mot de passe
                    </SaveButton>
                  </div>
                </form>
              </section>

              {coords && (
                <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--shell-text)]">
                    <MapPin className="h-4 w-4 text-sky-600" />
                    Coordonnées
                  </h3>
                  <p className="mb-4 text-xs text-[var(--shell-text-muted)]">
                    Vous pouvez modifier vos coordonnées et informations bancaires uniquement.
                  </p>
                  <form onSubmit={(e) => void handleCoordsSubmit(e)} className="space-y-3">
                    <Field
                      label="Adresse"
                      value={coords.adresse}
                      onChange={(v) => updateCoord("adresse", v)}
                      icon={MapPin}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Téléphone"
                        value={coords.telephone}
                        onChange={(v) => updateCoord("telephone", v)}
                        icon={Phone}
                      />
                      <Field
                        label="Téléphone secondaire"
                        value={coords.telephoneSecondaire}
                        onChange={(v) => updateCoord("telephoneSecondaire", v)}
                        icon={Phone}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="E-mail professionnel"
                        type="email"
                        value={coords.email}
                        onChange={(v) => updateCoord("email", v)}
                        icon={Mail}
                      />
                      <Field
                        label="E-mail personnel"
                        type="email"
                        value={coords.emailPersonnel}
                        onChange={(v) => updateCoord("emailPersonnel", v)}
                        icon={Mail}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field
                        label="Ville"
                        value={coords.ville}
                        onChange={(v) => updateCoord("ville", v)}
                      />
                      <Field
                        label="Province"
                        value={coords.province}
                        onChange={(v) => updateCoord("province", v)}
                      />
                      <Field
                        label="Pays"
                        value={coords.pays}
                        onChange={(v) => updateCoord("pays", v)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Contact urgence"
                        value={coords.contactUrgence}
                        onChange={(v) => updateCoord("contactUrgence", v)}
                      />
                      <Field
                        label="Tél. urgence"
                        value={coords.telephoneUrgence}
                        onChange={(v) => updateCoord("telephoneUrgence", v)}
                        icon={Phone}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Banque"
                        value={coords.banque}
                        onChange={(v) => updateCoord("banque", v)}
                        icon={CreditCard}
                      />
                      <Field
                        label="N° compte bancaire"
                        value={coords.numeroCompte}
                        onChange={(v) => updateCoord("numeroCompte", v)}
                        icon={CreditCard}
                      />
                    </div>
                    {coordsError && <p className="text-sm text-red-400">{coordsError}</p>}
                    {coordsSaved && (
                      <p className="text-sm text-emerald-500">Coordonnées enregistrées.</p>
                    )}
                    <div className="flex justify-end">
                      <SaveButton
                        type="submit"
                        saving={coordsSaving}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                      >
                        Enregistrer les coordonnées
                      </SaveButton>
                    </div>
                  </form>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-[var(--shell-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--shell-text)]">{value}</dd>
    </div>
  );
}

function ReadonlyChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--shell-surface)] px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-[var(--shell-text-muted)]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[var(--shell-text-muted)]">{label}</p>
        <p className="truncate text-sm text-[var(--shell-text)]">{value || "—"}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[var(--shell-text-muted)]">{label}</span>
      <div className="relative mt-1">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn("input w-full", Icon && "pl-9")}
        />
      </div>
    </label>
  );
}
