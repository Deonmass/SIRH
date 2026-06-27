const RDC_HOLIDAY_MD = [
  "01-01",
  "01-04",
  "01-16",
  "05-01",
  "05-17",
  "06-30",
  "08-01",
  "12-25",
] as const;

export function isRdcHoliday(iso: string): boolean {
  return RDC_HOLIDAY_MD.includes(iso.slice(5) as (typeof RDC_HOLIDAY_MD)[number]);
}

/** Jours ouvrables entre deux dates incluses (lun–ven, hors fériés RDC). */
export function countWorkingDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  const d = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  let total = 0;
  while (d <= last) {
    const day = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    const weekend = day === 0 || day === 6;
    if (!weekend && !isRdcHoliday(iso)) total++;
    d.setDate(d.getDate() + 1);
  }
  return total;
}

/** Date de fin pour exactement `count` jours ouvrables à partir de `start` (inclus). */
export function addWorkingDays(start: string, count: number): string {
  if (!start || count < 1) return start;
  const d = new Date(`${start}T12:00:00`);
  let collected = 0;
  while (collected < count) {
    const day = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    const weekend = day === 0 || day === 6;
    if (!weekend && !isRdcHoliday(iso)) {
      collected++;
      if (collected === count) return iso;
    }
    d.setDate(d.getDate() + 1);
  }
  return start;
}
