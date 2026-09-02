"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useApi } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface BarangPickerItem {
  id: string;
  kode_perangkat: string;
  nama_barang: string;
  satuan_default_id?: string | number | null;
  satuan_default_kode?: string | null;
}

interface BarangPickerProps {
  value: string;
  onSelect: (item: BarangPickerItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface ApiBarang {
  barang_id?: string | number;
  id?: string | number;
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default_id?: string | number | null;
  satuan_default?: { kode_satuan?: string } | null;
}

function normalize(raw: ApiBarang): BarangPickerItem {
  const id = String(raw.barang_id ?? raw.id ?? "");
  return {
    id,
    kode_perangkat: raw.kode_perangkat ?? "",
    nama_barang: raw.nama_barang ?? "",
    satuan_default_id: raw.satuan_default_id ?? null,
    satuan_default_kode: raw.satuan_default?.kode_satuan ?? null,
  };
}

export default function BarangPicker({
  value,
  onSelect,
  placeholder = "Kode perangkat",
  className,
  disabled,
}: BarangPickerProps) {
  const { get } = useApi();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<BarangPickerItem[]>([]);
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

    get(`${API_BASE}/api/items?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat master barang.");
        const json = await res.json();
        const rawList: ApiBarang[] = Array.isArray(json?.data)
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
  }, [debounced, open, get]);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
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

  function handlePick(item: BarangPickerItem) {
    onSelect(item);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onSelect({
              id: "",
              kode_perangkat: e.target.value,
              nama_barang: "",
              satuan_default_id: null,
              satuan_default_kode: null,
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
                placeholder="Cari barang..."
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
                {debounced ? "Tidak ada hasil." : "Ketik untuk mencari..."}
              </div>
            ) : (
              results.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handlePick(it)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">
                    {it.kode_perangkat}
                  </span>
                  <span className="truncate text-slate-500">
                    {it.nama_barang}
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