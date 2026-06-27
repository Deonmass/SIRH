/** Ligne SQL `public.utilisateurs` (colonne mot de passe : `passeword`). */
export type DbUtilisateurRow = {
  id: number;
  username: string;
  passeword: string;
  matricul_agent: string | null;
  permissions: Record<string, unknown> | null;
  statut: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};
