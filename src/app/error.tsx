"use client";

import { useEffect } from "react";
import { AppErrorView } from "@/components/errors/AppErrorView";
import { resolveAppErrorContent } from "@/lib/app-errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const content = resolveAppErrorContent(error);

  useEffect(() => {
    console.error("[SIRH]", error);
  }, [error]);

  return (
    <AppErrorView
      kind={content.kind}
      title={content.title}
      message={content.message}
      hint={content.hint}
      onRetry={reset}
    />
  );
}
