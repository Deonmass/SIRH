"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  below,
  className,
  compact = false,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Contenu collé sous le titre (ex. onglets dashboard) */
  below?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        "--page-header-h",
        `${el.offsetHeight}px`
      );
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [title, description]);

  return (
    <div
      ref={ref}
      className={cn(
        "page-header-bar sticky top-0 z-30 -mx-8 border-b px-8 backdrop-blur-xl",
        compact ? "page-header-compact" : "mb-4",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-3",
          below && "pb-3"
        )}
      >
        <div className="min-w-0">
          <h1>{title}</h1>
          {description && (
            <p className={cn("max-w-2xl", compact && "!mt-0.5 !text-xs")}>{description}</p>
          )}
        </div>
        {children && (
          <div className="ml-auto flex shrink-0 flex-wrap items-end justify-end gap-2">
            {children}
          </div>
        )}
      </div>
      {below && <div className="-mx-8">{below}</div>}
    </div>
  );
}
