import { cn } from "@/lib/utils";

export function StickyTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-xl border border-[var(--shell-border)] max-h-[calc(100vh-280px)]",
        className
      )}
    >
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function StickyThead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--shell-table-head)] shadow-[0_1px_0_0_var(--shell-border)]">
      {children}
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)] border-b border-[var(--shell-border)]",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-4 py-3 text-[var(--shell-text)] border-b border-[var(--shell-border)]", className)}
    >
      {children}
    </td>
  );
}
