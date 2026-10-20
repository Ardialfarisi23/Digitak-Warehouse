"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Raw = Record<string, unknown>;

export type BarangPreview = Raw;

type BarangItem = { nama: string; kode: string; qty: string; satuan: string };

type Props = {
  logId: string | number;
  jumlahBarang: number;
  preview?: BarangPreview[] | null;
  loadBarang: (logId: string | number) => Promise<unknown>;
};

function str(v: unknown, fallback = "-"): string {
  return v === null || v === undefined || v === "" ? fallback : String(v);
}

function toArray(raw: unknown): Raw[] {
  if (Array.isArray(raw)) return raw as Raw[];
  const r = raw as Raw | null | undefined;
  if (r && Array.isArray(r.data)) return r.data as Raw[];
  const inner = r?.data as Raw | undefined;
  if (inner && Array.isArray(inner.data)) return inner.data as Raw[];
  return [];
}

function normalize(raw: unknown): BarangItem[] {
  return toArray(raw).map((x) => ({
    nama: str(x.nama_barang ?? x.nama ?? x.namaBarang),
    kode: str(x.kode_barang ?? x.kode ?? x.kodeBarang),
    qty: str(x.qty ?? x.jumlah ?? x.quantity),
    satuan: str(x.satuan ?? x.unit, ""),
  }));
}

export function HistoryBarangCell({
  logId,
  jumlahBarang,
  preview,
  loadBarang,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error" | "ready">(
    "idle"
  );
  const [items, setItems] = useState<BarangItem[]>([]);
  const cache = useRef<BarangItem[] | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  const fetchItems = useCallback(async () => {
    if (cache.current) {
      setItems(cache.current);
      setState("ready");
      return;
    }
    setState("loading");
    try {
      const res = await loadBarang(logId);
      const list = normalize(res);
      cache.current = list;
      setItems(list);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [loadBarang, logId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!jumlahBarang || jumlahBarang <= 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const names = (preview ?? [])
    .slice(0, 2)
    .map((p) => str(p.nama_barang ?? p.nama ?? p.namaBarang));
  const extra = jumlahBarang - 2;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void fetchItems();
  };

  return (
    <div ref={box} className="relative flex max-w-[220px] flex-col gap-1">
      {names.map((n, i) => (
        <span key={i} title={n} className="truncate text-sm">
          {n}
        </span>
      ))}
      {extra > 0 && (
        <button type="button" onClick={toggle} className="w-fit">
          <Badge variant="subtle" className="cursor-pointer">
            +{extra} lainnya
          </Badge>
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white p-3 text-left shadow-lg">
          <p className="mb-2 text-sm font-medium">
            Daftar barang ({jumlahBarang})
          </p>
          {state === "loading" && (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          )}
          {state === "error" && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-destructive">Gagal memuat barang.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void fetchItems()}
              >
                Coba lagi
              </Button>
            </div>
          )}
          {state === "ready" && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada data.</p>
          )}
          {state === "ready" && items.length > 0 && (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <li key={i} className="text-sm">
                  <div className="font-medium">{it.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.kode} â€¢ {it.qty} {it.satuan}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
