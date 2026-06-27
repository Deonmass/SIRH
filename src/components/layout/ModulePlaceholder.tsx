import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export function ModulePlaceholder({
  title,
  module,
  details,
}: {
  title: string;
  module: string;
  details?: string[];
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-surface)]/50 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Construction className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--shell-text)]">Module en développement</p>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
              La section <span className="font-medium text-[var(--shell-text)]">{module}</span> sera
              disponible prochainement.
            </p>
            {details && details.length > 0 && (
              <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[var(--shell-text-muted)]">
                {details.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
