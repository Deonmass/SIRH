/** Utilisateurs RH pour validateurs de congés (pas encore de table users). */

export type RhUser = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  poste?: string;
};

export const RH_USERS: RhUser[] = [
  {
    id: "rh-admin",
    prenom: "Gedeon",
    nom: "Massadi",
    email: "g.massadi@sirh-rdc.local",
    poste: "HR Admin",
  },
  {
    id: "rh-1",
    prenom: "Marie",
    nom: "Kabongo",
    email: "m.kabongo@sirh-rdc.local",
    poste: "Responsable RH",
  },
  {
    id: "rh-2",
    prenom: "Jean",
    nom: "Mukendi",
    email: "j.mukendi@sirh-rdc.local",
    poste: "Gestionnaire paie",
  },
  {
    id: "rh-3",
    prenom: "Claudine",
    nom: "Ilunga",
    email: "c.ilunga@sirh-rdc.local",
    poste: "Assistante RH",
  },
];

export function rhUserLabel(id: string | null | undefined): string {
  if (!id) return "—";
  const u = RH_USERS.find((x) => x.id === id);
  if (!u) return id;
  return `${u.prenom} ${u.nom}`;
}

export function rhUserById(id: string): RhUser | undefined {
  return RH_USERS.find((x) => x.id === id);
}

/** Associe le profil local à un utilisateur RH (pour validations). */
export function resolveRhUserIdFromProfile(profile: {
  email?: string;
  prenom?: string;
  nom?: string;
}): string {
  const byEmail = RH_USERS.find(
    (u) => profile.email && u.email.toLowerCase() === profile.email.toLowerCase()
  );
  if (byEmail) return byEmail.id;
  const byName = RH_USERS.find(
    (u) =>
      u.prenom.toLowerCase() === (profile.prenom ?? "").toLowerCase() &&
      u.nom.toLowerCase() === (profile.nom ?? "").toLowerCase()
  );
  return byName?.id ?? RH_USERS[0]!.id;
}
