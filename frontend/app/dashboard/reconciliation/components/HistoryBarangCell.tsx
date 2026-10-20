"use client";

import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [state, setState] = useState<"idle" | "loading" | "error" | "ready">(
    "idle"
  );
  const [items, setItems] = useState<BarangItem[]>([]);
  const cache = useRef<BarangItem[] | null>(null);

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

  if (!jumlahBarang || jumlahBarang <= 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const names = (preview ?? [])
    .slice(0, 2)
    .map((p) => str(p.nama_barang ?? p.nama ?? p.namaBarang));
  const extra = jumlahBarang - 2;

  return (
    <div className="flex max-w-[220px] flex-col gap-1">
      {names.map((n, i) => (
        <span key={i} title={n} className="truncate text-sm">
          {n}
        </span>
      ))}
      {extra > 0 && (
        <Popover onOpenChange={(open) => open && void fetchItems()}>
          <PopoverTrigger asChild>
            <button type="button" className="w-fit">
              <Badge variant="secondary" className="cursor-pointer">
                +{extra} lainnya
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
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
                      {it.kode} • {it.qty} {it.satuan}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
