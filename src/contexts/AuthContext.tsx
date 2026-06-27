"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  canAccessHref,
  canAccessModule,
  canAccessSection,
  canEditSalaryAmounts,
  canViewSalaryAmounts,
  fullPermissionMatrix,
  isAdminUsername,
  normalizePermissionMatrix,
  type PermissionAction,
  type PermissionMatrix,
} from "@/lib/permissions";

export type AuthUser = {
  id: string;
  username: string;
  matriculAgent: string | null;
  /** Département de l'agent lié au compte (validation congés). */
  validatorDepartment?: string | null;
  permissions: PermissionMatrix;
};

type AuthContextValue = {
  user: AuthUser | null;
  permissions: PermissionMatrix;
  isAdmin: boolean;
  can: (sectionId: string, action?: PermissionAction) => boolean;
  canHref: (href: string) => boolean;
  canModule: (moduleId: string) => boolean;
  canViewSalaries: boolean;
  canEditSalaries: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  /** Rafraîchit les permissions depuis la base (après login ou changement admin). */
  useEffect(() => {
    if (!initialUser) return;
    let cancelled = false;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: AuthUser | null } | null) => {
        if (cancelled || !data?.user) return;
        setUser({
          ...data.user,
          permissions: normalizePermissionMatrix(data.user.permissions),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialUser?.id]);

  const permissions = useMemo(() => {
    if (!user) return {};
    if (isAdminUsername(user.username)) return fullPermissionMatrix();
    return user.permissions;
  }, [user]);

  const isAdmin = user ? isAdminUsername(user.username) : false;
  const canViewSalaries = user
    ? canViewSalaryAmounts(permissions, user.username)
    : false;
  const canEditSalaries = user
    ? canEditSalaryAmounts(permissions, user.username)
    : false;

  const can = useCallback(
    (sectionId: string, action: PermissionAction = "read") =>
      user ? canAccessSection(permissions, sectionId, action, user.username) : false,
    [permissions, user]
  );

  const canHref = useCallback(
    (href: string) => (user ? canAccessHref(permissions, href, user.username) : false),
    [permissions, user]
  );

  const canModule = useCallback(
    (moduleId: string) =>
      user ? canAccessModule(permissions, moduleId, user.username) : false,
    [permissions, user]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      user,
      permissions,
      isAdmin,
      can,
      canHref,
      canModule,
      canViewSalaries,
      canEditSalaries,
      setUser,
      logout,
    }),
    [user, permissions, isAdmin, can, canHref, canModule, canViewSalaries, canEditSalaries, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
