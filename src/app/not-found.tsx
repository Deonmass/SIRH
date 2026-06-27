import { AppErrorView } from "@/components/errors/AppErrorView";

export default function NotFound() {
  return (
    <AppErrorView
      kind="not_found"
      code={404}
      title="Page introuvable"
      message="Cette page n'existe pas ou n'est plus disponible dans le SIRH."
      hint="Utilisez le menu latéral ou retournez à l'accueil pour continuer."
    />
  );
}
