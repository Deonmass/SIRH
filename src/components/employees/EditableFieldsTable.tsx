"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { StickyTable, Td, Th } from "@/components/layout/StickyTable";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { DossierSelect, DossierTextInput, dossierInputClass } from "./DossierFields";
import { cn } from "@/lib/utils";

export type EditableFieldType = "text" | "date" | "number" | "email" | "select";

export interface EditableFieldDef {
  key: string;
  label: string;
  displayValue: React.ReactNode;
  rawValue?: string | number;
  readOnly?: boolean;
  type?: EditableFieldType;
  options?: { value: string; label: string }[];
  onSave?: (value: string) => void;
}

export function EditableFieldsTable({ fields }: { fields: EditableFieldDef[] }) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { open, menuNode } = useContextMenu();

  function startEdit(field: EditableFieldDef) {
    if (field.readOnly || !field.onSave) return;
    setEditingKey(field.key);
    setDraft(String(field.rawValue ?? field.displayValue ?? ""));
  }

  function commit(field: EditableFieldDef) {
    field.onSave?.(draft);
    setEditingKey(null);
    setDraft("");
  }

  function cancel() {
    setEditingKey(null);
    setDraft("");
  }

  function menuItems(field: EditableFieldDef): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    if (!field.readOnly && field.onSave) {
      items.push({
        id: "edit",
        label: "Modifier",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onClick: () => startEdit(field),
      });
    }
    if (field.rawValue != null && String(field.rawValue).length > 0) {
      items.push({
        id: "copy",
        label: "Copier la valeur",
        onClick: () => {
          void navigator.clipboard.writeText(String(field.rawValue));
        },
      });
    }
    if (editingKey === field.key) {
      items.push({
        id: "cancel",
        label: "Annuler l'édition",
        onClick: cancel,
      });
    }
    return items;
  }

  return (
    <>
      <StickyTable className="max-h-none">
        <thead>
          <tr>
            <Th className="w-1/3">Champ</Th>
            <Th>Valeur</Th>
            <Th className="w-12 text-center"> </Th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const isEditing = editingKey === field.key;
            const canEdit = !field.readOnly && field.onSave;

            return (
              <tr
                key={field.key}
                className={cn(
                  "hover:bg-[var(--shell-hover)]",
                  isEditing && "bg-sky-500/5"
                )}
                onContextMenu={(e) => {
                  const items = menuItems(field);
                  if (items.length > 0) open(e, items);
                }}
              >
                <Td className="font-medium text-[var(--shell-text-muted)]">{field.label}</Td>
                <Td>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      {field.type === "select" && field.options ? (
                        <DossierSelect
                          value={draft}
                          onChange={setDraft}
                          options={field.options}
                        />
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className={dossierInputClass}
                          autoFocus
                          onFocus={(e) => {
                            if ("showPicker" in e.currentTarget) {
                              try {
                                (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                              } catch {
                                // Browser may block showPicker without user gesture.
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commit(field);
                            if (e.key === "Escape") cancel();
                          }}
                        />
                      ) : (
                        <DossierTextInput
                          type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                          value={draft}
                          onChange={setDraft}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commit(field);
                            if (e.key === "Escape") cancel();
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => commit(field)}
                        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500"
                        aria-label="Enregistrer"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancel}
                        className="rounded-lg border border-[var(--shell-border)] p-1.5 hover:bg-[var(--shell-hover)]"
                        aria-label="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[var(--shell-text)]">{field.displayValue}</span>
                  )}
                </Td>
                <Td className="text-center">
                  {canEdit && !isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(field)}
                      className="inline-flex rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-sky-500/10 hover:text-sky-500"
                      aria-label={`Modifier ${field.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </StickyTable>
      {menuNode}
    </>
  );
}
