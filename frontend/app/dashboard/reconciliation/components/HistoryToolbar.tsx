"use client";

import type { HistoryFilterKey } from "../hooks/useHistoryFilters";

export type FilterOptions = {
  statuses: string[];
  clusters: { id: string; nama: string }[];
  projects: { id: string; nama: string }[];
  actors: { id: string; nama: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  berhasil: "Berhasil",
  sebagian_gagal: "Sebagian gagal",
  draft: "Draft",
};

type Props = {
  searchInput: string;
  onSearchChange: (v: string) => void;
  filters: Record<HistoryFilterKey, string>;
  onFilterChange: (key: HistoryFilterKey, value: string) => void;
  onReset: () => void;
  activeCount: number;
  options: FilterOptions | null;
};

const fieldCls =
  "h-10 rounded-full border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300";

function Sel({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldCls} min-w-[150px] max-w-[220px]`}
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

export function HistoryToolbar({
  searchInput,
  onSearchChange,
  filters,
  onFilterChange,
  onReset,
  activeCount,
  options,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative w-full max-w-xl">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari file, tiket, cluster, project, barang..."
          className={`${fieldCls} w-full pl-10 pr-10`}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Hapus pencarian"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Sel
          value={filters.status}
          onChange={(v) => onFilterChange("status", v)}
          placeholder="Semua status"
        >
          {(options?.statuses ?? ["berhasil", "sebagian_gagal", "draft"]).map(
            (s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            )
          )}
        </Sel>

        <Sel
          value={filters.clusterId}
          onChange={(v) => onFilterChange("clusterId", v)}
          placeholder="Semua cluster"
        >
          {(options?.clusters ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </Sel>

        <Sel
          value={filters.projectName}
          onChange={(v) => onFilterChange("projectName", v)}
          placeholder="Semua project"
        >
          {(options?.projects ?? []).map((p) => (
            <option key={p.id} value={p.nama}>
              {p.nama}
            </option>
          ))}
        </Sel>

        <Sel
          value={filters.actorId}
          onChange={(v) => onFilterChange("actorId", v)}
          placeholder="Semua pengunggah"
        >
          {(options?.actors ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </Sel>

        <Sel
          value={filters.jenisInput}
          onChange={(v) => onFilterChange("jenisInput", v)}
          placeholder="Semua jenis input"
        >
          <option value="manual">Input Manual</option>
          <option value="excel">Upload Excel</option>
        </Sel>

        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate || undefined}
          onChange={(e) => onFilterChange("startDate", e.target.value)}
          className={fieldCls}
          aria-label="Dari tanggal"
        />
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(e) => onFilterChange("endDate", e.target.value)}
          className={fieldCls}
          aria-label="Sampai tanggal"
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="h-10 rounded-full border border-orange-300 px-4 text-sm text-orange-600 hover:bg-orange-50"
          >
            Reset filter ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
