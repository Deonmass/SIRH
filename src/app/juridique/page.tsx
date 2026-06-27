"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeletons";
import { DocumentViewer } from "@/components/juridique/DocumentViewer";
import { GuideRhRdcPanel } from "@/components/juridique/GuideRhRdcPanel";
import { LegalArticlesPanel } from "@/components/juridique/LegalArticlesPanel";
import { LegalCasesPanel } from "@/components/juridique/LegalCasesPanel";

type JuridiqueSection = "guide" | "cases" | "documents" | "articles";

const VALID_TABS: JuridiqueSection[] = ["documents", "articles", "cases", "guide"];

function parseTab(value: string | null): JuridiqueSection | null {
  if (value && VALID_TABS.includes(value as JuridiqueSection)) {
    return value as JuridiqueSection;
  }
  return null;
}

function JuridiquePageContent() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<JuridiqueSection>("documents");

  useEffect(() => {
    const tab = parseTab(searchParams.get("tab"));
    if (tab) setSection(tab);
  }, [searchParams]);

  const tabClass = (active: boolean, accent: "amber" | "violet" | "sky") => {
    const colors = {
      amber: active ? "border-amber-500 text-amber-400" : "",
      violet: active ? "border-violet-500 text-violet-400" : "",
      sky: active ? "border-sky-500 text-sky-400" : "",
    };
    return `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      active ? colors[accent] : "border-transparent text-slate-400"
    }`;
  };

  return (
    <>
      <PageHeader
        title="Guide RH RDC"
        description="Manuel pratique 2026, cas pratiques, Code du travail (Loi 015/2002) et documents officiels"
      />

      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6">
        <button
          type="button"
          onClick={() => setSection("documents")}
          className={tabClass(section === "documents", "sky")}
        >
          Documents officiels
        </button>
        <button
          type="button"
          onClick={() => setSection("articles")}
          className={tabClass(section === "articles", "sky")}
        >
          Articles du Code
        </button>
        <button
          type="button"
          onClick={() => setSection("cases")}
          className={tabClass(section === "cases", "violet")}
        >
          Gestion des cas
        </button>
        <button
          type="button"
          onClick={() => setSection("guide")}
          className={tabClass(section === "guide", "amber")}
        >
          Guide RH RDC
        </button>
      </div>

      {section === "documents" && <DocumentViewer />}

      {section === "articles" && <LegalArticlesPanel />}

      {section === "cases" && <LegalCasesPanel />}

      {section === "guide" && <GuideRhRdcPanel />}
    </>
  );
}

export default function JuridiquePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="default" />}>
      <JuridiquePageContent />
    </Suspense>
  );
}
