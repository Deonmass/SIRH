"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sectionIdForHref } from "@/lib/permissions";

/**
 * Garde client : redirige si la route courante n'est pas autorisée en lecture.
 * Complète le middleware (navigation client, état permissions rafraîchi).
 */
export function RoutePermissionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, canHref, canModule } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (pathname === "/access-denied" || pathname === "/login") return;

    if (pathname === "/sante") {
      if (!canModule("sante")) router.replace("/access-denied");
      return;
    }

    const sectionId = sectionIdForHref(pathname);
    if (!sectionId || !canHref(pathname)) {
      router.replace("/access-denied");
    }
  }, [pathname, user, canHref, canModule, router]);

  return null;
}
