"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] flex flex-col justify-center items-center p-4 md:p-8 pt-14">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Lupa Kata Sandi?</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
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
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-500 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Login
        </Link>
      </div>
    </div>
  );
}