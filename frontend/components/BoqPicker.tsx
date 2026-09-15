"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useApi } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface BoqPickerItem {
  boq_id: string;
  boq_number: string;
  kode_tiket: string;
  project_id?: string | number;
  project_name?: string;
}

interface BoqPickerProps {
  projectId?: string | number | null;
  value: string;
  onSelect: (item: BoqPickerItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  tipe?: "inbound" | "outbound";
}

interface ApiBoq {
  boq_id?: number | string;
  id?: string | number;
  boq_number?: string;
  boqNumber?: string;
  ticketNumber?: string;
  kode_tiket?: string;
  projectId?: string | number;
  project?: {
    project_id?: number | string;
    projectId?: string | number;
    nama_project?: string;
    projectName?: string;
    title?: string;
  } | null;
}

function normalize(raw: ApiBoq): BoqPickerItem {
  const boqId = String(raw.boq_id ?? raw.id ?? "");
  const projectId = raw.project?.project_id ?? raw.project?.projectId ?? raw.projectId ?? "";
  const projectName = raw.project?.nama_project ?? raw.project?.projectName ?? "";
  return {
    boq_id: boqId,
    boq_number: raw.boq_number || raw.boqNumber || `BOQ-${boqId}`,
    kode_tiket: raw.kode_tiket || raw.ticketNumber || "",
    project_id: String(projectId),
    project_name: projectName,
  };
}

export default function BoqPicker({
  projectId,
  value,
  onSelect,
  placeholder = "Pilih BOQ / Tiket",
  className,
  disabled,
  tipe,
}: BoqPickerProps) {
  const { get } = useApi();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<BoqPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const params = new URLSearchParams();
    params.set("limit", "20");
    if (debounced) params.set("search", debounced);
    if (projectId) params.set("projectId", String(projectId));
    if (tipe) params.set("tipe", tipe);

    get(`${API_BASE}/api/boqs?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat data BOQ.");
        const json = await res.json();
        const rawList: ApiBoq[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.data)
            ? json.data.data
            : [];
        if (!cancelled) {
          setResults(rawList.map(normalize));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Gagal memuat.");
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, open, get, projectId]);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handlePick(item: BoqPickerItem) {
    onSelect(item);
    setOpen(false);
    setSearch("");
  }

  const displayValue = value
    ? results.find((r) => r.boq_id === value)?.project_name ||
      results.find((r) => r.boq_id === value)?.boq_number ||
      results.find((r) => r.boq_id === value)?.kode_tiket ||
      value
    : "";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            onSelect({
              boq_id: "",
              boq_number: e.target.value,
              kode_tiket: "",
              project_id: projectId ? String(projectId) : "",
              project_name: "",
            });
          }}
          onFocus={() => {
            if (!open) {
              setOpen(true);
              setSearch("");
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 pl-2 pr-8 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            setSearch("");
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-1">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari BOQ / Tiket..."
                className="w-full rounded-md border border-slate-200 pl-7 pr-2 py-1 text-xs outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-2 py-3 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                Memuat...
              </div>
            ) : fetchError ? (
              <div className="px-2 py-3 text-xs text-rose-500">{fetchError}</div>
            ) : results.length === 0 ? (
              <div className="px-2 py-3 text-xs text-slate-400">
                {debounced ? "Tidak ada hasil." : "Pilih project untuk melihat BOQ."}
              </div>
            ) : (
              results.map((it) => (
                <button
                  key={it.boq_id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handlePick(it)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">
                    {it.project_name || it.boq_number}
                  </span>
                  <span className="truncate text-slate-500">
                    {it.kode_tiket ? `Tiket: ${it.kode_tiket}` : "-"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
