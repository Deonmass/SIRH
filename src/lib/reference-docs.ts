export interface ReferenceDocument {
  id: string;
  title: string;
  description: string;
  file: string;
  type: "pdf" | "docx";
  source: string;
}

export const REFERENCE_DOCUMENTS: ReferenceDocument[] = [
  {
    id: "code-travail",
    title: "Code du travail RDC",
    description: "Loi n°015/2002 du 16 octobre 2002 — Journal Officiel",
    file: "/docs/code-du-travail.pdf",
    type: "pdf",
    source: "Journal Officiel RDC",
  },
  {
    id: "droit-congolais",
    title: "Droit congolais du travail",
    description: "Manuel — Jacqueline Masanga Phoba Mvioki (L'Harmattan)",
    file: "/docs/droit-congolais-du-travail.pdf",
    type: "pdf",
    source: "ISBN 978-2-343-06372-0",
  },
  {
    id: "larcier",
    title: "Codes Larcier — Travail & Sécurité sociale",
    description: "Tome IV — République démocratique du Congo",
    file: "/docs/codes-larcier-travail.pdf",
    type: "pdf",
    source: "De Boeck & Larcier",
  },
  {
    id: "guide-rh",
    title: "Guide complet RH RDC",
    description: "Manuel pratique 2026 — Contrat, paie, CNSS, ONEM, congés",
    file: "/docs/Guide_Complet_RH_RDC.docx",
    type: "docx",
    source: "Guide RH RDC 2026",
  },
];
