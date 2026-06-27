import { UtilisateursShell } from "@/components/utilisateurs/UtilisateursShell";

export default function UtilisateursLayout({ children }: { children: React.ReactNode }) {
  return <UtilisateursShell>{children}</UtilisateursShell>;
}
