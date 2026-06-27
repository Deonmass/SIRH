"use client";

import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { UserProfileModal } from "@/components/utilisateurs/UserProfileModal";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, profileModalOpen, closeProfileModal } = useLayout();

  return (
    <div className="shell-page min-h-screen bg-[var(--shell-bg)]">
      <div className="shell-glow pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>
      <Sidebar />
      <UserProfileModal open={profileModalOpen} onClose={closeProfileModal} />
      <main
        className={cn(
          "app-main relative min-h-screen transition-[margin] duration-200",
          sidebarCollapsed ? "ml-[4.5rem]" : "ml-64"
        )}
      >
        <div className="mx-auto max-w-[1800px] px-8 pb-8">{children}</div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <ShellInner>{children}</ShellInner>
    </LayoutProvider>
  );
}
