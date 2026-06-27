import type { LegalArticle } from "@/lib/legal";

export interface ArticleMatch {
  article: LegalArticle;
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "du",
  "de",
  "et",
  "ou",
  "en",
  "au",
  "aux",
  "pour",
  "par",
  "sur",
  "dans",
  "avec",
  "sans",
  "est",
  "sont",
  "été",
  "être",
  "avoir",
  "que",
  "qui",
  "dont",
  "ce",
  "cette",
  "ces",
  "son",
  "sa",
  "ses",
  "leur",
  "leurs",
  "il",
  "elle",
  "nous",
  "vous",
  "ils",
  "elles",
  "je",
  "tu",
  "mon",
  "ma",
  "mes",
  "notre",
  "votre",
]);

/** Thèmes RH → articles prioritaires + mots déclencheurs */
const CASE_THEMES: {
  label: string;
  articleIds: string[];
  terms: string[];
}[] = [
  {
    label: "Sanctions & discipline",
    articleIds: ["art-54", "art-57", "art-53", "art-62"],
    terms: [
      "sanction",
      "discipline",
      "blâme",
      "blame",
      "réprimande",
      "mise à pied",
      "mise a pied",
      "faute",
      "insubordination",
      "absence",
      "retard",
    ],
  },
  {
    label: "Licenciement & rupture",
    articleIds: ["art-62", "art-63", "art-64", "art-68", "art-72", "art-74", "art-79"],
    terms: [
      "licenciement",
      "licencier",
      "rupture",
      "préavis",
      "preavis",
      "défense",
      "defense",
      "entretien",
      "motif",
      "faute lourde",
      "démission",
      "demission",
    ],
  },
  {
    label: "Contrat de travail",
    articleIds: ["art-36", "art-37", "art-69", "art-71", "art-72"],
    terms: [
      "contrat",
      "cdd",
      "cdi",
      "essai",
      "période d'essai",
      "avenant",
      "clause",
      "embauche",
      "engagement",
    ],
  },
  {
    label: "Congés",
    articleIds: ["art-140", "art-141", "art-144", "art-145", "art-146"],
    terms: [
      "congé",
      "conge",
      "vacances",
      "annuel",
      "maladie",
      "maternité",
      "maternite",
      "circonstance",
      "indemnité compensatoire",
    ],
  },
  {
    label: "Durée du travail",
    articleIds: ["art-119", "art-120", "art-121", "art-124"],
    terms: [
      "heures",
      "heure sup",
      "supplémentaire",
      "45",
      "horaire",
      "nuit",
      "repos",
      "dimanche",
      "overtime",
    ],
  },
  {
    label: "Rémunération & SMIG",
    articleIds: ["art-124", "art-923", "art-925"],
    terms: [
      "salaire",
      "rémunération",
      "remuneration",
      "smig",
      "minimum",
      "prime",
      "paie",
      "bulletin",
      "impayé",
    ],
  },
  {
    label: "Protection & discrimination",
    articleIds: ["art-62", "art-128", "art-129"],
    terms: [
      "discrimination",
      "grossesse",
      "maternité",
      "syndicat",
      "syndical",
      "harcèlement",
      "harcelement",
      "égalité",
    ],
  },
  {
    label: "Obligations employeur",
    articleIds: ["art-55", "art-56"],
    terms: [
      "employeur",
      "sécurité",
      "securite",
      "accident",
      "travail",
      "règlement",
      "reglement",
      "code entreprise",
    ],
  },
  {
    label: "CNSS & social",
    articleIds: ["cnss", "inpp", "onem"],
    terms: ["cnss", "cotisation", "immatriculation", "inpp", "onem", "déclaration", "declaration"],
  },
  {
    label: "Fiscal",
    articleIds: ["irpp"],
    terms: ["irpp", "ipr", "impôt", "impot", "dgi", "fiscal"],
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9àâäéèêëïîôùûüç\s'-]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle || needle.length < 3) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = h.indexOf(n, pos)) !== -1) {
    count += 1;
    pos += n.length;
  }
  return count;
}

function articleNumbersFromText(text: string): string[] {
  const ids: string[] = [];
  const re = /article\s*(?:n°?\s*)?(\d+)(?:er)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    ids.push(`art-${m[1]}`);
  }
  return ids;
}

export function matchArticlesForCase(
  description: string,
  articles: LegalArticle[],
  limit = 12
): ArticleMatch[] {
  const text = description.trim();
  if (!text) return [];

  const tokens = tokenize(text);
  const byId = new Map(articles.map((a) => [a.id, a]));
  const scores = new Map<string, { score: number; reasons: string[] }>();

  const addScore = (id: string, points: number, reason: string) => {
    if (!byId.has(id)) return;
    const cur = scores.get(id) ?? { score: 0, reasons: [] };
    cur.score += points;
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    scores.set(id, cur);
  };

  for (const id of articleNumbersFromText(text)) {
    addScore(id, 80, "Article cité dans le cas");
  }

  for (const theme of CASE_THEMES) {
    const hits = theme.terms.filter(
      (t) => text.toLowerCase().includes(t) || tokens.some((tok) => t.includes(tok) || tok.includes(t))
    );
    if (hits.length > 0) {
      const boost = 25 + hits.length * 8;
      for (const id of theme.articleIds) {
        addScore(id, boost, `Thème : ${theme.label}`);
      }
    }
  }

  for (const article of articles) {
    const corpus = `${article.article} ${article.title} ${article.body} ${article.category}`.toLowerCase();
    let tokenScore = 0;
    for (const token of tokens) {
      const n = countOccurrences(corpus, token);
      if (n > 0) tokenScore += Math.min(n * 4, 16);
    }
    if (tokenScore > 0) {
      addScore(article.id, tokenScore, "Mots-clés du cas");
    }
  }

  return [...scores.entries()]
    .map(([id, { score, reasons }]) => ({
      article: byId.get(id)!,
      score,
      reasons,
    }))
    .filter((m) => m.score > 0 && m.article)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildAnalysisSummary(
  description: string,
  matches: ArticleMatch[]
): string {
  if (!matches.length) {
    return "Aucun article pertinent identifié automatiquement. Précisez le contexte (type de sanction, contrat, congé, licenciement…) ou citez un numéro d'article.";
  }
  const themes = [...new Set(matches.flatMap((m) => m.reasons.filter((r) => r.startsWith("Thème"))))];
  const refs = matches
    .slice(0, 6)
    .map((m) => m.article.article)
    .join(", ");
  const intro = themes.length
    ? `Situation analysée (${themes.slice(0, 2).join(" ; ")}).`
    : "Situation analysée à partir de votre description.";
  return `${intro} Articles recommandés : ${refs}. Consultez le texte intégral dans le panneau de droite.`;
}
