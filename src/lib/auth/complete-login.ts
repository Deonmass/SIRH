import { cookies } from "next/headers";
import { logApiActivity } from "@/lib/activity-log";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import type { Utilisateur } from "@/lib/types";

export async function completeLoginForUser(user: Utilisateur): Promise<void> {
  const token = await createSessionToken({
    id: Number(user.id),
    username: user.username,
    matriculAgent: user.matriculAgent,
  });

  const jar = await cookies();
  jar.set(sessionCookieOptions(token));

  await logApiActivity(user.username, {
    action: "connexion",
    entityType: "utilisateur",
    entityId: user.id,
    entityLabel: user.username,
    summary: `Connexion de « ${user.username} »`,
    payloadAfter: { username: user.username },
  });
}
