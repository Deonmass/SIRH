import type { DossierTabId } from "./employee-dossier";

/** URL avec ouverture du dossier modal (liste ou checking document) */
export function employeeDossierHref(
  employeeId: string,
  opts?: { tab?: DossierTabId; from?: "employes" | "checking-documents" }
): string {
  const base =
    opts?.from === "checking-documents"
      ? "/employes/checking-documents"
      : "/employes";
  const params = new URLSearchParams({ dossier: employeeId });
  if (opts?.tab) params.set("tab", opts.tab);
  return `${base}?${params.toString()}`;
}
