import type {
  DocumentItem,
  EmployeeStatus,
  WorkflowStep,
  WorkflowStepId,
} from "./types";
import { EMPLOYE_STATUT_LABELS } from "./repositories/employes/employe-statut";

export const STATUS_LABELS: Record<
  EmployeeStatus,
  { label: string; color: string; description: string }
> = {
  candidat: {
    label: EMPLOYE_STATUT_LABELS.candidat,
    color: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    description: "En cours de recrutement (7 étapes)",
  },
  pre_embauche: {
    label: EMPLOYE_STATUT_LABELS.pre_embauche,
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    description: "Offre acceptée, dossier en constitution",
  },
  essai: {
    label: EMPLOYE_STATUT_LABELS.essai,
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    description: "Art. 71-72 — préavis 3 jours ouvrables",
  },
  actif: {
    label: EMPLOYE_STATUT_LABELS.actif,
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    description: "Contrat en cours d'exécution",
  },
  conge: {
    label: EMPLOYE_STATUT_LABELS.conge,
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    description: "Congé annuel ou circonstance (Art. 140-146)",
  },
  suspendu: {
    label: EMPLOYE_STATUT_LABELS.suspendu,
    color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    description: "Suspension pour enquête (Art. 72)",
  },
  preavis: {
    label: EMPLOYE_STATUT_LABELS.preavis,
    color: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    description: "Rupture notifiée (Art. 64)",
  },
  sorti: {
    label: EMPLOYE_STATUT_LABELS.sorti,
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
    description: "Fin de contrat régulière",
  },
  licencie: {
    label: EMPLOYE_STATUT_LABELS.licencie,
    color: "bg-red-500/20 text-red-300 border-red-500/40",
    description: "Rupture pour motif disciplinaire ou économique",
  },
};

const WORKFLOW_DEFS: {
  id: WorkflowStepId;
  label: string;
  description: string;
  legalRef?: string;
}[] = [
  {
    id: "analyse_besoin",
    label: "1. Analyse du besoin",
    description: "Fiche de poste, budget, type de contrat (CDI/CDD)",
    legalRef: "Guide RH RDC — Partie 11",
  },
  {
    id: "validation_interne",
    label: "2. Validation interne",
    description: "Approbation manager, direction et RH",
  },
  {
    id: "sourcing",
    label: "3. Sourcing",
    description: "Annonces, ONEM, réseaux, cooptation",
    legalRef: "ONEM — déclaration des vacances",
  },
  {
    id: "preselection",
    label: "4. Présélection CV",
    description: "Grille de critères et short-list",
  },
  {
    id: "entretiens",
    label: "5. Entretiens",
    description: "RH + opérationnel, grille de notation",
    legalRef: "Art. 62 — questions interdites",
  },
  {
    id: "verifications",
    label: "6. Vérifications",
    description: "Références, diplômes, casier si poste sensible",
  },
  {
    id: "proposition_integration",
    label: "7. Proposition & intégration",
    description: "Offre salariale, date d'entrée, onboarding",
    legalRef: "Art. 36 — éléments du contrat",
  },
  {
    id: "contrat_signature",
    label: "Contrat signé",
    description: "Contrat écrit, SMIG respecté, copie remise",
    legalRef: "Art. 36-37, Loi 015/2002",
  },
  {
    id: "declaration_cnss",
    label: "Déclaration CNSS",
    description: "Immatriculation sous 8 jours (pratique)",
    legalRef: "CNSS — cotisation 18% (5% + 13%)",
  },
  {
    id: "declaration_onem",
    label: "Déclaration ONEM",
    description: "Engagement déclaré, contribution 0,5%",
    legalRef: "ONEM — avant le 10 du mois suivant",
  },
  {
    id: "onboarding_j1",
    label: "Onboarding J1",
    description: "Badge, équipe, sécurité, règlement intérieur",
    legalRef: "Annexe F — Guide RH",
  },
  {
    id: "onboarding_j30",
    label: "Fin période d'essai J30",
    description: "Validation ou rupture (3 jours préavis)",
    legalRef: "Art. 71-72",
  },
];

export function createDefaultWorkflow(completedUntil = 0): WorkflowStep[] {
  return WORKFLOW_DEFS.map((def, i) => ({
    ...def,
    completed: i < completedUntil,
    completedAt: i < completedUntil ? new Date().toISOString() : undefined,
  }));
}

export const DEFAULT_DOCUMENTS: Omit<DocumentItem, "received" | "receivedAt">[] = [
  {
    id: "doc_cni",
    label: "Carte d'identité / Passeport",
    category: "identite",
    required: true,
    legalRef: "Identification légale",
  },
  {
    id: "doc_photo",
    label: "Photo d'identité",
    category: "identite",
    required: true,
  },
  {
    id: "doc_contrat",
    label: "Contrat de travail signé",
    category: "contrat",
    required: true,
    legalRef: "Art. 36 — Loi 015/2002",
  },
  {
    id: "doc_reglement",
    label: "Accusé réception règlement d'entreprise",
    category: "contrat",
    required: true,
    legalRef: "Art. 1464-1477",
  },
  {
    id: "doc_diplomes",
    label: "Copies diplômes / certificats",
    category: "formation",
    required: true,
  },
  {
    id: "doc_cnss",
    label: "Attestation immatriculation CNSS",
    category: "social",
    required: true,
    legalRef: "CNSS — déclaration nominative",
  },
  {
    id: "doc_numero_cnss",
    label: "Numéro CNSS enregistré (fiche)",
    category: "social",
    required: true,
    legalRef: "Numéro d'affiliation obligatoire",
  },
  {
    id: "doc_onem",
    label: "Déclaration ONEM (engagement)",
    category: "social",
    required: true,
    legalRef: "ONEM 0,5% masse salariale",
  },
  {
    id: "doc_onem_attestation",
    label: "Attestation / accusé ONEM",
    category: "social",
    required: true,
    legalRef: "Déclaration avant le 10 du mois",
  },
  {
    id: "doc_acte_mariage",
    label: "Acte de mariage",
    category: "famille",
    required: false,
    legalRef: "Si statut marié — allocations familiales",
  },
  {
    id: "doc_convocation_discipline",
    label: "Convocation entretien disciplinaire",
    category: "formation",
    required: false,
    legalRef: "Art. 54 — droit de défense",
  },
  {
    id: "doc_pv_discipline",
    label: "Procès-verbal disciplinaire",
    category: "formation",
    required: false,
    legalRef: "Art. 54 — traçabilité sanction",
  },
  {
    id: "doc_jugement_enfant",
    label: "Jugement garde / adoption (enfants)",
    category: "famille",
    required: false,
    legalRef: "Enfant à charge — pièce justificative",
  },
  {
    id: "doc_medical",
    label: "Visite médicale d'embauche",
    category: "medical",
    required: false,
  },
  {
    id: "doc_bancaire",
    label: "Coordonnées bancaires (RIB)",
    category: "bancaire",
    required: true,
  },
  {
    id: "doc_famille",
    label: "Actes état civil (conjoint/enfants)",
    category: "social",
    required: false,
    legalRef: "Allocations familiales CNSS",
  },
  {
    id: "doc_casier",
    label: "Extrait casier judiciaire",
    category: "identite",
    required: false,
  },
];

export function createDefaultDocuments(
  receivedIds: string[] = []
): DocumentItem[] {
  return DEFAULT_DOCUMENTS.map((d) => ({
    ...d,
    received: receivedIds.includes(d.id),
    receivedAt: receivedIds.includes(d.id)
      ? new Date().toISOString()
      : undefined,
  }));
}

export { DEFAULT_GRADES as GRADES } from "./default-settings";

export const DOCUMENT_COMPLIANCE_LABELS: Record<string, string> = {
  doc_onem: "Déclaration ONEM",
  doc_onem_attestation: "Attestation ONEM",
  doc_numero_cnss: "Numéro CNSS",
  doc_cnss: "Attestation CNSS",
  doc_acte_mariage: "Acte de mariage",
  doc_jugement_enfant: "Jugement enfants",
  doc_cni: "CNI / Passeport",
  doc_contrat: "Contrat signé",
  doc_bancaire: "RIB bancaire",
  doc_convocation_discipline: "Convocation disciplinaire",
  doc_pv_discipline: "PV disciplinaire",
};

export { DEFAULT_DEPARTMENTS as DEPARTMENTS, DEFAULT_CATEGORIES as CATEGORIES } from "./default-settings";

export const CONGE_CIRCONSTANCE = [
  { event: "Mariage du travailleur", days: 2 },
  { event: "Accouchement de l'épouse", days: 2 },
  { event: "Décès conjoint ou parent 1er degré", days: 4 },
  { event: "Mariage d'un enfant", days: 1 },
  { event: "Décès parent/allié 2e degré", days: 2 },
];
