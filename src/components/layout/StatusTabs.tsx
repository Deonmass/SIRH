"use client";

import { cn } from "@/lib/utils";

export interface StatusTab {
  id: string;
  label: string;
  count: number;
}

export function StatusTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: StatusTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="page-subnav-bar sticky top-[var(--page-header-h)] z-20 -mx-8 mb-4 border-b px-8 backdrop-blur-lg">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap",
              active === tab.id
                ? "bg-sky-600/30 text-sky-600 ring-1 ring-sky-500/40 dark:text-sky-300"
                : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-2 rounded-md px-1.5 py-0.5 text-xs",
                active === tab.id ? "bg-sky-500/30" : "bg-[var(--shell-surface)]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
