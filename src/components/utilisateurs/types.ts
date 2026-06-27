import type { Utilisateur } from "@/lib/types";

export type UtilisateurRow = Utilisateur & { employeeName?: string | null };
