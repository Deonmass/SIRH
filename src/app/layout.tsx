import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ConditionalAppShell } from "@/components/layout/ConditionalAppShell";
import { sessionToAuthUser } from "@/lib/auth/initial-user";
import { getSessionUser } from "@/lib/auth/session";
import { getSettingsBundle } from "@/lib/store";
import "./globals.css";

/** Applique thème / couleurs shell avant le premier paint (évite le flash). */
const APPEARANCE_INIT_SCRIPT = `(function(){try{var k='sirh-appearance';var d=document.documentElement;var p=JSON.parse(localStorage.getItem(k)||'null');var t=p&&p.theme?p.theme:(localStorage.getItem('sirh-theme')==='light'?'light':'dark');d.setAttribute('data-theme',t);d.classList.toggle('dark',t!=='light');d.classList.toggle('light',t==='light');if(p){if(p.sidebarColor==='custom'&&p.sidebarCustomColor)d.style.setProperty('--shell-sidebar',p.sidebarCustomColor);else if(p.sidebarColor&&p.sidebarColor!=='default')d.setAttribute('data-sidebar-color',p.sidebarColor);if(p.headerColor==='custom'&&p.headerCustomColor)d.style.setProperty('--shell-header-bg',p.headerCustomColor);else if(p.headerColor&&p.headerColor!=='default')d.setAttribute('data-header-color',p.headerColor);}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIRH RDC — Gestion RH Congo",
  description:
    "Système de gestion des ressources humaines pour la RDC. Code du travail Loi 015/2002, paie CNSS INPP ONEM, onboarding pas à pas.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ settings, revision }, session] = await Promise.all([
    getSettingsBundle(),
    getSessionUser(),
  ]);
  const initialUser = session ? await sessionToAuthUser(session) : null;

  return (
    <html
      lang="fr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full">
        <Script
          id="sirh-appearance-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }}
        />
        <ConditionalAppShell
          initialUser={initialUser}
          initialSettings={settings}
          initialRevision={revision}
        >
          {children}
        </ConditionalAppShell>
      </body>
    </html>
  );
}
