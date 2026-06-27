"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import {
  fullPermissionMatrix,
  isAdminUsername,
  PERMISSION_MODULES,
  PERMISSION_SECTION_META,
  sectionActionLabel,
  sectionActionsFor,
  sectionHasAllActions,
  sectionHasAnyAction,
  setAllActionsForSection,
  togglePermissionAction,
  type PermissionAction,
  type PermissionMatrix,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function PermissionsMatrixEditor({
  value,
  onChange,
  username,
  className,
}: {
  value: PermissionMatrix;
  onChange: (next: PermissionMatrix) => void;
  username?: string;
  className?: string;
}) {
  const isAdmin = username ? isAdminUsername(username) : false;
  const matrix = isAdmin ? fullPermissionMatrix() : value;

  const firstSectionId = PERMISSION_MODULES[0]?.sections[0]?.id ?? "";
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const mod of PERMISSION_MODULES) {
      initial[mod.id] = mod.sections.some((s) => s.id === firstSectionId);
    }
    return initial;
  });

  useEffect(() => {
    const mod = PERMISSION_MODULES.find((m) =>
      m.sections.some((s) => s.id === activeSectionId)
    );
    if (mod) {
      setOpenModules((prev) => ({ ...prev, [mod.id]: true }));
    }
  }, [activeSectionId]);

  function toggleModule(moduleId: string) {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }

  const activeSection = useMemo(() => {
    for (const mod of PERMISSION_MODULES) {
      const found = mod.sections.find((s) => s.id === activeSectionId);
      if (found) return { module: mod, section: found };
    }
    return null;
  }, [activeSectionId]);

  const activeSectionMeta = PERMISSION_SECTION_META[activeSectionId];
  const activeActions = sectionActionsFor(activeSectionId);

  function toggleAction(action: PermissionAction, enabled: boolean) {
    if (isAdmin) return;
    onChange(togglePermissionAction(matrix, activeSectionId, action, enabled));
  }

  function toggleSectionAll(enabled: boolean) {
    if (isAdmin) return;
    onChange(setAllActionsForSection(matrix, activeSectionId, enabled));
  }

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-var(--page-header-h)-2rem)] min-h-[24rem] -mx-8 gap-4 border-t border-[var(--shell-border)]",
        className
      )}
    >
      <nav
        className="h-full w-[30%] shrink-0 overflow-y-auto bg-[var(--shell-bg)]/40 pr-1"
        aria-label="Modules et pages"
      >
        {PERMISSION_MODULES.map((mod) => {
          const expanded = openModules[mod.id] ?? false;
          const moduleHasAny = mod.sections.some((s) => sectionHasAnyAction(matrix, s.id));
          const moduleHasAll = mod.sections.every((s) => sectionHasAllActions(matrix, s.id));
          return (
            <div key={mod.id} className="border-b border-[var(--shell-border)] last:border-b-0">
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-[var(--shell-hover)]"
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-[var(--shell-text-muted)] transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                />
                <span className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--shell-text-muted)]">
                  {mod.label}
                </span>
                {moduleHasAll ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                ) : moduleHasAny ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                ) : null}
              </button>
              {expanded && (
                <ul className="pb-1">
                  {mod.sections.map((section) => {
                    const active = section.id === activeSectionId;
                    const hasAny = sectionHasAnyAction(matrix, section.id);
                    const hasAll = sectionHasAllActions(matrix, section.id);
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSectionId(section.id)}
                          className={cn(
                            "flex w-full items-center gap-2 py-2 pl-9 pr-4 text-left text-xs transition",
                            active
                              ? "bg-sky-600/15 font-semibold text-sky-600 dark:text-sky-300"
                              : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                          )}
                        >
                          <span className="min-w-0 flex-1">{section.label}</span>
                          {hasAll ? (
                            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                          ) : hasAny ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="h-full w-[70%] min-w-0 overflow-y-auto pl-1">
        <div className="px-6 py-5">
          {isAdmin && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Compte administrateur — accès complet (toutes les cases cochées)
            </div>
          )}

          {activeSection ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
                    {activeSection.module.label}
                  </p>
                  <h3 className="text-base font-semibold text-[var(--shell-text)]">
                    {activeSection.section.label}
                  </h3>
                  {activeSectionMeta?.description && (
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--shell-text-muted)]">
                      {activeSectionMeta.description}
                    </p>
                  )}
                </div>
                {!isAdmin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionAll(true)}
                      className="rounded-lg border border-[var(--shell-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSectionAll(false)}
                      className="rounded-lg border border-[var(--shell-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                    >
                      Tout décocher
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {activeActions.map((action) => {
                  const checked = matrix[activeSectionId]?.[action] === true;
                  return (
                    <label
                      key={action}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                        checked
                          ? "border-sky-500/40 bg-sky-500/10"
                          : "border-[var(--shell-border)] hover:border-sky-500/25 hover:bg-[var(--shell-hover)]",
                        isAdmin && "cursor-default opacity-90"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAdmin}
                        onChange={(e) => toggleAction(action, e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--shell-border)] text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium text-[var(--shell-text)]">
                        {sectionActionLabel(activeSectionId, action)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--shell-text-muted)]">Sélectionnez une page à gauche.</p>
          )}
        </div>
      </div>
    </div>
  );
}
