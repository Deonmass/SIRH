"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArticlePreview } from "@/components/juridique/ArticlePreview";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import { searchLegalArticles } from "@/lib/legal";

export function LegalArticlesPanel() {
  const { articles: allArticles, loading, error: loadError } = useLegalArticles();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const articles = useMemo(() => {
    let list = searchLegalArticles(allArticles, query);
    if (category !== "all") list = list.filter((a) => a.category === category);
    return list;
  }, [allArticles, query, category]);

  const categories = useMemo(
    () => ["all", ...new Set(allArticles.map((a) => a.category).filter(Boolean))].sort(),
    [allArticles]
  );

  const active = useMemo(() => {
    if (!articles.length) return null;
    if (selectedId && articles.some((a) => a.id === selectedId)) {
      return articles.find((a) => a.id === selectedId)!;
    }
    return articles[0];
  }, [articles, selectedId]);

  useEffect(() => {
    if (!articles.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !articles.some((a) => a.id === selectedId)) {
      setSelectedId(articles[0].id);
    }
  }, [articles, selectedId]);

  if (loading) {
    return (
      <div className="grid h-[min(calc(100dvh-14rem),880px)] min-h-[420px] gap-4 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-[var(--shell-border)] p-3 lg:col-span-1">
          <Skeleton className="mb-3 h-9 w-full rounded-lg" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="rounded-xl lg:col-span-2" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 text-sm">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex h-[min(calc(100dvh-14rem),880px)] min-h-[420px] gap-4 overflow-hidden">
      <aside className="flex h-full min-h-0 w-[30%] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Articles du Code</h2>
            <p className="text-xs text-slate-500">
              {articles.length} / {allArticles.length} — Loi n°015/2002 (texte intégral)
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Rechercher un article, mot-clé…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-white text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Toutes les rubriques" : c}
              </option>
            ))}
          </select>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {articles.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active?.id === a.id
                    ? "bg-sky-500/20 border border-sky-500/40"
                    : "border border-transparent hover:bg-white/5"
                }`}
              >
                <span className="inline-block rounded bg-sky-500/15 px-1.5 py-0 text-[10px] text-sky-300 border border-sky-500/25">
                  {a.article}
                </span>
                <p className="mt-1.5 text-sm font-medium text-white line-clamp-2">{a.title}</p>
              </button>
            </li>
          ))}
          {articles.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-500">Aucun article trouvé.</li>
          )}
        </ul>
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {active ? (
          <ArticlePreview article={active} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-slate-500 text-sm">
            Aucun article à afficher.
          </div>
        )}
      </section>
    </div>
  );
}
