export type ImportKind = "employes" | "postes" | "complet";

export type EmployeImportRow = {
  line: number;
  matricule?: string;
  prenom: string;
  nom: string;
  postNom?: string;
  sexe?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  statutMatrimonial?: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  grade?: string;
  departement?: string;
  intitulePoste?: string;
  typeContrat?: string;
  statut?: string;
  dateEmbauche?: string;
  categorie?: number;
  salaireBase?: number;
  devise?: string;
  numeroCnss?: string;
  numeroOnem?: string;
  codePoste?: string;
};

export type PosteImportRow = {
  line: number;
  code?: string;
  intitule: string;
  departement: string;
  grade?: string;
  typeContrat?: string;
  lieu?: string;
  effectif?: number;
  description?: string;
  missions?: string;
  exigences?: string;
  competences?: string;
  kpi?: string;
  matriculeEmploye?: string;
  salaireBase?: number;
  devise?: string;
};

export type ImportRowResult = {
  line: number;
  ok: boolean;
  label: string;
  error?: string;
  id?: string;
};
