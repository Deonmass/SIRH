"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Paperclip, X } from "lucide-react";
import { readApiError, showErrorAlert } from "@/lib/alerts";
import { attachmentFileName } from "@/lib/movement-attachments";
import { cn } from "@/lib/utils";

type AttachmentItem = {
  id: string;
  name: string;
  path?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

export function MovementAttachmentsField({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentItem[]>(() =>
    value.map((path, index) => ({
      id: `saved-${index}-${path}`,
      name: attachmentFileName(path),
      path,
      status: "ready" as const,
    }))
  );
  const uploading = items.some((item) => item.status === "uploading");
  const blocked = disabled || uploading;

  function syncPaths(nextItems: AttachmentItem[]) {
    onChange(nextItems.filter((item) => item.path).map((item) => item.path!));
  }

  async function handleSelect(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;

    const picked = Array.from(fileList);
    const pending: AttachmentItem[] = picked.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: "uploading",
    }));

    setItems((prev) => [...prev, ...pending]);

    try {
      const form = new FormData();
      for (const file of picked) {
        form.append("files", file);
      }

      const res = await fetch("/api/movements/attachments/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const message = await readApiError(res);
        setItems((prev) => {
          const pendingIds = new Set(pending.map((item) => item.id));
          const next = prev.map((item) =>
            pendingIds.has(item.id)
              ? { ...item, status: "error" as const, error: message }
              : item
          );
          syncPaths(next);
          return next;
        });
        await showErrorAlert("Import impossible", message);
        return;
      }

      const data = (await res.json()) as { paths: string[] };
      const paths = data.paths ?? [];

      setItems((prev) => {
        let pathIndex = 0;
        const pendingIds = pending.map((item) => item.id);
        const next = prev.map((item) => {
          const pendingIndex = pendingIds.indexOf(item.id);
          if (pendingIndex < 0) return item;
          const path = paths[pathIndex];
          pathIndex += 1;
          if (!path) {
            return { ...item, status: "error" as const, error: "Réponse serveur incomplète" };
          }
          return { ...item, path, status: "ready" as const, error: undefined };
        });
        syncPaths(next);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'envoyer les fichiers.";
      setItems((prev) => {
        const pendingIds = new Set(pending.map((item) => item.id));
        const next = prev.map((item) =>
          pendingIds.has(item.id) ? { ...item, status: "error" as const, error: message } : item
        );
        syncPaths(next);
        return next;
      });
      await showErrorAlert("Erreur réseau", message);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(id: string) {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      syncPaths(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id="movement-attachments-input"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
        className="sr-only"
        disabled={blocked}
        onChange={(e) => void handleSelect(e.target.files)}
      />
      <label
        htmlFor={blocked ? undefined : "movement-attachments-input"}
        className={cn(
          "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--shell-border)] px-3 py-2.5 text-sm transition",
          blocked
            ? "cursor-not-allowed opacity-50"
            : "text-[var(--shell-text-muted)] hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-[var(--shell-text)]"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Paperclip className="h-4 w-4" />
            Choisir un ou plusieurs fichiers
          </>
        )}
      </label>

      {items.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-[var(--shell-border)] p-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg bg-[var(--shell-surface)] px-2 py-1.5 text-xs"
            >
              {item.status === "uploading" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" />
              ) : item.status === "error" ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              )}
              {item.path ? (
                <a
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-[var(--shell-text)] hover:text-sky-600 dark:hover:text-sky-400"
                  title={item.name}
                >
                  {item.name}
                </a>
              ) : (
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    item.status === "error" ? "text-rose-500" : "text-[var(--shell-text)]"
                  )}
                  title={item.error ?? item.name}
                >
                  {item.name}
                  {item.status === "error" && item.error ? ` — ${item.error}` : ""}
                </span>
              )}
              {!disabled && item.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => removeAt(item.id)}
                  className="shrink-0 rounded p-0.5 text-[var(--shell-text-muted)] hover:text-rose-500"
                  aria-label="Retirer le fichier"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && (
        <p className="flex items-center gap-1.5 text-[10px] text-[var(--shell-text-muted)]">
          <FileText className="h-3 w-3" />
          Aucun fichier joint
        </p>
      )}

      <p className="text-[10px] text-[var(--shell-text-muted)]">
        PDF, images ou Word · 10 Mo max par fichier
      </p>
    </div>
  );
}
