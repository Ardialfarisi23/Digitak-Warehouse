"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, XCircle } from "lucide-react";

export default function SupervisorApprovalIndexPage() {
  return (
    <div className="min-h-screen px-8 py-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Approval Supervisor</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Pilih Alur Approval</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Kelola antrian penerimaan inbound dan permintaan outbound dari satu halaman.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/dashboard/supervisor/approval/inbound"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-100">
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Approval Inbound</p>
              <p className="mt-2 text-sm text-slate-500">Review barang masuk, cek serial, kondisi, dan catat kelebihan jika ada.</p>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 transition-all duration-150 group-hover:border-sky-300 group-hover:bg-sky-100"
            >
              <span>Buka Antrian Inbound</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </Link>

        <Link
          href="/dashboard/supervisor/delivery"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700 transition-colors group-hover:bg-orange-100">
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Approval Outbound</p>
              <p className="mt-2 text-sm text-slate-500">Setujui permintaan keluar untuk reservasi stok dan lanjutkan distribusi.</p>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-900 transition-all duration-150 group-hover:border-orange-300 group-hover:bg-orange-100"
            >
              <span>Buka Antrian Outbound</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </Link>
        <Link
          href="/dashboard/supervisor/approval/rejected"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 transition-colors group-hover:bg-rose-100">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Riwayat Penolakan</p>
              <p className="mt-2 text-sm text-slate-500">
                Lihat daftar surat jalan inbound &amp; outbound yang pernah ditolak beserta alasan penolakannya.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 transition-all duration-150 group-hover:border-rose-300 group-hover:bg-rose-100"
            >
              <span>Buka Riwayat Penolakan</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}
