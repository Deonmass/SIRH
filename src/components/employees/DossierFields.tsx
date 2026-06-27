"use client";

import { cn } from "@/lib/utils";

export const dossierInputClass =
  "w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm text-[var(--shell-text)] placeholder:text-[var(--shell-text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-500/40";

export function DossierSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function DossierGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
  );
}

export function DossierField({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium text-[var(--shell-text-muted)]">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-[var(--shell-text-muted)]">{hint}</span>}
    </label>
  );
}

export function DossierTextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  required,
  autoFocus,
  onKeyDown,
}: {
  value: string | number | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      className={cn(dossierInputClass, readOnly && "opacity-70 cursor-not-allowed")}
    />
  );
}

export function DossierTextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={dossierInputClass}
    />
  );
}

export function DossierSelect({
  value,
  onChange,
  options,
}: {
  value: string | number | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={dossierInputClass}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
