import { redirect } from "next/navigation";
import { UtilisateurLogsClient } from "@/components/utilisateurs/UtilisateurLogsClient";
import {
  listActivityLogs,
  listActivityLogUsers,
  sanitizeLogForApi,
} from "@/lib/activity-log";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessSection } from "@/lib/permissions";

export default async function UtilisateurLogsPage() {
  const session = await getSessionUser();
  if (
    !session ||
    !canAccessSection(session.permissions, "utilisateurs.logs", "read", session.username)
  ) {
    redirect("/");
  }

  const from = new Date();
  from.setDate(from.getDate() - 30);

  const [logs, users] = await Promise.all([
    listActivityLogs({
      from: from.toISOString(),
      limit: 500,
    }),
    listActivityLogUsers(),
  ]);

  return (
    <UtilisateurLogsClient
      initialLogs={logs.map(sanitizeLogForApi)}
      initialUsers={users}
    />
  );
}
