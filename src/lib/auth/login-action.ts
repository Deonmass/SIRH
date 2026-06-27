"use server";

import { redirect } from "next/navigation";
import { authenticateUserDetailed } from "@/lib/auth/users";
import { completeLoginForUser } from "@/lib/auth/complete-login";

export type LoginActionState = { error?: string } | null;

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const next = formData.get("next")?.toString() || "/";

  if (!username || !password) {
    return { error: "Identifiant et mot de passe requis" };
  }

  const auth = await authenticateUserDetailed(username, password);
  if (!auth.ok) {
    return {
      error:
        auth.reason === "disabled"
          ? "Ce compte est désactivé — contactez un administrateur"
          : "Identifiants incorrects",
    };
  }

  await completeLoginForUser(auth.user);

  const target = next.startsWith("/login") ? "/" : next;
  redirect(target);
}
