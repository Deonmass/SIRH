"use client";

import { cn } from "@/lib/utils";
import { StickyTable, Td, Th } from "@/components/layout/StickyTable";

export interface FieldRow {
  key: string;
  label: string;
  value: React.ReactNode;
}

export function FieldsCardsView({ rows }: { rows: FieldRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.key}
          className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
            {r.label}
          </p>
          <div className="mt-1.5 text-sm text-[var(--shell-text)]">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

export function FieldsTableView({ rows }: { rows: FieldRow[] }) {
  return (
    <StickyTable className="max-h-none">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="hover:bg-[var(--shell-hover)]">
            <Td className="w-1/3 font-medium text-[var(--shell-text-muted)]">{r.label}</Td>
            <Td>{r.value}</Td>
          </tr>
        ))}
      </tbody>
    </StickyTable>
  );
}

export function HistoryCardsView({
  items,
  renderCard,
  emptyMessage = "Aucun élément.",
}: {
  items: unknown[];
  renderCard: (item: unknown, index: number) => React.ReactNode;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--shell-text-muted)]">{emptyMessage}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, i) => renderCard(item, i))}
    </div>
  );
}

export function HistoryTableView({
  columns,
  rows,
  emptyMessage = "Aucun élément.",
  onRowContextMenu,
  className,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: React.ReactNode[] }[];
  emptyMessage?: string;
  onRowContextMenu?: (e: React.MouseEvent, rowId: string) => void;
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--shell-text-muted)]">{emptyMessage}</p>;
  }
  return (
    <StickyTable className={cn("max-h-[min(400px,50vh)]", className)}>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c.key} className={c.className}>
              {c.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="hover:bg-[var(--shell-hover)]"
            onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(e, r.id) : undefined}
          >
            {r.cells.map((cell, i) => (
              <Td key={columns[i]?.key ?? i}>{cell}</Td>
            ))}
          </tr>
        ))}
      </tbody>
    </StickyTable>
  );
}

export function HistoryTimelineView({
  items,
  emptyMessage = "Aucun élément.",
  onItemContextMenu,
  compact = false,
  showHover = false,
}: {
  items: {
    id: string;
    date: string;
    title: string;
    subtitle?: string;
    amount?: string;
    badge?: string;
    status?: React.ReactNode;
    actions?: React.ReactNode;
  }[];
  emptyMessage?: string;
  onItemContextMenu?: (e: React.MouseEvent, id: string) => void;
  /** Réduit le padding pour tenir dans un panneau fixe */
  compact?: boolean;
  /** Surbrillance au survol + actions visibles au hover */
  showHover?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--shell-text-muted)]">{emptyMessage}</p>;
  }

  const dotTop = compact ? "top-[0.65rem]" : "top-[0.85rem]";
  const lineTop = compact ? "top-5" : "top-6";
  const rowPy = compact ? "py-2" : "py-3";

  return (
    <div className="space-y-0">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={cn("group relative flex items-start gap-2.5 pl-7 sm:pl-8", showHover && "cursor-default")}
          onContextMenu={onItemContextMenu ? (e) => onItemContextMenu(e, item.id) : undefined}
        >
          <span
            className={cn(
              "absolute left-[11px] z-[1] h-2.5 w-2.5 rounded-full border-2 border-[var(--shell-surface)] bg-sky-500 shadow-[0_0_0_1px_var(--shell-border)] transition group-hover:scale-110 group-hover:bg-sky-400",
              dotTop,
              !compact && "h-3 w-3"
            )}
          />
          {idx < items.length - 1 && (
            <span className={cn("absolute left-[17px] bottom-0 w-0.5 bg-[var(--shell-border)]", lineTop)} />
          )}
          <div
            className={cn(
              "min-w-0 flex-1 border-b border-[var(--shell-border)] last:border-b-0",
              rowPy,
              showHover &&
                "-mx-2 rounded-lg border-b-0 px-2 transition-colors group-hover:bg-[var(--shell-hover)]/80"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium text-[var(--shell-text)]", compact ? "text-xs" : "text-sm")}>
                  {item.title}
                </p>
                <p className={cn("text-[var(--shell-text-muted)]", compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs")}>
                  {item.date}
                </p>
                <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "mt-1" : "mt-1.5")}>
                  {item.amount && (
                    <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-600 sm:text-xs">
                      {item.amount}
                    </span>
                  )}
                  {item.badge && (
                    <span className="rounded-md bg-[var(--shell-surface)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--shell-text-muted)]">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <p
                    className={cn(
                      "leading-relaxed text-[var(--shell-text-muted)]",
                      compact ? "mt-1 text-[10px] line-clamp-2" : "mt-1.5 text-xs"
                    )}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              {(item.status || item.actions) && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {item.status}
                  {item.actions && (
                    <div
                      className={cn(
                        "flex items-center justify-end gap-0.5 transition-opacity",
                        showHover && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      )}
                    >
                      {item.actions}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelCard({
  title,
  headerAction,
  children,
  className,
}: {
  title?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-4",
        className
      )}
    >
      {(title || headerAction) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h4 className="text-xs font-semibold uppercase text-[var(--shell-text-muted)]">{title}</h4>
          )}
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}
