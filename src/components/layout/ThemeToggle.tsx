"use client";

import { Moon, Sun } from "lucide-react";
import { useLayout } from "@/contexts/LayoutContext";
import { cn } from "@/lib/utils";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useLayout();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]",
        collapsed ? "h-10 w-10" : "w-full px-3 py-2.5 text-sm"
      )}
    >
      {isDark ? (
        <Sun className="icon-hover-scale h-4 w-4 shrink-0" />
      ) : (
        <Moon className="icon-hover-scale h-4 w-4 shrink-0" />
      )}
      {!collapsed && <span>{isDark ? "Mode clair" : "Mode sombre"}</span>}
    </button>
  );
}
