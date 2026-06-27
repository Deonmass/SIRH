"use client";

import { Moon, Sun } from "lucide-react";
import { useLayout } from "@/contexts/LayoutContext";
import { cn } from "@/lib/utils";

export function ThemeModeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useLayout();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex items-center rounded-xl text-sm",
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
      )}
      title="Mode Light/dark"
    >
      {!collapsed && (
        <span className="flex-1 text-sm font-medium text-[var(--shell-text-muted)]">
          Mode Light/dark
        </span>
      )}
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed ? "" : "shrink-0"
        )}
      >
        <Sun
          className={cn(
            "h-4 w-4 transition-colors",
            !isDark ? "text-amber-500" : "text-[var(--shell-text-muted)]"
          )}
          aria-hidden
        />
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
            "border-[var(--shell-border)] bg-[var(--shell-surface)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-sky-600 shadow-sm transition-transform duration-200",
              isDark ? "translate-x-[1.35rem]" : "translate-x-0.5"
            )}
          />
        </button>
        <Moon
          className={cn(
            "h-4 w-4 transition-colors",
            isDark ? "text-sky-400" : "text-[var(--shell-text-muted)]"
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}
