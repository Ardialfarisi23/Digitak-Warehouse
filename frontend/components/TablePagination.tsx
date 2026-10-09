"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push(-1);
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push(-2);
    pages.push(totalPages);
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-3 py-3 md:flex-row md:justify-between md:px-6">
      <p className="text-xs md:text-sm text-slate-500 text-center md:text-left">
        Menampilkan {from}-{to} dari {total} data
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={prevDisabled}
          onClick={() => !prevDisabled && onPageChange(page - 1)}
          className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border text-sm ${prevDisabled ? "opacity-50 cursor-not-allowed" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p) =>
          p > 0 ? (
            <button
              key={p}
              type="button"
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border text-sm ${p === page ? "bg-orange-500 text-white border-orange-500" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ) : (
            <span key={p} className="inline-flex min-h-10 min-w-10 items-center justify-center text-slate-400">
              …
            </span>
          )
        )}

        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={nextDisabled}
          onClick={() => !nextDisabled && onPageChange(page + 1)}
          className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg border text-sm ${nextDisabled ? "opacity-50 cursor-not-allowed" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}