import type { Grade, JobPosition } from "./types";

const GRADE_RANK: Record<Grade, number> = {
  Direction: 0,
  "Cadre supérieur": 1,
  Cadre: 2,
  "Agent maîtrise": 3,
  Agent: 4,
  Ouvrier: 5,
};

function rank(grade: Grade): number {
  return GRADE_RANK[grade] ?? 99;
}

export { rank as gradeRank };

/** Reconstruit reportsToId pour un arbre hiérarchique type organigramme Visio */
export function rebuildPositionHierarchy(positions: JobPosition[]): void {
  if (positions.length === 0) return;

  for (const p of positions) {
    p.reportsToId = null;
  }

  const companyRoot =
    positions.find(
      (p) =>
        p.department === "Direction Générale" &&
        rank(p.grade) <= 1 &&
        /directeur|général|dg/i.test(p.title)
    ) ??
    positions.find((p) => p.department === "Direction Générale" && rank(p.grade) <= 1) ??
    positions.reduce((best, p) => (rank(p.grade) < rank(best.grade) ? p : best));

  const byDept = new Map<string, JobPosition[]>();
  for (const p of positions) {
    const list = byDept.get(p.department) ?? [];
    list.push(p);
    byDept.set(p.department, list);
  }

  for (const [, deptPositions] of byDept) {
    const sorted = [...deptPositions].sort(
      (a, b) => rank(a.grade) - rank(b.grade) || a.title.localeCompare(b.title, "fr")
    );

    for (let i = 0; i < sorted.length; i++) {
      const pos = sorted[i];
      if (pos.id === companyRoot.id) continue;

      let manager: JobPosition | null = null;

      for (let j = i - 1; j >= 0; j--) {
        if (rank(sorted[j].grade) < rank(pos.grade)) {
          manager = sorted[j];
          break;
        }
      }

      if (!manager) {
        if (rank(pos.grade) <= 1 && pos.department !== companyRoot.department) {
          manager = companyRoot;
        } else {
          manager = sorted[0].id !== pos.id ? sorted[0] : companyRoot;
        }
      }

      if (manager.id !== pos.id) {
        pos.reportsToId = manager.id;
      }
    }
  }

  // Racine unique : tout responsable de département (niveau 0–1) hors DG rattache au sommet
  for (const p of positions) {
    if (p.id === companyRoot.id) {
      p.reportsToId = null;
      continue;
    }
    if (!p.reportsToId && rank(p.grade) <= 1 && p.id !== companyRoot.id) {
      p.reportsToId = companyRoot.id;
    }
    if (!p.reportsToId && rank(p.grade) > 1) {
      const deptHead = byDept
        .get(p.department)
        ?.find((d) => rank(d.grade) === Math.min(...(byDept.get(p.department) ?? []).map((x) => rank(x.grade))));
      if (deptHead && deptHead.id !== p.id) p.reportsToId = deptHead.id;
      else p.reportsToId = companyRoot.id;
    }
  }
}

export function getOrganigrammeRoot(positions: JobPosition[]): JobPosition | null {
  if (!positions.length) return null;
  const ids = new Set(positions.map((p) => p.id));
  const roots = positions.filter((p) => !p.reportsToId || !ids.has(p.reportsToId));
  if (roots.length === 1) return roots[0];
  return (
    roots.find((p) => p.department === "Direction Générale") ??
    roots.reduce((best, p) => (rank(p.grade) < rank(best.grade) ? p : best), roots[0])
  );
}

/** Responsable de département : racine hiérarchique la plus haute du lot */
export function getDeptHead(deptPositions: JobPosition[]): JobPosition {
  const deptIds = new Set(deptPositions.map((p) => p.id));
  const roots = deptPositions.filter((p) => !p.reportsToId || !deptIds.has(p.reportsToId));
  const pool = roots.length ? roots : deptPositions;
  return [...pool].sort(
    (a, b) =>
      rank(a.grade) - rank(b.grade) ||
      a.title.localeCompare(b.title, "fr")
  )[0];
}

export type DeptOrgNode = {
  position: JobPosition;
  children: DeptOrgNode[];
};

function inferImmediateSuperior(
  position: JobPosition,
  deptPositions: JobPosition[],
  head: JobPosition
): JobPosition {
  const superiors = deptPositions.filter(
    (p) => p.id !== position.id && rank(p.grade) < rank(position.grade)
  );
  if (!superiors.length) return head;
  return superiors.reduce((best, p) => (rank(p.grade) > rank(best.grade) ? p : best));
}

function resolveDeptParent(
  position: JobPosition,
  deptPositions: JobPosition[],
  head: JobPosition,
  byId: Map<string, JobPosition>,
  deptIds: Set<string>
): JobPosition {
  const inferred = inferImmediateSuperior(position, deptPositions, head);

  if (position.reportsToId && deptIds.has(position.reportsToId)) {
    const explicit = byId.get(position.reportsToId)!;
    if (rank(explicit.grade) < rank(position.grade)) {
      if (
        inferred.id !== explicit.id &&
        rank(inferred.grade) > rank(explicit.grade) &&
        rank(inferred.grade) < rank(position.grade)
      ) {
        return inferred;
      }
      return explicit;
    }
  }

  return inferred;
}

function sortDeptPositions(a: JobPosition, b: JobPosition): number {
  return rank(a.grade) - rank(b.grade) || a.title.localeCompare(b.title, "fr");
}

/** Arbre hiérarchique d'un département (supérieur → subordonnés, niveaux par grade). */
export function buildDeptOrgTree(deptPositions: JobPosition[]): DeptOrgNode | null {
  if (!deptPositions.length) return null;

  const head = getDeptHead(deptPositions);
  const byId = new Map(deptPositions.map((p) => [p.id, p]));
  const deptIds = new Set(deptPositions.map((p) => p.id));
  const childrenOf = new Map<string, JobPosition[]>();

  for (const position of deptPositions) {
    if (position.id === head.id) continue;
    const parent = resolveDeptParent(position, deptPositions, head, byId, deptIds);
    const list = childrenOf.get(parent.id) ?? [];
    list.push(position);
    childrenOf.set(parent.id, list);
  }

  for (const kids of childrenOf.values()) {
    kids.sort(sortDeptPositions);
  }

  function buildNode(position: JobPosition): DeptOrgNode {
    const kids = childrenOf.get(position.id) ?? [];
    return {
      position,
      children: kids.map(buildNode),
    };
  }

  return buildNode(head);
}
