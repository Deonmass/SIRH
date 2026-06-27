"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/conformite/checklist", label: "Checklist documents" },
  { href: "/conformite/cnss", label: "CNSS — Vue d'ensemble" },
  { href: "/conformite/cnss/masse-cotisable", label: "Masse cotisable" },
  { href: "/conformite/cnss/checklist-mensuelle", label: "Checklist mensuelle RH" },
  { href: "/conformite/cnss/delais", label: "Délais" },
  { href: "/conformite/onem", label: "ONEM" },
  { href: "/conformite/inpp", label: "INPP" },
  { href: "/conformite/autres", label: "Autres" },
];

export function ConformiteSubNav() {
  const pathname = usePathname();

  return (
    <div className="page-subnav-bar sticky top-[var(--page-header-h)] z-20 -mx-8 mb-4 border-b px-8 backdrop-blur-lg">
      <div className="flex gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (link.href === "/conformite/cnss" &&
              pathname.startsWith("/conformite/cnss") &&
              pathname === "/conformite/cnss") ||
            (link.href !== "/conformite/checklist" &&
              link.href !== "/conformite/cnss" &&
              pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition",
                active
                  ? "bg-amber-600/25 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
                  : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
