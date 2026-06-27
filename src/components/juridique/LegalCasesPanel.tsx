"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSearch, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { ArticlePreview } from "@/components/juridique/ArticlePreview";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import { matchArticlesForCase } from "@/lib/legal-case-match";
import type { LegalCase, LegalCaseStatus } from "@/lib/legal-cases-store";

const PANEL_CLASS = "flex h-[min(calc(100dvh-14rem),880px)] min-h-[420px] gap-4 overflow-hidden";

const STATUS_LABELS: Record<LegalCaseStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
};

export function LegalCasesPanel() {
  const { articles, loading: articlesLoading, error: articlesError } = useLegalArticles();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<LegalCaseStatus>("open");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    try {
      const res = await fetch("/api/juridique/cases");
      if (res.ok) {
        const data = (await res.json()) as LegalCase[];
        setCases(data);
      }
    } finally {
      setCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeId) ?? null,
    [cases, activeId]
  );

  const liveMatches = useMemo(() => {
    if (!description.trim() || !articles.length) return [];
    return matchArticlesForCase(description, articles, 10);
  }, [description, articles]);

  const displayMatches = useMemo(() => {
    if (activeCase?.matchedArticleIds?.length && !isNew) {
      return activeCase.matchedArticleIds
        .map((id) => articles.find((a) => a.id === id))
        .filter(Boolean)
        .map((article) => ({
          article: article!,
          score: 0,
          reasons: ["Analyse enregistrée"],
        }));
    }
    return liveMatches;
  }, [activeCase, liveMatches, articles, isNew]);

  const previewArticle = useMemo(() => {
    const id = selectedArticleId ?? displayMatches[0]?.article.id;
    return id ? articles.find((a) => a.id === id) : null;
  }, [selectedArticleId, displayMatches, articles]);

  function selectCase(c: LegalCase) {
    setActiveId(c.id);
    setIsNew(false);
    setTitle(c.title);
    setDescription(c.description);
    setStatus(c.status);
    setSelectedArticleId(c.matchedArticleIds[0] ?? null);
  }

  function startNewCase() {
    setActiveId(null);
    setIsNew(true);
    setTitle("");
    setDescription("");
    setStatus("open");
    setSelectedArticleId(null);
  }

  async function saveCase(reanalyze = true) {
    if (!description.trim()) return;
    setSaving(true);
    try {
      if (isNew || !activeId) {
        const res = await fetch("/api/juridique/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, status }),
        });
        if (!res.ok) throw new Error("Création impossible");
        const created = (await res.json()) as LegalCase;
        setCases((prev) => [created, ...prev]);
        selectCase(created);
        setIsNew(false);
      } else {
        const res = await fetch(`/api/juridique/cases/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, status, reanalyze }),
        });
        if (!res.ok) throw new Error("Mise à jour impossible");
        const updated = (await res.json()) as LegalCase;
        setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        selectCase(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCase() {
    if (!activeId || !confirm("Supprimer ce cas ?")) return;
    await fetch(`/api/juridique/cases/${activeId}`, { method: "DELETE" });
    setCases((prev) => prev.filter((c) => c.id !== activeId));
    startNewCase();
  }

  if (articlesLoading) {
    return (
      <div className={`${PANEL_CLASS} gap-4`}>
        <div className="flex h-full w-[30%] shrink-0 flex-col gap-2 rounded-xl border border-[var(--shell-border)] p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    );
  }

  if (articlesError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 text-sm">
        {articlesError}
      </div>
    );
  }

  return (
    <div className={PANEL_CLASS}>
      <aside className="flex h-full min-h-0 w-[30%] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <div className="shrink-0 border-b border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Mes cas</h2>
            <button
              type="button"
              onClick={startNewCase}
              className="rounded-lg bg-sky-600/80 p-1.5 text-white hover:bg-sky-500"
              title="Nouveau cas"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500">{cases.length} dossier(s)</p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {casesLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="p-1">
                <Skeleton className="h-14 w-full rounded-lg" />
              </li>
            ))}
          {cases.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCase(c)}
                className={`w-full rounded-lg px-3 py-2 text-left ${
                  activeId === c.id && !isNew
                    ? "bg-sky-500/20 border border-sky-500/40"
                    : "border border-transparent hover:bg-white/5"
                }`}
              >
                <p className="text-sm font-medium text-white line-clamp-1">{c.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {STATUS_LABELS[c.status]} · {c.matchedArticleIds.length} art.
                </p>
              </button>
            </li>
          ))}
          {!casesLoading && cases.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-slate-500">
              Aucun cas. Cliquez + pour commencer.
            </li>
          )}
        </ul>
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 p-4 space-y-3 max-h-[38%] overflow-y-auto overscroll-contain">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du cas (ex. Mise à pied — absence répétée)"
              className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LegalCaseStatus)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {(Object.keys(STATUS_LABELS) as LegalCaseStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void saveCase(true)}
              disabled={saving || !description.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSearch className="h-3.5 w-3.5" />
              )}
              Analyser & enregistrer
            </button>
            {activeId && !isNew && (
              <>
                <button
                  type="button"
                  onClick={() => void saveCase(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  <Save className="h-3.5 w-3.5" />
                  Sauver
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCase()}
                  className="rounded-lg border border-rose-500/30 p-2 text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Décrivez la situation : faits, dates, type de contrat, mesures déjà prises, question juridique…"
            className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          {activeCase?.analysisSummary && !isNew && (
            <p className="text-xs text-sky-300/90 leading-relaxed border-t border-white/10 pt-2">
              {activeCase.analysisSummary}
            </p>
          )}
          {isNew && liveMatches.length > 0 && (
            <p className="text-xs text-slate-400">
              Aperçu : {liveMatches.length} article(s) potentiel(s) — enregistrez pour fixer
              l&apos;analyse.
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="flex h-full min-h-0 w-[30%] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className="shrink-0 border-b border-white/10 px-3 py-2 flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-white">
                Articles applicables ({displayMatches.length})
              </span>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
              {displayMatches.map(({ article, reasons }) => (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`w-full rounded-lg px-2.5 py-2 text-left ${
                      previewArticle?.id === article.id
                        ? "bg-emerald-500/15 border border-emerald-500/35"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Badge className="text-[10px] px-1 py-0 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      {article.article}
                    </Badge>
                    <p className="mt-1 text-xs text-white line-clamp-2">{article.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{reasons[0]}</p>
                  </button>
                </li>
              ))}
              {displayMatches.length === 0 && (
                <li className="p-4 text-center text-xs text-slate-500">
                  Saisissez la situation pour détecter les articles.
                </li>
              )}
            </ul>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {previewArticle ? (
              <ArticlePreview article={previewArticle} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                Sélectionnez un article recommandé.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
