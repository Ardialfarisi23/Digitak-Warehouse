"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ChangePasswordPage() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const meetsMinimumRequirement =
    newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);

  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  const isFormValid =
    currentPassword.trim().length >= 6 &&
    meetsMinimumRequirement &&
    newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isFormValid) {
      setError("Pastikan semua field terisi dan password baru memenuhi kriteria keamanan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal memperbarui password.");
      }

      updateUser({ must_change_password: false });
      setSuccess("Password berhasil diubah. Mengalihkan...");

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen w-full bg-[#FAF8F5] ${plusJakartaSans.className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-12 lg:flex-row lg:items-center my-auto">
        <div className="flex-1 space-y-8 max-w-xl">
          <div className="relative h-12 w-52">
            <Image src="/logo digitak grdasi.png" alt="Digitak Logo" width={208} height={48} className="object-contain object-left" />
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="currentPassword" className="block text-xs font-semibold text-slate-700 mb-2">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password sementara"
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata sandi baru"
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Kekuatan Kata Sandi</span>
                    <span className={isPasswordStrong ? "text-emerald-500" : "text-slate-400"}>
                      {isPasswordStrong ? "Kuat" : "Belum memenuhi kriteria"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPasswordStrong ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                      style={{
                        width: `${
                          ([hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length / 5) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Minimal 8 karakter, kombinasi huruf dan angka.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-500">Konfirmasi password tidak cocok.</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Ubah Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
