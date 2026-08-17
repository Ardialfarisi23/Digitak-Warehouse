"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Link href="/dashboard/supervisor/approval/inbound" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Approval Inbound</p>
              <p className="mt-2 text-sm text-slate-500">Review barang masuk, cek serial, kondisi, dan catat kelebihan jika ada.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-900">Buka antrian inbound</span>
            <Button variant="outline" size="sm">
              Buka
            </Button>
          </div>
        </Link>

        <Link href="/dashboard/supervisor/approval/outbound" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Approval Outbound</p>
              <p className="mt-2 text-sm text-slate-500">Setujui permintaan keluar untuk reservasi stok dan lanjutkan distribusi.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-900">Buka antrian outbound</span>
            <Button variant="outline" size="sm">
              Buka
            </Button>
          </div>
        </Link>

        <Link href="/dashboard/supervisor/approval/distribution" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Konfirmasi Distribusi</p>
              <p className="mt-2 text-sm text-slate-500">Setelah stok dialihkan, tandai pengiriman outbound sebagai didistribusikan.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-900">Buka laporan distribusi</span>
            <Button variant="outline" size="sm">
              Buka
            </Button>
          </div>
        </Link>
      </div>
    </div>
  );
}
