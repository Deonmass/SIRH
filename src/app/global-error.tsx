"use client";

import { useEffect } from "react";
import { AppErrorView } from "@/components/errors/AppErrorView";
import { resolveAppErrorContent } from "@/lib/app-errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const content = resolveAppErrorContent(error);

  useEffect(() => {
    console.error("[SIRH global]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#070b14] text-[#f1f5f9] antialiased">
        <AppErrorView
          kind={content.kind}
          title={content.title}
          message={content.message}
          hint={content.hint}
          onRetry={reset}
          fullPage
        />
      </body>
    </html>
  );
}
