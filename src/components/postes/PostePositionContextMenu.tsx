"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, UserMinus, UserPlus } from "lucide-react";
import type { JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PostePositionMenuAction = "edit" | "assign" | "unassign" | "delete";

export function isPosteInactive(position: JobPosition): boolean {
  return position.status === "archived" || position.status === "draft";
}

const MENU_W = 220;
const MENU_H = 200;

export function PostePositionContextMenu({
  menu,
  position,
  isVacant,
  isOccupied,
  onAction,
  onClose,
}: {
  menu: { x: number; y: number };
  position: JobPosition;
  isVacant: boolean;
  isOccupied: boolean;
  onAction: (action: PostePositionMenuAction) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items: {
    id: PostePositionMenuAction;
    label: string;
    icon: typeof Pencil;
    hidden?: boolean;
    danger?: boolean;
  }[] = [
    { id: "edit", label: "Modifier le poste", icon: Pencil },
    {
      id: "assign",
      label: "Affecter un employé",
      icon: UserPlus,
      hidden: !isVacant,
    },
    {
      id: "unassign",
      label: "Désaffecter l'employé",
      icon: UserMinus,
      hidden: !isOccupied,
    },
    { id: "delete", label: "Supprimer poste", icon: Trash2, danger: true },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <ul
      role="menu"
      className="fixed z-[200] min-w-[220px] rounded-lg border border-[var(--shell-border)] bg-[var(--shell-popover)] py-1 text-[var(--shell-text)] shadow-2xl"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <li key={item.id} role="none">
            <button
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors",
                item.danger
                  ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  : "text-[var(--shell-text)] hover:bg-[var(--shell-hover)]"
              )}
              onClick={() => {
                onAction(item.id);
                onClose();
              }}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-80" />
              {item.label}
            </button>
          </li>
        ))}
    </ul>,
    document.body
  );
}

export function clampContextMenuPosition(clientX: number, clientY: number) {
  const x = Math.min(clientX, window.innerWidth - MENU_W - 8);
  const y = Math.min(clientY, window.innerHeight - MENU_H - 8);
  return { x: Math.max(8, x), y: Math.max(8, y) };
}
