import type { CharroiVehicule } from "@/lib/repositories/charroi";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import { formatDateTimeFr, isDemandeExpiree } from "@/lib/charroi-relative-time";
import { employeeDisplayName } from "@/lib/extra-costs";
import type { Employee } from "@/lib/types";

/** Délai minimum entre deux courses pour le même chauffeur (minutes). */
const MIN_GAP_MINUTES = 90;

export function normalizeLieu(lieu?: string | null): string {
  if (!lieu?.trim()) return "";
  return lieu
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function courseTimestamp(course: CourseVehicule): number {
  const t = new Date(course.dateDemande).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sameCalendarDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function formatDateCourse(iso: string): string {
  return formatDateTimeFr(iso);
}

export interface ChainLinkReason {
  fromId: string;
  toId: string;
  label: string;
}

export interface AffectationProposal {
  id: string;
  chauffeurLabel: string;
  vehiculeId: string;
  vehiculeLabel: string;
  courses: CourseVehicule[];
  rationale: string;
  linkReasons: ChainLinkReason[];
  score: number;
}

function canChain(
  prev: CourseVehicule,
  next: CourseVehicule
): { ok: boolean; label: string; score: number } {
  if (!sameCalendarDay(prev.dateDemande, next.dateDemande)) {
    return { ok: false, label: "", score: 0 };
  }

  const tPrev = courseTimestamp(prev);
  const tNext = courseTimestamp(next);
  const gapMin = (tNext - tPrev) / 60_000;

  if (tNext <= tPrev) return { ok: false, label: "", score: 0 };
  if (gapMin < MIN_GAP_MINUTES) return { ok: false, label: "", score: 0 };

  const depPrev = normalizeLieu(prev.depart);
  const destPrev = normalizeLieu(prev.destination);
  const depNext = normalizeLieu(next.depart);
  const destNext = normalizeLieu(next.destination);

  if (depNext && destPrev && depNext === destPrev) {
    return {
      ok: true,
      label: `Enchaînement ${prev.destination ?? "?"} → ${next.depart ?? "?"}`,
      score: 30,
    };
  }

  if (depPrev && depNext && destPrev && destNext && depPrev === depNext && destPrev === destNext) {
    return {
      ok: true,
      label: `Même trajet ${prev.depart} → ${prev.destination}`,
      score: 20,
    };
  }

  if (destPrev && destNext && destPrev === destNext && depPrev && depNext && depPrev === depNext) {
    return {
      ok: true,
      label: `Même destination (${prev.destination}) depuis ${prev.depart}`,
      score: 15,
    };
  }

  if (destPrev && destNext && destPrev === destNext) {
    return {
      ok: true,
      label: `Destination commune : ${prev.destination}`,
      score: 10,
    };
  }

  return { ok: false, label: "", score: 0 };
}

function buildGreedyChains(courses: CourseVehicule[]): {
  chains: CourseVehicule[][];
  linkReasons: ChainLinkReason[][];
} {
  const sorted = [...courses].sort((a, b) => courseTimestamp(a) - courseTimestamp(b));
  const used = new Set<string>();
  const chains: CourseVehicule[][] = [];
  const allLinkReasons: ChainLinkReason[][] = [];

  for (const start of sorted) {
    if (used.has(start.id)) continue;

    const chain: CourseVehicule[] = [start];
    const reasons: ChainLinkReason[] = [];
    used.add(start.id);
    let current = start;

    while (true) {
      let best: CourseVehicule | null = null;
      let bestLink = { ok: false, label: "", score: 0 };

      for (const candidate of sorted) {
        if (used.has(candidate.id)) continue;
        const link = canChain(current, candidate);
        if (!link.ok) continue;
        if (
          !best ||
          link.score > bestLink.score ||
          (link.score === bestLink.score &&
            courseTimestamp(candidate) < courseTimestamp(best))
        ) {
          best = candidate;
          bestLink = link;
        }
      }

      if (!best) break;

      reasons.push({
        fromId: current.id,
        toId: best.id,
        label: bestLink.label,
      });
      chain.push(best);
      used.add(best.id);
      current = best;
    }

    chains.push(chain);
    allLinkReasons.push(reasons);
  }

  return { chains, linkReasons: allLinkReasons };
}

function buildRationale(chain: CourseVehicule[], linkReasons: ChainLinkReason[]): string {
  if (chain.length > 1 && linkReasons.length > 0) {
    return linkReasons.map((r) => r.label).join(" · ");
  }
  const dest = chain[0]?.destination?.trim();
  const when = chain[0] ? formatDateCourse(chain[0].dateDemande) : "";
  if (dest) return `Course du ${when} vers ${dest}`;
  return `Course du ${when}`;
}

function pickLeastLoadedDriver(
  chauffeurs: Employee[],
  load: Map<string, number>
): Employee {
  return chauffeurs.reduce((best, c) => {
    const bestLoad = load.get(best.id) ?? 0;
    const cLoad = load.get(c.id) ?? 0;
    return cLoad < bestLoad ? c : best;
  });
}

function pickAvailableVehicle(
  vehicules: CharroiVehicule[],
  usedIds: Set<string>
): CharroiVehicule | null {
  return vehicules.find((v) => !usedIds.has(v.id)) ?? vehicules[0] ?? null;
}

export function computeAffectationProposals(
  demandes: CourseVehicule[],
  chauffeurs: Employee[],
  vehiculesDisponibles: CharroiVehicule[]
): AffectationProposal[] {
  const demandesActives = demandes.filter((d) => !isDemandeExpiree(d.dateDemande));

  if (!demandesActives.length || !chauffeurs.length || !vehiculesDisponibles.length) {
    return [];
  }

  const { chains, linkReasons } = buildGreedyChains(demandesActives);
  const driverLoad = new Map<string, number>();
  const usedVehicles = new Set<string>();

  const indexed = chains
    .map((courses, i) => ({
      courses,
      links: linkReasons[i] ?? [],
      score:
        courses.length * 20 +
        (linkReasons[i]?.reduce((s, r) => s + 10, 0) ?? 0),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return courseTimestamp(a.courses[0]!) - courseTimestamp(b.courses[0]!);
    });

  const proposals: AffectationProposal[] = [];

  for (const item of indexed) {
    const chauffeur = pickLeastLoadedDriver(chauffeurs, driverLoad);
    const vehicule = pickAvailableVehicle(vehiculesDisponibles, usedVehicles);
    if (!vehicule) continue;

    driverLoad.set(chauffeur.id, (driverLoad.get(chauffeur.id) ?? 0) + item.courses.length);
    usedVehicles.add(vehicule.id);

    proposals.push({
      id: `prop-${item.courses.map((c) => c.id).join("-")}`,
      chauffeurLabel: employeeDisplayName(chauffeur),
      vehiculeId: vehicule.id,
      vehiculeLabel: vehicule.immatriculation,
      courses: item.courses,
      linkReasons: item.links,
      rationale: buildRationale(item.courses, item.links),
      score: item.score,
    });
  }

  return proposals.sort((a, b) => b.score - a.score);
}

export function formatCourseTrajet(course: CourseVehicule): string {
  const dep = course.depart?.trim() || "—";
  const dest = course.destination?.trim() || "—";
  return `${formatDateCourse(course.dateDemande)} · ${dep} → ${dest}`;
}
