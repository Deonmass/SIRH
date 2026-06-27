import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { companyLogoDisplaySrc } from "@/lib/company-logo";
import { getSettings } from "@/lib/store";

export default async function LoginPage() {
  const settings = await getSettings();
  const logoSrc = companyLogoDisplaySrc(settings.companyLogoUrl, "");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--shell-bg)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={settings.companyName}
              className="mx-auto mb-4 max-h-14 max-w-[10rem] object-contain"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-xl font-bold text-white shadow-lg">
              RH
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--shell-text)]">SIRH RDC</h1>
          <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
            {settings.companyName || "Gestion des ressources humaines"}
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-[var(--shell-card)]" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
