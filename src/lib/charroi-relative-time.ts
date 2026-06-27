export function combineDateAndTime(date: string, time: string): string {
  const d = date.trim();
  const t = (time.trim() || "00:00").slice(0, 5);
  if (!d) return new Date().toISOString();
  return new Date(`${d}T${t}:00`).toISOString();
}

export function formatRelativeFromNow(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  const future = diffSec < 0;
  const abs = Math.abs(diffSec);

  if (abs < 45) return future ? "dans un instant" : "à l'instant";
  const min = Math.floor(abs / 60);
  if (min < 60) return future ? `dans ${min} min` : `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return future ? `dans ${hours} h` : `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return future ? `dans ${days} j` : `il y a ${days} j`;
}

export function formatDateTimeFr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function defaultTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Extrait date (YYYY-MM-DD) et heure (HH:mm) d'un ISO ou date seule. */
export function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso?.trim()) {
    return { date: new Date().toISOString().slice(0, 10), time: defaultTimeValue() };
  }
  const trimmed = iso.trim();
  if (trimmed.includes("T")) {
    return { date: trimmed.slice(0, 10), time: trimmed.slice(11, 16) || "08:00" };
  }
  return { date: trimmed.slice(0, 10), time: "08:00" };
}

/** Demande en attente dont la date/heure prévue est dépassée. */
export function isDemandeExpiree(dateDemande: string): boolean {
  const t = new Date(dateDemande).getTime();
  return !Number.isNaN(t) && t < Date.now();
}
