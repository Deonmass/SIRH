"use client";

import { cn } from "@/lib/utils";

export interface FolderTab {
  id: string;
  label: string;
  count?: number;
}

export function FolderTabs({
  tabs,
  active,
  onChange,
  className,
  showCounts = true,
  barClassName,
  variant = "folder",
}: {
  tabs: FolderTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  showCounts?: boolean;
  barClassName?: string;
  /** folder = style dossier ; flat = dashboard (actif shell-bg, inactif bordure bas) */
  variant?: "folder" | "flat";
}) {
  const isFlat = variant === "flat";

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div
        className={cn(
          "flex min-w-max items-end gap-0.5",
          !isFlat && "border-b border-[var(--shell-border)]",
          barClassName
        )}
        role="tablist"
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                "shrink-0 cursor-pointer px-4 py-2.5 text-sm font-medium transition whitespace-nowrap",
                isFlat
                  ? isActive
                    ? [
                        "relative z-10 -mb-px rounded-t-lg border border-b-0 border-[var(--shell-border)]",
                        "bg-[var(--shell-bg)] text-[var(--shell-text)]",
                        "after:absolute after:-bottom-px after:left-0 after:right-0 after:z-20 after:h-px after:bg-[var(--shell-bg)] after:content-['']",
                      ]
                    : "border-b border-[var(--shell-border)] bg-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                  : isActive
                    ? [
                        "relative z-10 -mb-px rounded-t-lg border-x border-t border-[var(--shell-border)]",
                        "border-b-0 bg-[var(--shell-bg)] text-[var(--shell-text)] shadow-sm",
                        "after:absolute after:-bottom-px after:left-0 after:right-0 after:z-20 after:h-px after:bg-[var(--shell-bg)] after:content-['']",
                      ]
                    : "bg-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
              )}
            >
              {t.label}
              {showCounts && t.count != null && (
                <span className="ml-1.5 tabular-nums text-xs opacity-70">({t.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
