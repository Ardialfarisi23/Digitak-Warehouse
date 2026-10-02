"use client";

import { useAuth } from "@/lib/auth-context";
import { ShieldAlert } from "lucide-react";
import Image from "next/image";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  const { updateUser } = useAuth();

  return (
      <div className="min-h-screen w-full bg-[#FAF8F5]">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-12 lg:flex-row lg:items-center my-auto">
        <div className="flex-1 space-y-8 max-w-xl">
          <div className="relative h-12 w-52">
            <Image src="/logo-digitak-gradasi.png" alt="Digitak Logo" width={208} height={48} className="object-contain object-left" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
              Buat Kata Sandi Baru
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              demi keamanan akun Anda, silakan buat kata sandi baru sebelum melanjutkan.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-[460px] flex flex-col items-center">
          <div className="w-full rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Aktivasi Akun
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Anda menggunakan password sementara. Ubah sekarang.
              </p>
            </div>

            <ChangePasswordForm
              mode="forced"
              onSuccess={() => updateUser({ must_change_password: false })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
