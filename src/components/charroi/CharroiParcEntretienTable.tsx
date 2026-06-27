"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Loader2 } from "lucide-react";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { CharroiEntretienRecordModal } from "@/components/charroi/CharroiEntretienRecordModal";
import { EntretienAlertBadge, ProchainEntretienKmCell } from "@/components/charroi/CharroiEntretienUi";
import { VehiculeTypeIcon } from "@/components/charroi/charroi-vehicule-icons";
import { formatKm, type EntretienSuiviRow } from "@/lib/charroi-entretien";
import { cn } from "@/lib/utils";

export function CharroiParcEntretienTable({
  canWrite,
  onGoToSuivi,
}: {
  canWrite: boolean;
  onGoToSuivi?: () => void;
}) {
  const [items, setItems] = useState<EntretienSuiviRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordTarget, setRecordTarget] = useState<EntretienSuiviRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/charroi/entretien");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const alertRows = useMemo(
    () =>
      items.filter(
        (row) => row.alertLevel === "overdue" || row.alertLevel === "warning"
      ),
    [items]
  );

  if (loading) {
    return (
      <div className="mt-8 flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (alertRows.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-500">
          <Gauge className="h-4 w-4" />
          Véhicules à entretenir
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs tabular-nums">
            {alertRows.length}
          </span>
        </h3>
        {onGoToSuivi && (
          <button
            type="button"
            onClick={onGoToSuivi}
            className="text-xs text-sky-500 hover:underline"
          >
            Voir le suivi entretien complet →
          </button>
        )}
      </div>

      <StickyTable>
        <StickyThead>
          <tr>
            <Th className="w-16"> </Th>
            <Th>Véhicule</Th>
            <Th>Km actuel</Th>
            <Th>Prochain entretien</Th>
            <Th>Statut</Th>
            {canWrite && <Th className="w-32">Action</Th>}
          </tr>
        </StickyThead>
        <tbody>
          {alertRows.map((row) => (
            <tr
              key={row.vehiculeId}
              className={cn(
                "hover:bg-[var(--shell-hover)]",
                row.alertLevel === "overdue" && "bg-red-500/5",
                row.alertLevel === "warning" && "bg-amber-500/5"
              )}
            >
              <Td>
                <VehiculeTypeIcon
                  modele={row.vehicleType}
                  statut={row.horsService ? "maintenance" : "disponible"}
                  size="sm"
                />
              </Td>
              <Td>
                <div className="font-mono text-sm font-medium">{row.plaque}</div>
                <div className="text-xs text-[var(--shell-text-muted)]">
                  {[row.marque, row.vehicleType].filter(Boolean).join(" · ")}
                </div>
              </Td>
              <Td className="tabular-nums">{formatKm(row.kmActuel)}</Td>
              <Td>
                <ProchainEntretienKmCell
                  prochainKm={row.prochainEntretienKm}
                  kmRestant={row.kmRestantEntretien}
                  alertLevel={row.alertLevel}
                  size="sm"
                />
              </Td>
              <Td>
                <EntretienAlertBadge level={row.alertLevel} label={row.alertLabel} />
              </Td>
              {canWrite && (
                <Td>
                  {row.peutPasserEntretien ? (
                    <button
                      type="button"
                      onClick={() => setRecordTarget(row)}
                      className="rounded-lg border border-sky-500/30 px-2 py-1 text-[10px] font-medium text-sky-500 hover:bg-sky-500/10"
                    >
                      Passer entretien
                    </button>
                  ) : (
                    <span className="text-[10px] text-[var(--shell-text-muted)]">—</span>
                  )}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </StickyTable>

      {recordTarget && (
        <CharroiEntretienRecordModal
          target={recordTarget}
          canWrite={canWrite}
          onClose={() => setRecordTarget(null)}
          onSaved={async () => {
            setRecordTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
