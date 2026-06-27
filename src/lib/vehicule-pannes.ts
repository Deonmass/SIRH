export type VehiculePanneEventType = "panne" | "remise_service";

export interface VehiculePanneEvent {
  type: VehiculePanneEventType;
  description: string;
  at: string;
}

export function parseVehiculePannes(raw: unknown): VehiculePanneEvent[] {
  if (!raw) return [];
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is VehiculePanneEvent =>
        item != null &&
        typeof item === "object" &&
        (item.type === "panne" || item.type === "remise_service") &&
        typeof item.description === "string" &&
        typeof item.at === "string"
    )
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function isVehiculeHorsService(events: VehiculePanneEvent[]): boolean {
  if (!events.length) return false;
  return events[events.length - 1]!.type === "panne";
}

export function lastPanneEvent(events: VehiculePanneEvent[]): VehiculePanneEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === "panne") return events[i]!;
  }
  return null;
}

export function appendVehiculePanneEvent(
  events: VehiculePanneEvent[],
  event: VehiculePanneEvent
): VehiculePanneEvent[] {
  return [...events, event];
}

export function serializeVehiculePannes(events: VehiculePanneEvent[]): string {
  return JSON.stringify(events);
}
