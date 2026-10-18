"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import AuthLogo from "@/components/AuthLogo";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAF8F5] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-100 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <AuthLogo />
        <h2 className="text-xl font-bold text-gray-900 mt-2">Lupa Kata Sandi?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Jika akun Anda terdaftar, silakan hubungi admin untuk mendapatkan link reset password.
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#FAF8F5] p-3 text-left border border-slate-100">
          <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Admin dapat membuat link reset password melalui halaman manajemen user.
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-orange-600 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Login
        </Link>
      </div>
    </div>
  );
}