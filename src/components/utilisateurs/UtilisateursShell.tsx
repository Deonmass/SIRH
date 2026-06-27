"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

/** En-tête partagé sauf sur Permissions (titre + select dédiés sur cette page). */
export function UtilisateursShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCustomHeader =
    pathname.startsWith("/utilisateurs/permissions") ||
    pathname === "/utilisateurs/compte" ||
    pathname === "/utilisateurs/logs";

  if (isCustomHeader) {
    return <>{children}</>;
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Comptes, permissions et journal d'activité."
      />
      {children}
    </div>
  );
}
