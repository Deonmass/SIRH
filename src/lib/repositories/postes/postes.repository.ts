import type { DbPosteRow } from "../../../../database/migrations/001_postes.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { Employee, JobPosition } from "@/lib/types";
import {
  attachEmployeeIds,
  buildCodeMaps,
  jobPositionToRow,
  normalizePositionStatus,
  posteIdFromApp,
  posteIdToApp,
  rowToJobPosition,
} from "./mapper";

const TABLE = "postes";

function client() {
  return createSupabaseAdminAnonClient();
}

async function selectAllRows(): Promise<DbPosteRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw new Error(`postes.select: ${error.message}`);
  return (data ?? []) as DbPosteRow[];
}

export async function fetchPosteRows(): Promise<DbPosteRow[]> {
  return selectAllRows();
}

export function listPostesFromRows(
  rows: DbPosteRow[],
  employees: Employee[]
): JobPosition[] {
  const maps = buildCodeMaps(rows);
  const positions = rows.map((row) => rowToJobPosition(row, maps));
  return attachEmployeeIds(positions, employees);
}

export async function nextPosteCode(department: string): Promise<string> {
  const prefix = department.slice(0, 4).toUpperCase().replace(/\s/g, "");
  const codePrefix = `POSTE-${prefix}-`;
  const { data, error } = await client()
    .from(TABLE)
    .select("code")
    .like("code", `${codePrefix}%`);
  if (error) throw new Error(`postes.codes: ${error.message}`);

  const suffixRe = new RegExp(
    `^${codePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`
  );
  let max = 0;
  for (const row of data ?? []) {
    const match = row.code.match(suffixRe);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${codePrefix}${String(max + 1).padStart(4, "0")}`;
}

export async function listPostes(employees: Employee[]): Promise<JobPosition[]> {
  const rows = await selectAllRows();
  const maps = buildCodeMaps(rows);
  const positions = rows.map((row) => rowToJobPosition(row, maps));
  return attachEmployeeIds(positions, employees);
}

export async function getPosteById(
  id: string,
  employees: Employee[],
  cachedRows?: DbPosteRow[]
): Promise<JobPosition | null> {
  const numericId = posteIdFromApp(id);
  const rows = cachedRows ?? (await selectAllRows());
  const row = rows.find((r) => r.id === numericId);
  if (row) {
    const maps = buildCodeMaps(rows);
    const position = rowToJobPosition(row, maps);
    return attachEmployeeIds([position], employees)[0] ?? null;
  }

  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`postes.get: ${error.message}`);
  if (!data) return null;

  const allRows = [...rows, data as DbPosteRow];
  const maps = buildCodeMaps(allRows);
  const position = rowToJobPosition(data as DbPosteRow, maps);
  return attachEmployeeIds([position], employees)[0] ?? null;
}

export async function createPoste(
  partial: Omit<JobPosition, "id" | "code" | "createdAt" | "updatedAt"> & { code?: string },
  employees: Employee[]
): Promise<JobPosition> {
  const rows = await selectAllRows();
  const maps = buildCodeMaps(rows);
  const now = new Date().toISOString();
  const draft: JobPosition = normalizePositionStatus({
    ...partial,
    id: "0",
    code: partial.code ?? (await nextPosteCode(partial.department)),
    employeeId: partial.employeeId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const { data, error } = await client()
    .from(TABLE)
    .insert(jobPositionToRow(draft, maps))
    .select("*")
    .single();
  if (error) throw new Error(`postes.insert: ${error.message}`);

  const allRows = [...rows, data as DbPosteRow];
  const nextMaps = buildCodeMaps(allRows);
  const created = rowToJobPosition(data as DbPosteRow, nextMaps);
  return attachEmployeeIds([created], employees)[0]!;
}

export async function updatePoste(
  position: JobPosition,
  employees?: Employee[],
  cachedRows?: DbPosteRow[]
): Promise<JobPosition> {
  const { position: updated } = await updatePosteCached(position, employees, cachedRows);
  return updated;
}

/** Met à jour un poste en réutilisant le cache des lignes (évite N× select sur affectation). */
export async function updatePosteCached(
  position: JobPosition,
  employees?: Employee[],
  cachedRows?: DbPosteRow[]
): Promise<{ position: JobPosition; rows: DbPosteRow[] }> {
  const rows = cachedRows ? [...cachedRows] : await selectAllRows();
  const maps = buildCodeMaps(rows);
  const numericId = posteIdFromApp(position.id);
  const normalized = normalizePositionStatus({
    ...position,
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await client()
    .from(TABLE)
    .update(jobPositionToRow(normalized, maps))
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`postes.update: ${error.message}`);

  const nextRows = rows.map((row) => (row.id === numericId ? (data as DbPosteRow) : row));
  const refreshedMaps = buildCodeMaps(nextRows);
  const updated = rowToJobPosition(data as DbPosteRow, refreshedMaps);
  const attached = employees ? attachEmployeeIds([updated], employees)[0]! : updated;
  return { position: attached, rows: nextRows };
}

export async function deletePoste(id: string): Promise<boolean> {
  const numericId = posteIdFromApp(id);
  const { data: existing, error: fetchError } = await client()
    .from(TABLE)
    .select("code")
    .eq("id", numericId)
    .maybeSingle();
  if (fetchError) throw new Error(`postes.get: ${fetchError.message}`);
  if (!existing) return false;

  const { error: orphanError } = await client()
    .from(TABLE)
    .update({ sup_code: null })
    .eq("sup_code", existing.code);
  if (orphanError) throw new Error(`postes.orphan: ${orphanError.message}`);

  const { error } = await client().from(TABLE).delete().eq("id", numericId);
  if (error) throw new Error(`postes.delete: ${error.message}`);
  return true;
}

export { posteIdToApp };
