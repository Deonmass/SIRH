import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export type PageSkeletonVariant =
  | "default"
  | "dashboard"
  | "list"
  | "table"
  | "form"
  | "checking";

function PageHeaderSkeleton({ actions = false }: { actions?: boolean }) {
  return (
    <div className="page-header mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {actions && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      )}
    </div>
  );
}

function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "mb-6 grid w-full gap-3",
        "[grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[96px] flex-col justify-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function TabsRowSkeleton({ tabs = 5 }: { tabs?: number }) {
  return (
    <div className="-mx-8 mb-4 border-b border-[var(--shell-border)] px-8 pb-0">
      <div className="flex gap-4 pt-1">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-9 w-24 rounded-t-lg" />
        ))}
      </div>
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-8 w-[4.25rem] rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--shell-border)]">
      <div className="flex gap-4 border-b border-[var(--shell-border)] bg-[var(--shell-table-head)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--shell-border)]">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, col) => (
              <Skeleton
                key={col}
                className={cn("h-4 flex-1", col === 0 && "max-w-[8rem]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsGridSkeleton({
  count = 10,
  cols = 5,
  cardClassName,
}: {
  count?: number;
  cols?: 2 | 3 | 4 | 5;
  cardClassName?: string;
}) {
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === 4
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : cols === 5
            ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "min-h-[152px] rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4",
            cardClassName
          )}
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="mt-3 h-3 w-20" />
          <Skeleton className="mt-2 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-4 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function CheckingCardsSkeleton() {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,9.5rem))]">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[7.5rem] flex-col items-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-3"
        >
          <Skeleton className="my-2 h-9 w-14" />
          <div className="mt-auto w-full space-y-1.5 border-t border-[var(--shell-border)] pt-2">
            <Skeleton className="mx-auto h-3 w-20" />
            <Skeleton className="mx-auto h-2.5 w-16" />
            <Skeleton className="mx-auto h-2 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCardsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4"
        >
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl space-y-6 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  );
}

export function PageSkeleton({
  variant = "default",
  className,
}: {
  variant?: PageSkeletonVariant;
  className?: string;
}) {
  return (
    <div className={className} aria-busy aria-label="Chargement">
      {variant === "checking" ? (
        <>
          <PageHeaderSkeleton />
          <StatsRowSkeleton count={4} />
          <ToolbarSkeleton />
          <CheckingCardsSkeleton />
        </>
      ) : variant === "list" ? (
        <>
          <PageHeaderSkeleton actions />
          <TabsRowSkeleton tabs={6} />
          <Skeleton className="mb-4 h-4 w-40" />
          <CardsGridSkeleton count={10} cols={5} />
        </>
      ) : variant === "dashboard" ? (
        <>
          <PageHeaderSkeleton />
          <StatsRowSkeleton count={6} />
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <ChartCardsSkeleton />
        </>
      ) : variant === "table" ? (
        <>
          <PageHeaderSkeleton actions />
          <ToolbarSkeleton />
          <TableSkeleton rows={10} cols={6} />
        </>
      ) : variant === "form" ? (
        <>
          <PageHeaderSkeleton />
          <FormSkeleton />
        </>
      ) : (
        <>
          <PageHeaderSkeleton />
          <StatsRowSkeleton count={4} />
          <TableSkeleton rows={8} cols={5} />
        </>
      )}
    </div>
  );
}

/** Skeleton contenu liste employés (rechargement client). */
export function EmployeeListContentSkeleton() {
  return (
    <>
      <TabsRowSkeleton tabs={6} />
      <Skeleton className="mb-4 h-4 w-40" />
      <CardsGridSkeleton count={10} cols={5} />
    </>
  );
}

/** Skeleton contenu checking documents (rechargement client). */
export function CheckingDocumentsContentSkeleton({ viewMode = "cards" }: { viewMode?: "cards" | "table" }) {
  return viewMode === "cards" ? <CheckingCardsSkeleton /> : <TableSkeleton rows={8} cols={5} />;
}

/** Skeleton masse salariale paie. */
export function PaieMasseSkeleton() {
  return (
    <div className="space-y-6">
      <StatsRowSkeleton count={6} />
      <ChartCardsSkeleton />
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
