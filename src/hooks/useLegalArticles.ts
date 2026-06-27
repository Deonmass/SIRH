"use client";

import { useEffect, useState } from "react";
import {
  CODE_TRAVAIL_DATA_URL,
  mergeCodeTravailArticles,
  type LegalArticle,
} from "@/lib/legal";

export function useLegalArticles() {
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CODE_TRAVAIL_DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LegalArticle[];
        if (!cancelled) {
          setArticles(mergeCodeTravailArticles(data));
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Impossible de charger le Code du travail. Exécutez : npm run extract:code-travail"
          );
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { articles, loading, error };
}
