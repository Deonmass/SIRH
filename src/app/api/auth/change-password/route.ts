import { NextResponse } from "next/server";
import { changeOwnPassword } from "@/lib/auth/users";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmPassword = body.confirmPassword ?? newPassword;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Mot de passe actuel et nouveau mot de passe requis" },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Les mots de passe ne correspondent pas" },
      { status: 400 }
    );
  }

  const result = await changeOwnPassword(String(auth.user.id), currentPassword, newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
