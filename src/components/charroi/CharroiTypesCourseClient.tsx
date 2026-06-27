"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { CharroiTypesCoursePanel } from "@/components/charroi/CharroiTypesCoursePanel";

export function CharroiTypesCourseClient() {
  return (
    <div>
      <PageHeader title="Types de course" description="Référentiel des types de déplacement" />
      <CharroiTypesCoursePanel />
    </div>
  );
}
