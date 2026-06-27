"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Eye,
  FileText,
  Upload,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { StickyTable, Td, Th } from "@/components/layout/StickyTable";
import { Badge } from "@/components/ui/Badge";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { documentIsFilled } from "@/lib/document-compliance";
import type { DocumentItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const CATEGORY_LABELS: Record<DocumentItem["category"], string> = {
  identite: "Identité",
  contrat: "Contrat",
  social: "Social (CNSS/ONEM)",
  medical: "Médical",
  bancaire: "Bancaire",
  formation: "Formation & discipline",
  famille: "Famille & état civil",
  paie: "Paie & bulletins",
};

export type DocumentChecklistView = "grid" | "table";

function documentStatus(doc: DocumentItem): { label: string; className: string } {
  if (documentIsFilled(doc)) {
    return { label: "Rempli", className: "bg-emerald-500/20 text-emerald-600" };
  }
  if (doc.required) {
    return { label: "Non renseigné", className: "bg-red-500/20 text-red-500" };
  }
  return { label: "Non renseigné", className: "bg-[var(--shell-surface)] text-[var(--shell-text-muted)] border border-[var(--shell-border)]" };
}

function buildDocumentFileApiUrl(employeeId: string, documentId: string): string {
  return `/api/employees/${encodeURIComponent(employeeId)}/documents/file?documentId=${encodeURIComponent(documentId)}`;
}

function removeDocumentConfirmMessage(doc: DocumentItem): string {
  return `Supprimer le document « ${doc.label} » ?\n\nLe fichier sera retiré du dossier et de la base de données.`;
}

function DocumentPreviewModal({
  employeeId,
  doc,
  onClose,
}: {
  employeeId: string;
  doc: DocumentItem;
  onClose: () => void;
}) {
  const hasFile = Boolean(doc.fileRef);
  const viewUrl = hasFile ? buildDocumentFileApiUrl(employeeId, doc.id) : null;
  const [iframeLoading, setIframeLoading] = useState(Boolean(viewUrl));

  useEffect(() => {
    setIframeLoading(Boolean(viewUrl));
  }, [viewUrl]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="doc-preview-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4">
          <div className="min-w-0">
            <h4 id="doc-preview-title" className="text-lg font-semibold text-[var(--shell-text)]">
              {doc.label}
            </h4>
            {doc.fileName && (
              <p className="mt-0.5 truncate text-xs text-[var(--shell-text-muted)]">{doc.fileName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {!hasFile ? (
            <div className="rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-surface)] p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-[var(--shell-text-muted)]" />
              <p className="mt-3 text-sm text-[var(--shell-text)]">Aucun fichier joint</p>
              <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                Utilisez le bouton « Joindre » pour déposer un fichier, puis cliquez sur l&apos;icône œil
                pour le visualiser.
              </p>
            </div>
          ) : (
            <div className="relative min-h-[min(70vh,720px)]">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--shell-surface)]">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              )}
              <iframe
                src={viewUrl!}
                title={doc.label}
                className="h-[min(70vh,720px)] w-full rounded-lg border border-[var(--shell-border)] bg-white"
                onLoad={() => setIframeLoading(false)}
              />
            </div>
          )}
        </div>

        {hasFile && viewUrl && (
          <div className="shrink-0 border-t border-[var(--shell-border)] px-5 py-3">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-500 hover:underline"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentRowActions({
  doc,
  onView,
}: {
  doc: DocumentItem;
  onView: () => void;
}) {
  const btnClass = "shrink-0 rounded-md p-1.5 transition hover:bg-[var(--shell-hover)]";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onView}
        className={cn(btnClass, "text-sky-500 hover:text-sky-400")}
        title={doc.fileRef ? "Visualiser le document" : "Voir le détail (aucun fichier joint)"}
        aria-label="Visualiser"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DocumentChecklist({
  employeeId,
  documents,
  view = "grid",
  onToggle,
  onUploaded,
  onDocumentsChange,
  readonly = false,
  compactColumns = false,
}: {
  employeeId: string;
  documents: DocumentItem[];
  view?: DocumentChecklistView;
  onToggle?: (docId: string) => void;
  onUploaded?: (documents: DocumentItem[]) => void;
  onDocumentsChange?: (documents: DocumentItem[]) => void;
  readonly?: boolean;
  compactColumns?: boolean;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { open, menuNode } = useContextMenu();

  const required = documents.filter((d) => d.required);
  const received = required.filter((d) => documentIsFilled(d));
  const rate = required.length ? (received.length / required.length) * 100 : 100;

  const byCategory = documents.reduce(
    (acc, d) => {
      if (!acc[d.category]) acc[d.category] = [];
      acc[d.category].push(d);
      return acc;
    },
    {} as Record<string, DocumentItem[]>
  );

  function contextMenuItems(doc: DocumentItem): ContextMenuItem[] {
    const filled = documentIsFilled(doc);
    const items: ContextMenuItem[] = [
      {
        id: "view",
        label: "Visualiser document",
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: () => setPreviewDoc(doc),
      },
    ];

    if (!readonly) {
      items.push({
        id: "delete",
        label: "Supprimer le document",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        danger: true,
        disabled: !filled,
        onClick: () => void handleRemoveDocument(doc),
      });
    }

    return items;
  }

  function openDocMenu(e: React.MouseEvent, doc: DocumentItem) {
    open(e, contextMenuItems(doc));
  }

  async function handleRemoveDocument(doc: DocumentItem) {
    if (!documentIsFilled(doc)) return;
    if (!window.confirm(removeDocumentConfirmMessage(doc))) return;

    setRemoving(doc.id);
    setUploadError(null);
    try {
      const res = await fetch(
        `/api/employees/${encodeURIComponent(employeeId)}/documents?documentId=${encodeURIComponent(doc.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUploaded?.(data.employee.documents);
        if (previewDoc?.id === doc.id) setPreviewDoc(null);
      } else {
        setUploadError(data.error ?? "Échec de la suppression");
      }
    } catch {
      setUploadError("Échec de la suppression");
    } finally {
      setRemoving(null);
    }
  }

  async function handleUpload(docId: string, file: File) {
    setUploading(docId);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("documentId", docId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUploaded?.(data.employee.documents);
      } else {
        setUploadError(data.error ?? "Échec de l'upload");
      }
    } catch {
      setUploadError("Échec de l'upload");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      {menuNode}
      {previewDoc && (
        <DocumentPreviewModal
          employeeId={employeeId}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-[var(--shell-text-muted)]">
          {received.length}/{required.length} rubriques obligatoires renseignées
        </span>
        <span
          className={cn(
            "text-sm font-bold",
            rate === 100 ? "text-emerald-500" : rate >= 70 ? "text-amber-500" : "text-red-500"
          )}
        >
          {Math.round(rate)}%
        </span>
      </div>
      {uploadError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {uploadError}
        </p>
      )}

      {view === "table" ? (
        <DocumentTableView
          documents={documents}
          categoryLabels={CATEGORY_LABELS}
          readonly={readonly}
          uploading={uploading}
          removing={removing}
          onContextMenu={openDocMenu}
          onView={(doc) => setPreviewDoc(doc)}
          onRemove={(doc) => void handleRemoveDocument(doc)}
          onToggle={(doc) => onToggle?.(doc.id)}
          onUpload={(docId, file) => handleUpload(docId, file)}
        />
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="mb-8 last:mb-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              {CATEGORY_LABELS[cat as DocumentItem["category"]] ?? cat}
            </h3>
            <div
              className={cn(
                "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
                compactColumns && "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7"
              )}
            >
              {items.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  readonly={readonly}
                  uploading={uploading === doc.id}
                  removing={removing === doc.id}
                  onContextMenu={(e) => openDocMenu(e, doc)}
                  onView={() => setPreviewDoc(doc)}
                  onRemove={() => void handleRemoveDocument(doc)}
                  onToggle={() => onToggle?.(doc.id)}
                  onUploadClick={() => fileRefs.current[doc.id]?.click()}
                  fileInputRef={(el) => {
                    fileRefs.current[doc.id] = el;
                  }}
                  onFileSelected={(file) => handleUpload(doc.id, file)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DocumentStatusBadge({ doc }: { doc: DocumentItem }) {
  const status = documentStatus(doc);
  return <Badge className={status.className}>{status.label}</Badge>;
}

function DocumentTableView({
  documents,
  categoryLabels,
  readonly,
  uploading,
  removing,
  onContextMenu,
  onView,
  onRemove,
  onToggle,
  onUpload,
}: {
  documents: DocumentItem[];
  categoryLabels: Record<DocumentItem["category"], string>;
  readonly?: boolean;
  uploading: string | null;
  removing: string | null;
  onContextMenu: (e: React.MouseEvent, doc: DocumentItem) => void;
  onView: (doc: DocumentItem) => void;
  onRemove: (doc: DocumentItem) => void;
  onToggle?: (doc: DocumentItem) => void;
  onUpload: (docId: string, file: File) => void;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <StickyTable className="max-h-[min(480px,55vh)]">
      <thead>
        <tr>
          <Th>Document</Th>
          <Th>Catégorie</Th>
          <Th>Statut</Th>
          <Th>Obligatoire</Th>
          <Th>Fichier</Th>
          <Th className="min-w-[11rem]">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const isUploading = uploading === doc.id;
          const isRemoving = removing === doc.id;
          const filled = documentIsFilled(doc);
          return (
            <tr
              key={doc.id}
              className="cursor-context-menu hover:bg-[var(--shell-hover)]"
              onContextMenu={(e) => onContextMenu(e, doc)}
            >
              <Td className="font-medium">{doc.label}</Td>
              <Td className="text-[var(--shell-text-muted)]">
                {categoryLabels[doc.category] ?? doc.category}
              </Td>
              <Td>
                <DocumentStatusBadge doc={doc} />
              </Td>
              <Td>{doc.required ? "Oui" : "Non"}</Td>
              <Td className="text-xs text-[var(--shell-text-muted)]">
                {doc.fileName ? (
                  <span className="block max-w-[200px] truncate">{doc.fileName}</span>
                ) : doc.receivedAt ? (
                  `Reçu le ${formatDate(doc.receivedAt)}`
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1">
                  {!readonly && (
                    <>
                      <input
                        ref={(el) => {
                          fileRefs.current[doc.id] = el;
                        }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onUpload(doc.id, f);
                          e.target.value = "";
                        }}
                      />
                      {!filled ? (
                        <>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileRefs.current[doc.id]?.click()}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            Joindre
                          </button>
                          {onToggle && (
                            <button
                              type="button"
                              onClick={() => onToggle(doc)}
                              className="rounded-lg border border-[var(--shell-border)] px-2 py-1 text-[10px] text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                              title="Marquer reçu sans fichier"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={() => onRemove(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          title="Supprimer le document"
                          aria-label="Supprimer le document"
                        >
                          {isRemoving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                  <DocumentRowActions doc={doc} onView={() => onView(doc)} />
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </StickyTable>
  );
}

function DocumentCard({
  doc,
  readonly,
  uploading,
  removing,
  onContextMenu,
  onView,
  onRemove,
  onToggle,
  onUploadClick,
  fileInputRef,
  onFileSelected,
}: {
  doc: DocumentItem;
  readonly?: boolean;
  uploading: boolean;
  removing: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onView: () => void;
  onRemove: () => void;
  onToggle: () => void;
  onUploadClick: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileSelected: (file: File) => void;
}) {
  const filled = documentIsFilled(doc);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border p-4 transition",
        filled
          ? "border-emerald-500/30 bg-emerald-500/5"
          : doc.required
            ? "border-red-500/20 bg-red-500/5"
            : "border-[var(--shell-border)] bg-[var(--shell-surface)] hover:border-[var(--shell-border)]"
      )}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            filled ? "bg-emerald-500/20" : "bg-[var(--shell-hover)]"
          )}
        >
          {filled ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <FileText className="h-4 w-4 text-[var(--shell-text-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-[var(--shell-text)]">{doc.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DocumentStatusBadge doc={doc} />
            {doc.required && !filled && (
              <span className="text-[10px] font-medium uppercase text-red-500">Obligatoire</span>
            )}
          </div>
        </div>
        <DocumentRowActions doc={doc} onView={onView} />
      </div>

      {doc.legalRef && (
        <p className="mt-2 text-[11px] leading-snug text-sky-500/80 line-clamp-2">{doc.legalRef}</p>
      )}

      {doc.receivedAt && (
        <p className="mt-2 text-[11px] text-[var(--shell-text-muted)]">Reçu le {formatDate(doc.receivedAt)}</p>
      )}

      {doc.fileName && (
        <div className="mt-2 flex-1 text-[11px] text-[var(--shell-text-muted)]">
          <p className="truncate">{doc.fileName}</p>
          {doc.fileSize != null && <span>{(doc.fileSize / 1024).toFixed(0)} Ko</span>}
        </div>
      )}

      {!readonly && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--shell-border)] pt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelected(f);
              e.target.value = "";
            }}
          />
          {!filled ? (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={onUploadClick}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Joindre
              </button>
              <button
                type="button"
                onClick={onView}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-sky-500/40 px-2 py-1.5 text-xs font-medium text-sky-500 hover:bg-sky-500/10"
                title="Visualiser"
              >
                <Eye className="h-3 w-3" />
                Voir
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg border border-[var(--shell-border)] px-2 py-1.5 text-xs text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                title="Marquer reçu sans fichier"
              >
                <Check className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onView}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-sky-500/40 px-2 py-1.5 text-xs font-medium text-sky-500 hover:bg-sky-500/10"
                title="Visualiser"
              >
                <Eye className="h-3 w-3" />
                Voir
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={onRemove}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 px-2 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                title="Supprimer le document"
              >
                {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
