"use client";

import { usePathname } from "next/navigation";
import type { AuthUser } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import type { AppSettings } from "@/lib/types";
import { RoutePermissionGuard } from "@/components/auth/RoutePermissionGuard";
import { AppShell } from "./AppShell";

export function ConditionalAppShell({
  children,
  initialUser,
  initialSettings,
  initialRevision,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
  initialSettings: AppSettings;
  initialRevision: string;
}) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <AuthProvider initialUser={initialUser}>
      <SettingsProvider initialSettings={initialSettings} initialRevision={initialRevision}>
        <RoutePermissionGuard />
        <AppShell>{children}</AppShell>
      </SettingsProvider>
    </AuthProvider>
  );
}
