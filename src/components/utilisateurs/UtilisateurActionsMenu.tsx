"use client";

import { useRouter } from "next/navigation";
import { KeyRound, MoreVertical, Pencil, Shield, Trash2, UserCheck, UserX } from "lucide-react";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { isAdminUsername } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function UtilisateurActionsMenu({
  user,
  canWrite,
  canDelete,
  canManagePermissions,
  busyId,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
  className,
}: {
  user: UtilisateurRow;
  canWrite: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  busyId: string | null;
  onEdit: (user: UtilisateurRow) => void;
  onResetPassword: (user: UtilisateurRow) => void;
  onToggleActive: (user: UtilisateurRow) => void;
  onDelete: (user: UtilisateurRow) => void;
  className?: string;
}) {
  const router = useRouter();
  const { open: openMenu, menuNode } = useContextMenu();
  const admin = isAdminUsername(user.username);
  const disabled = busyId === user.id;
  const hasActions =
    canManagePermissions || canWrite || (canDelete && !admin);

  if (!hasActions) return null;

  function buildMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    if (canManagePermissions) {
      items.push({
        id: "permissions",
        label: "Permissions",
        icon: <Shield className="h-4 w-4 shrink-0 opacity-80" />,
        onClick: () => router.push(`/utilisateurs/permissions?compte=${user.id}`),
      });
    }

    if (canWrite) {
      items.push({
        id: "edit",
        label: "Modifier le compte",
        icon: <Pencil className="h-4 w-4 shrink-0 opacity-80" />,
        disabled,
        onClick: () => onEdit(user),
      });

      items.push({
        id: "reset-password",
        label: "Réinitialiser le mot de passe",
        icon: <KeyRound className="h-4 w-4 shrink-0 opacity-80" />,
        disabled,
        onClick: () => onResetPassword(user),
      });

      if (!admin) {
        items.push({
          id: "toggle-active",
          label: user.actif ? "Désactiver le compte" : "Réactiver le compte",
          icon: user.actif ? (
            <UserX className="h-4 w-4 shrink-0 opacity-80" />
          ) : (
            <UserCheck className="h-4 w-4 shrink-0 opacity-80" />
          ),
          disabled,
          onClick: () => onToggleActive(user),
        });
      }
    }

    if (canDelete && !admin) {
      items.push({
        id: "delete",
        label: "Supprimer le compte",
        icon: <Trash2 className="h-4 w-4 shrink-0 opacity-80" />,
        danger: true,
        disabled,
        onClick: () => onDelete(user),
      });
    }

    return items;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Actions du compte"
        title="Actions"
        disabled={disabled}
        onClick={(e) => openMenu(e, buildMenuItems())}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--shell-text-muted)] transition",
          "hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] disabled:opacity-40",
          className
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuNode}
    </>
  );
}
