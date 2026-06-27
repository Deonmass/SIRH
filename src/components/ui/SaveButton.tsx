"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, Save, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  saving?: boolean;
  icon?: LucideIcon;
  savingLabel?: string;
  children: ReactNode;
};

export function SaveButton({
  saving = false,
  icon: Icon = Save,
  savingLabel = "Enregistrement…",
  children,
  className,
  disabled,
  type = "button",
  ...props
}: SaveButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? saving}
      className={cn(
        "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {saving ? savingLabel : children}
    </button>
  );
}
