import { departementLabels } from "@/lib/repositories/departements/mapper";
import { DEFAULT_DEPARTMENTS } from "./default-settings";

export function departmentToSlug(name: string): string {
  return encodeURIComponent(
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export function slugToDepartment(
  slug: string,
  departments: string[] = DEFAULT_DEPARTMENTS
): string | undefined {
  const decoded = decodeURIComponent(slug);
  return departments.find(
    (d) => departmentToSlug(d) === slug || d.toLowerCase() === decoded.toLowerCase()
  );
}

/** Libellés actifs triés — préférer getSettings().departments côté serveur */
export { departementLabels };
