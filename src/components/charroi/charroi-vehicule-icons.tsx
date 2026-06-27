"use client";

import { Bus, Car, Bike } from "lucide-react";
import type { CharroiVehiculeStatut } from "@/lib/repositories/charroi";
import { cn } from "@/lib/utils";

export type VehiculeIconKind =
  | "bus"
  | "minibus"
  | "pickup"
  | "jeep"
  | "remorque"
  | "camion"
  | "car"
  | "moto";

export function vehiculeIconKind(modele?: string): VehiculeIconKind {
  const m = (modele ?? "").toLowerCase();
  if (/moto|scooter|bike/.test(m)) return "moto";
  if (/remorque|semi|trailer|plateau/.test(m)) return "remorque";
  if (/camion|howo|actros|canter|npr|fvr|poids lourd|sinotruk|foton aumark/.test(m)) return "camion";
  if (/jeep|land cruiser|prado|defender|patrol|pajero|rav4|fortuner|4x4|suv|duster|everest/.test(m)) {
    return "jeep";
  }
  if (/pick|pick up|hilux|l200|navara|hardbody|d-max|ranger|amarok|pick-up|double cab/.test(m)) {
    return "pickup";
  }
  if (/minibus|coaster|sprinter|h1|urvan|master|transporter/.test(m)) return "minibus";
  if (/hiace|bus|autocar/.test(m)) return "bus";
  return "car";
}

export const VEHICULE_ICON_LABEL: Record<VehiculeIconKind, string> = {
  bus: "Bus",
  minibus: "Minibus",
  pickup: "Pick-up",
  jeep: "Jeep / 4×4",
  remorque: "Remorque",
  camion: "Camion",
  car: "Voiture",
  moto: "Moto",
};

function PickupSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 14h11V9l2.5-3H20v8h1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v3h1.5M14 14v3h5.5" strokeLinecap="round" />
      <circle cx="6.5" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
      <path d="M8 9V6h4" strokeLinecap="round" />
    </svg>
  );
}

function JeepSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 14h16V10l-2-3H6L4 10v4z" strokeLinejoin="round" />
      <path d="M8 7V5h8v2M4 10h16" strokeLinecap="round" />
      <circle cx="7.5" cy="14.5" r="1.4" />
      <circle cx="16.5" cy="14.5" r="1.4" />
      <path d="M12 5v2" strokeLinecap="round" />
    </svg>
  );
}

function RemorqueSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="9" width="14" height="6" rx="1" />
      <path d="M17 12h2l2 2v1h-4" strokeLinejoin="round" />
      <circle cx="7" cy="16.5" r="1.5" />
      <circle cx="14" cy="16.5" r="1.5" />
    </svg>
  );
}

function CamionSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 14h12V8h6l2 3v3h2" strokeLinejoin="round" />
      <path d="M2 14v2h2M14 14v2h6" strokeLinecap="round" />
      <circle cx="6" cy="16.5" r="1.5" />
      <circle cx="18" cy="16.5" r="1.5" />
    </svg>
  );
}

function IconForKind({ kind, className }: { kind: VehiculeIconKind; className?: string }) {
  if (kind === "bus" || kind === "minibus") {
    return <Bus className={className} strokeWidth={kind === "minibus" ? 2.2 : 1.75} />;
  }
  if (kind === "pickup") return <PickupSvg className={className} />;
  if (kind === "jeep") return <JeepSvg className={className} />;
  if (kind === "remorque") return <RemorqueSvg className={className} />;
  if (kind === "camion") return <CamionSvg className={className} />;
  if (kind === "moto") return <Bike className={className} strokeWidth={1.75} />;
  return <Car className={className} strokeWidth={1.75} />;
}

const STATUT_RING: Record<CharroiVehiculeStatut, string> = {
  disponible: "ring-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  affecte: "ring-sky-500/40 bg-sky-500/10 text-sky-400",
  en_course: "ring-amber-500/40 bg-amber-500/10 text-amber-400",
  maintenance: "ring-red-500/40 bg-red-500/10 text-red-400",
};

export const STATUT_LABEL: Record<CharroiVehiculeStatut, string> = {
  disponible: "Disponible",
  affecte: "Affecté",
  en_course: "En route",
  maintenance: "Hors service",
};

const STATUT_BADGE: Record<CharroiVehiculeStatut, string> = {
  disponible: "bg-emerald-500/15 text-emerald-400",
  affecte: "bg-sky-500/15 text-sky-400",
  en_course: "bg-amber-500/15 text-amber-400",
  maintenance: "bg-red-500/15 text-red-400",
};

export function VehiculeTypeIcon({
  modele,
  statut = "disponible",
  size = "md",
  className,
}: {
  modele?: string;
  statut?: CharroiVehiculeStatut;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const kind = vehiculeIconKind(modele);
  const dim =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-14 w-14";
  const iconSize = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-7 w-7";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full ring-2",
        dim,
        STATUT_RING[statut],
        className
      )}
      title={VEHICULE_ICON_LABEL[kind]}
    >
      <IconForKind kind={kind} className={iconSize} />
    </div>
  );
}

export function VehiculeStatutBadge({
  statut,
  compact = false,
}: {
  statut: CharroiVehiculeStatut;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full font-medium",
        compact ? "px-1 py-0 text-[8px] leading-tight" : "mt-1 px-2 py-0.5 text-[10px]",
        STATUT_BADGE[statut]
      )}
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}
