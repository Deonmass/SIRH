"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";
import { showLoadingAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function PosteEditNavLink({
  posteId,
  className,
  children,
  onNavigate,
}: {
  posteId: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const href = `/postes/nouvelle-fiche/${posteId}`;

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    onNavigate?.();
    showLoadingAlert("Chargement de la fiche…", "Ouverture du formulaire de poste.");
    router.push(href);
  }

  return (
    <a href={href} onClick={handleClick} className={cn(className)}>
      {children}
    </a>
  );
}
