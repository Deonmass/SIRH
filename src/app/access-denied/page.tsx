import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
        <ShieldX className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-semibold text-[var(--shell-text)]">Accès refusé</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--shell-text-muted)]">
        Votre compte n&apos;a pas la permission de consulter cette page. Contactez un
        administrateur pour ajuster vos droits.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
