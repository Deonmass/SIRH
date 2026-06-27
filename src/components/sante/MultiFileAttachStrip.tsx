"use client";

import { useRef } from "react";
import { FileText, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiFileAttachStrip({
  files,
  onAdd,
  onRemove,
  disabled = false,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className="text-sm text-[var(--shell-text-muted)]">Pièces jointes</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="group relative flex h-20 w-20 flex-col items-center justify-center rounded-full border border-[var(--shell-border)] bg-[var(--shell-bg)] p-2 text-center"
            title={file.name}
          >
            <FileText className="h-5 w-5 text-sky-500" />
            <span className="mt-1 line-clamp-2 w-full text-[9px] leading-tight text-[var(--shell-text-muted)]">
              {file.name}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -right-1 -top-1 rounded-full border border-[var(--shell-border)] bg-[var(--shell-card)] p-0.5 text-red-400 opacity-0 transition group-hover:opacity-100"
                aria-label="Retirer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (picked.length > 0) onAdd(picked);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-sky-500/50",
                "bg-[var(--shell-bg)] text-sky-500 transition hover:border-sky-500 hover:bg-sky-500/10"
              )}
              title="Joindre un ou plusieurs fichiers"
            >
              <Plus className="h-7 w-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
