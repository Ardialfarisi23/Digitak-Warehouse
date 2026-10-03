"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import {
  getKondisiLabel,
  getKondisiUnitRows,
  summarizeKondisiUnits,
  type KondisiUnit,
} from "@/lib/kondisi-barang";

// Ringkasan kondisi per unit untuk item yang punya penilaian per unit.
// Item lama (tanpa data unit) tidak boleh memakai komponen ini.
export function KondisiUnitSummary({
  units,
  defaultExpanded = false,
}: {
  units?: KondisiUnit[] | null;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const ringkasan = summarizeKondisiUnits(units);
  const baris = getKondisiUnitRows(units);

  if (ringkasan.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {ringkasan.map((entry) => (
          <span key={entry.value} className="inline-flex items-center gap-1">
            <KondisiBadge value={entry.value} />
            <span className="text-xs font-semibold text-gray-700">{entry.total}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E8632C] hover:underline"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Rincian {baris.length} unit
      </button>

      {expanded && (
        <ul className="mt-1 w-full space-y-1 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
          {baris.map((row) => (
            <li key={row.nomor} className="text-[11px] leading-tight text-gray-700">
              <span className="font-semibold text-gray-900">Unit {row.nomor}</span>
              <span className="mx-1 text-gray-300">|</span>
              <span>{getKondisiLabel(row.kondisi)}</span>
              {row.catatan && <span className="ml-1 italic text-gray-500">— {row.catatan}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default KondisiUnitSummary;