"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionAction } from "@/lib/permissions";

/**
 * Affiche `children` uniquement si l'utilisateur a la permission demandée.
 * Sinon affiche `fallback` (rien par défaut).
 */
export function PermissionGate({
  section,
  action = "read",
  children,
  fallback = null,
}: {
  section: string;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(section, action)) return <>{fallback}</>;
  return <>{children}</>;
}
