"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { LegalArticle } from "@/lib/legal";

export function ArticlePreview({ article }: { article: LegalArticle }) {
  return (
    <Card className="flex h-full min-h-0 flex-col !rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="shrink-0 border-b border-white/10 pb-4">
        <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 w-fit">
          {article.article}
        </Badge>
        <h2 className="mt-3 text-xl font-semibold text-white">{article.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{article.category}</p>
        <p className="mt-1 text-xs text-slate-500">{article.source}</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-200">
          {article.body}
        </p>
        {article.keywords.length > 0 && (
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Mots-clés
            </h3>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
