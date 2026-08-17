"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Zone = {
  code: string;
  label: string;
  type: "Indoor" | "Outdoor";
};

type WarehouseLayoutMapProps = {
  zones?: Zone[];
  className?: string;
};

const defaultZones: Zone[] = [
  { code: "ZONA A", label: "Indoor", type: "Indoor" },
  { code: "ZONA B", label: "Indoor", type: "Indoor" },
  { code: "ZONA C", label: "Outdoor", type: "Outdoor" },
  { code: "ZONA D", label: "Outdoor", type: "Outdoor" },
];

export function WarehouseLayoutMap({
  zones = defaultZones,
  className,
}: WarehouseLayoutMapProps) {
  const zoneMap = new Map(zones.map((z) => [z.code, z]));

  const zonaA = zoneMap.get("ZONA A") ?? defaultZones[0];
  const zonaB = zoneMap.get("ZONA B") ?? defaultZones[1];
  const zonaC = zoneMap.get("ZONA C") ?? defaultZones[2];
  const zonaD = zoneMap.get("ZONA D") ?? defaultZones[3];

  const indoorClasses = "bg-[#f7965c] text-slate-900";
  const outdoorClasses = "bg-[#fff0e5] text-slate-900";
  const corridorClasses = "bg-[#e2fbe2]";

  const ZoneCell = ({
    zone,
    classes,
    children,
  }: {
    zone: Zone;
    classes: string;
    children?: ReactNode;
  }) => (
    <div
      className={`flex flex-col items-center justify-center rounded-xl p-6 ${classes}`}
    >
      <span className="text-base font-bold">{zone.code}</span>
      <span className="mt-1 text-xs font-medium opacity-80">{zone.label}</span>
      {children}
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid grid-cols-[1fr_auto_1fr] grid-rows-[1fr_auto_1fr] gap-3"
        style={{ minWidth: 640 }}
      >
        {/* Row 1 */}
        <ZoneCell zone={zonaA} classes={indoorClasses} />
        <div
          className={`flex items-center justify-center rounded-xl px-2 ${corridorClasses}`}
        >
          <div
            className="whitespace-nowrap text-xs font-bold text-slate-700"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Lorong
          </div>
        </div>
        <ZoneCell zone={zonaB} classes={indoorClasses} />

        {/* Row 2 */}
        <div className={`rounded-xl ${corridorClasses}`} />
        <div className={`rounded-xl ${corridorClasses}`} />
        <div className={`rounded-xl ${corridorClasses}`} />

        {/* Row 3 */}
        <ZoneCell zone={zonaC} classes={outdoorClasses} />
        <div
          className={`flex items-center justify-center rounded-xl px-2 ${corridorClasses}`}
        >
          <div
            className="whitespace-nowrap text-xs font-bold text-slate-700"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Lorong
          </div>
        </div>
        <ZoneCell zone={zonaD} classes={outdoorClasses} />
      </div>
    </div>
  );
}
