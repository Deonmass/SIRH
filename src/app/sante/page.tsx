import { redirect } from "next/navigation";
import {
  firstAccessibleHrefFromList,
  fullPermissionMatrix,
  isAdminUsername,
} from "@/lib/permissions";
import { getSessionUser } from "@/lib/auth/session";

const SANTE_HREFS = [
  "/sante/dashboard",
  "/sante/formulaire",
  "/sante/file-attente",
  "/sante/hopitaux",
] as const;

export default async function SanteIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const permissions = isAdminUsername(user.username)
    ? fullPermissionMatrix()
    : user.permissions;

  const target = firstAccessibleHrefFromList(permissions, SANTE_HREFS, user.username);
  if (target) redirect(target);
  redirect("/access-denied");
}
