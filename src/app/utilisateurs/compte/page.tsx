import { redirect } from "next/navigation";
import { UtilisateursCompteClient } from "@/components/utilisateurs/UtilisateursCompteClient";
import { getSessionUser } from "@/lib/auth/session";
import { listUtilisateurs } from "@/lib/auth/users";
import { canAccessSection } from "@/lib/permissions";
import { getEmployees } from "@/lib/store";

export default async function UtilisateursComptePage() {
  const session = await getSessionUser();
  if (
    !session ||
    !canAccessSection(session.permissions, "utilisateurs.comptes", "read", session.username)
  ) {
    redirect("/");
  }

  const [users, employees] = await Promise.all([listUtilisateurs(), getEmployees()]);
  const byMatricule = new Map(employees.map((e) => [e.matricule, e]));

  const initialUsers = users.map((user) => {
    const employee = user.matriculAgent ? byMatricule.get(user.matriculAgent) : null;
    return {
      ...user,
      employeeName: employee ? `${employee.prenom} ${employee.nom}`.trim() : null,
    };
  });

  return <UtilisateursCompteClient initialUsers={initialUsers} employees={employees} />;
}
