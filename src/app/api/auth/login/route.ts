import { NextResponse } from "next/server";
import { authenticateUserDetailed } from "@/lib/auth/users";
import { completeLoginForUser } from "@/lib/auth/complete-login";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Identifiant et mot de passe requis" }, { status: 400 });
  }

  const auth = await authenticateUserDetailed(username, password);
  if (!auth.ok) {
    const error =
      auth.reason === "disabled"
        ? "Ce compte est désactivé — contactez un administrateur"
        : "Identifiants incorrects";
    return NextResponse.json({ error }, { status: 401 });
  }
  const user = auth.user;

  await completeLoginForUser(user);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      matriculAgent: user.matriculAgent,
      permissions: user.permissions,
    },
  });
}
