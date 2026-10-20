"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useHistoryFilters } from "../hooks/useHistoryFilters";
import { HistoryToolbar, type FilterOptions } from "./HistoryToolbar";
import { HistoryBarangCell, type BarangPreview } from "./HistoryBarangCell";

export type HistoryRowBase = {
  upload_id: string | number;
  filename?: string | null;
  uploaded_at?: string | null;
  uploaded_by_nama?: string | null;
  uploaded_by_role?: string | null;
  total_rows?: number | null;
  success_rows?: number | null;
  failed_rows?: number | null;
  cluster_ids?: unknown[] | null;
  cluster_names?: unknown[] | null;
  project_names?: unknown[] | null;
  kode_tikets?: unknown[] | null;
  jumlah_barang?: number | null;
  barang_preview?: BarangPreview[] | null;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

type Props<T extends HistoryRowBase> = {
  fetchList: (query: string) => Promise<Response>;
  fetchOptions: () => Promise<Response>;
  loadBarang: (logId: string | number) => Promise<unknown>;
  renderStatus: (row: T) => ReactNode;
  renderActions?: (row: T) => ReactNode;
  reloadToken?: number;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID");
}

function joinList(a?: unknown[] | null): string {
  return a && a.length > 0 ? a.map(String).join(", ") : "-";
}

function fmtRole(r?: string | null): string {
  if (!r) return "";
  return r
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const th =
  "sticky top-0 z-10 bg-gray-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";
const td = "px-3 py-3 align-middle text-sm";
const navBtn =
  "h-9 rounded-full border border-gray-200 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50";

export function HistoryTab<T extends HistoryRowBase>({
  fetchList,
  fetchOptions,
  loadBarang,
  renderStatus,
  renderActions,
  reloadToken = 0,
}: Props<T>) {
  const f = useHistoryFilters();
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: f.pageSize,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [retry, setRetry] = useState(0);

  const fn = useRef({ fetchList, fetchOptions });
  fn.current = { fetchList, fetchOptions };
  const reqId = useRef(0);

  const qs = useMemo(
    () =>
      new URLSearchParams(
        Object.entries(f.params).map(([k, v]) => [k, String(v)])
      ).toString(),
    [f.params]
  );

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fn.current.fetchList(qs);
        const json = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) throw new Error(json?.message || "Gagal memuat riwayat.");
        const list = Array.isArray(json?.data?.data) ? json.data.data : [];
        const m = json?.data?.meta ?? {};
        setRows(list as T[]);
        setMeta({
          total: Number(m.total) || 0,
          page: Number(m.page) || 1,
          limit: Number(m.limit) || f.pageSize,
          totalPages: Number(m.totalPages) || 1,
        });
      } catch (e) {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : "Gagal memuat riwayat.");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
  }, [qs, reloadToken, retry, f.pageSize]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fn.current.fetchOptions();
        const json = await res.json();
        if (alive && res.ok && json?.data) setOptions(json.data as FilterOptions);
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !error && meta.totalPages >= 1 && f.page > meta.totalPages) {
      f.setPage(meta.totalPages);
    }
  }, [loading, error, meta.totalPages, f]);

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const colSpan = 14;

  const stableLoadBarang = useCallback(
    (id: string | number) => loadBarang(id),
    [loadBarang]
  );

  return (
    <div>
      <HistoryToolbar
        searchInput={f.searchInput}
        onSearchChange={f.setSearchInput}
        filters={f.filters}
        onFilterChange={f.setFilter}
        onReset={f.reset}
        activeCount={f.activeCount}
        options={options}
      />

      <div
        className={`max-h-[60vh] overflow-auto rounded-xl border border-gray-100 ${
          loading && rows.length > 0 ? "opacity-60" : ""
        }`}
      >
        <table className="w-full min-w-[1400px] border-collapse">
          <thead>
            <tr>
              <th className={th}>No</th>
              <th className={th}>Waktu Upload</th>
              <th className={th}>Nama File</th>
              <th className={th}>Diunggah Oleh</th>
              <th className={th}>Cluster ID</th>
              <th className={th}>Cluster Name</th>
              <th className={th}>Project Name</th>
              <th className={th}>Kode Tiket</th>
              <th className={th}>Barang</th>
              <th className={`${th} text-center`}>Total</th>
              <th className={`${th} text-center`}>Berhasil</th>
              <th className={`${th} text-center`}>Gagal</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-gray-500">
                  Memuat data...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-sm">
                  <p className="mb-2 text-red-600">{error}</p>
                  <button
                    type="button"
                    className={navBtn}
                    onClick={() => setRetry((r) => r + 1)}
                  >
                    Coba lagi
                  </button>
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-gray-500">
                  <p className="mb-2">
                    {f.activeCount > 0
                      ? "Tidak ada data yang cocok dengan filter."
                      : "Belum ada riwayat upload."}
                  </p>
                  {f.activeCount > 0 && (
                    <button type="button" className={navBtn} onClick={f.reset}>
                      Reset filter
                    </button>
                  )}
                </td>
              </tr>
            )}

            {!error &&
              rows.map((row, i) => (
                <tr key={String(row.upload_id)} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className={`${td} text-gray-500`}>{(meta.page - 1) * meta.limit + i + 1}</td>
                  <td className={`${td} whitespace-nowrap text-gray-500`}>{fmtDate(row.uploaded_at)}</td>
                  <td className={`${td} font-medium`}>{row.filename || "-"}</td>
                  <td className={td}>
                    <div className="font-medium">{row.uploaded_by_nama || "-"}</div>
                    <div className="text-xs text-gray-500">{fmtRole(row.uploaded_by_role)}</div>
                  </td>
                  <td className={`${td} max-w-[140px] truncate text-xs`} title={joinList(row.cluster_ids)}>
                    {joinList(row.cluster_ids)}
                  </td>
                  <td className={`${td} max-w-[180px] truncate text-xs`} title={joinList(row.cluster_names)}>
                    {joinList(row.cluster_names)}
                  </td>
                  <td className={`${td} max-w-[200px] truncate text-xs`} title={joinList(row.project_names)}>
                    {joinList(row.project_names)}
                  </td>
                  <td className={`${td} max-w-[140px] truncate text-xs`} title={joinList(row.kode_tikets)}>
                    {joinList(row.kode_tikets)}
                  </td>
                  <td className={td}>
                    <HistoryBarangCell
                      logId={row.upload_id}
                      jumlahBarang={Number(row.jumlah_barang) || 0}
                      preview={row.barang_preview}
                      loadBarang={stableLoadBarang}
                    />
                  </td>
                  <td className={`${td} text-center`}>{row.total_rows ?? 0}</td>
                  <td className={`${td} text-center text-green-600`}>{row.success_rows ?? 0}</td>
                  <td className={`${td} text-center text-red-500`}>{row.failed_rows ?? 0}</td>
                  <td className={td}>{renderStatus(row)}</td>
                  <td className={td}>{renderActions ? renderActions(row) : null}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-4">
        <p className="text-sm text-gray-500">
          Menampilkan {from}–{to} dari {meta.total} entri
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={navBtn}
            disabled={meta.page <= 1 || loading}
            onClick={() => f.setPage(meta.page - 1)}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            type="button"
            className={navBtn}
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => f.setPage(meta.page + 1)}
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}
