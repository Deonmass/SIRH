import { headers } from "next/headers";

export const ACTIVITY_ACTOR_HEADER = "x-activity-actor";

export async function getActivityActor(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get(ACTIVITY_ACTOR_HEADER);
  } catch {
    return null;
  }
}
