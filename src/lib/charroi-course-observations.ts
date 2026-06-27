export interface CourseObservations {
  depart: string;
  arrive: string;
}

export function buildCourseObservations(
  depart?: string,
  arrive?: string
): string {
  return JSON.stringify({
    depart: depart?.trim() ?? "",
    arrive: arrive?.trim() ?? "",
  });
}

export function parseCourseObservations(raw?: string): CourseObservations {
  if (!raw?.trim()) return { depart: "", arrive: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<CourseObservations>;
    if (parsed && typeof parsed === "object") {
      return {
        depart: typeof parsed.depart === "string" ? parsed.depart : "",
        arrive: typeof parsed.arrive === "string" ? parsed.arrive : "",
      };
    }
  } catch {
    return { depart: raw.trim(), arrive: "" };
  }
  return { depart: "", arrive: "" };
}
