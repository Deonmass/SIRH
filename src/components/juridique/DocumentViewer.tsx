"use client";

import { useState } from "react";
import { BookOpen, Download, ExternalLink } from "lucide-react";
import { CardContent, CardHeader } from "@/components/ui/Card";
import { REFERENCE_DOCUMENTS } from "@/lib/reference-docs";

export function DocumentViewer() {
  const [activeId, setActiveId] = useState(REFERENCE_DOCUMENTS[0]?.id ?? "");
  const active = REFERENCE_DOCUMENTS.find((d) => d.id === activeId);

  return (
    <div className="flex h-[min(calc(100dvh-14rem),880px)] min-h-[420px] gap-4 overflow-hidden">
      <aside className="flex h-full min-h-0 w-[30%] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Documents</h2>
          <p className="text-xs text-slate-500">{REFERENCE_DOCUMENTS.length} références</p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {REFERENCE_DOCUMENTS.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => setActiveId(doc.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeId === doc.id
                    ? "bg-sky-500/20 border border-sky-500/40"
                    : "border border-transparent hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{doc.source}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {active ? (
          <>
            <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-white/10 bg-black/30">
              <div className="min-w-0">
                <h2 className="font-semibold text-white truncate">{active.title}</h2>
                <p className="text-xs text-slate-400 truncate">{active.description}</p>
              </div>
              <a
                href={active.file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
              >
                <ExternalLink className="h-3 w-3" /> Nouvel onglet
              </a>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0">
              {active.type === "pdf" ? (
                <iframe
                  src={active.file}
                  title={active.title}
                  className="block h-full min-h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex min-h-full flex-col items-center justify-center p-8 text-center text-slate-400">
                  <p className="mb-4">
                    Le format Word (.docx) ne peut pas être affiché dans le navigateur.
                  </p>
                  <a
                    href={active.file}
                    download
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-white font-medium"
                  >
                    <Download className="h-5 w-5" />
                    Télécharger le Guide RH RDC (.docx)
                  </a>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-slate-500 text-sm">
            Sélectionnez un document dans la liste.
          </div>
        )}
      </section>
    </div>
  );
}
