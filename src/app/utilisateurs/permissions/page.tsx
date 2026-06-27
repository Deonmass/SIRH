import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UtilisateursPermissionsClient } from "@/components/utilisateurs/UtilisateursPermissionsClient";
import { getSessionUser } from "@/lib/auth/session";
import { listUtilisateurs } from "@/lib/auth/users";
import { canAccessSection } from "@/lib/permissions";

export default async function UtilisateursPermissionsPage() {
  const session = await getSessionUser();
  if (
    !session ||
    !canAccessSection(session.permissions, "utilisateurs.permissions", "read", session.username)
  ) {
    redirect("/");
  }

  const users = await listUtilisateurs();

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--shell-card)]" />}>
      <UtilisateursPermissionsClient initialUsers={users} />
    </Suspense>
  );
}
