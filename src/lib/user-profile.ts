export type UserProfile = {
  prenom: string;
  nom: string;
  email: string;
  poste: string;
  departement: string;
  telephone: string;
  avatarColor: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  prenom: "Utilisateur",
  nom: "RH",
  email: "rh@sirh-rdc.local",
  poste: "Responsable RH",
  departement: "Ressources humaines",
  telephone: "+243 000 000 000",
  avatarColor: "#0284c7",
};

export const USER_PROFILE_STORAGE_KEY = "sirh-user-profile";

export function readUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_USER_PROFILE;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_USER_PROFILE;
}

export function persistUserProfile(profile: UserProfile) {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function resetUserProfile(): UserProfile {
  persistUserProfile(DEFAULT_USER_PROFILE);
  return DEFAULT_USER_PROFILE;
}
