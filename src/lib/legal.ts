export interface LegalArticle {
  id: string;
  article: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  source: string;
  keywords: string[];
}

/** Références pratiques (CNSS, INPP, etc.) en complément du Code extrait du PDF. */
export const SUPPLEMENTARY_ARTICLES: LegalArticle[] = [
  {
    id: "cnss",
    article: "CNSS",
    title: "Cotisations sociales (18%)",
    summary:
      "Pensions 10% (5%+5%), prestations familiales 6,5% (employeur), risques pro. 1,5% (employeur). Déclaration sous 15 jours. Immatriculation obligatoire.",
    body:
      "Pensions 10% (5%+5%), prestations familiales 6,5% (employeur), risques professionnels 1,5% (employeur). Déclaration sous 15 jours. Immatriculation obligatoire de l'employeur et des travailleurs.",
    category: "Social",
    source: "Guide RH RDC / CNSS",
    keywords: ["CNSS", "5%", "13%", "18%"],
  },
  {
    id: "inpp",
    article: "INPP",
    title: "Contribution formation professionnelle",
    summary:
      "Sur la rémunération totale : public 4 % ; privé 3,5 % (1–50 sal.), 3 % (51–300), 2 % (> 300). Charge exclusive employeur. Déclaration trimestrielle.",
    body:
      "Sur la rémunération totale : secteur public 4 % ; secteur privé 3,5 % (1–50 salariés), 3 % (51–300), 2 % (> 300). Charge exclusive employeur. Déclaration trimestrielle.",
    category: "Social",
    source: "Guide RH RDC / INPP",
    keywords: ["INPP", "formation"],
  },
  {
    id: "irpp",
    article: "IRPP",
    title: "Impôt sur les revenus des personnes physiques (ex-IPR)",
    summary:
      "Barème progressif annuel : 3 % (0–1 944 000 FC), 15 %, 30 %, 40 % (surplus). Plancher 2 500 FC/mois ; plafond 30 % du revenu imposable. Abattement 2 % par personne à charge (max. 9).",
    body:
      "Barème progressif annuel : 3 % (0–1 944 000 FC), 15 %, 30 %, 40 % (surplus). Plancher 2 500 FC/mois ; plafond 30 % du revenu imposable. Abattement 2 % par personne à charge (max. 9).",
    category: "Fiscal",
    source: "Code des impôts — DGI",
    keywords: ["IRPP", "IPR", "impôt", "DGI"],
  },
  {
    id: "onem",
    article: "ONEM",
    title: "Contribution à l'emploi",
    summary:
      "0,5% de la rémunération mensuelle, charge employeur. Déclaration avant le 10 du mois suivant. Paiement sous 15 jours. Majoration 0,5%/jour de retard.",
    body:
      "0,5% de la rémunération mensuelle, charge employeur. Déclaration avant le 10 du mois suivant. Paiement sous 15 jours. Majoration 0,5%/jour de retard.",
    category: "Social",
    source: "Guide RH RDC / ONEM",
    keywords: ["ONEM", "0.5%", "emploi"],
  },
  {
    id: "loi-16-010",
    article: "Loi n°16/010",
    title: "Modification du Code du travail",
    summary:
      "Loi du 15 juillet 2016 modifiant la Loi n°015/2002. Texte de référence actualisé pour la pratique RH en RDC.",
    body:
      "Loi du 15 juillet 2016 modifiant la Loi n°015/2002 portant Code du travail. Texte de référence actualisé pour la pratique RH en RDC (vérifier les articles modifiés dans le Journal Officiel).",
    category: "Référence",
    source: "Journal Officiel RDC",
    keywords: ["2016", "modification"],
  },
];

export const CODE_TRAVAIL_DATA_URL = "/data/code-travail-articles.json";

export function searchLegalArticles(
  articles: LegalArticle[],
  query: string
): LegalArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return articles;
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      a.article.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
  );
}

export function mergeCodeTravailArticles(codeArticles: LegalArticle[]): LegalArticle[] {
  return [...codeArticles, ...SUPPLEMENTARY_ARTICLES];
}
