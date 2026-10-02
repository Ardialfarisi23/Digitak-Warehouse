"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

interface ChangePasswordFormProps {
  mode: "forced" | "voluntary";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChangePasswordForm({
  mode,
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const { request } = useApi();
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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await request(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Gagal memperbarui password.");
      }

      onSuccess?.();

      setSuccess("Password berhasil diubah.");

      if (mode === "forced") {
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const updatedUser = { ...parsedUser, must_change_password: false };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            updateUser({ must_change_password: false });
          }
        } catch {}

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            placeholder="Masukkan password saat ini"
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

      <div className="flex items-center justify-end gap-2">
        {mode === "voluntary" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="rounded-xl bg-orange-500 py-3.5 px-6 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Menyimpan..." : mode === "forced" ? "Ubah Password" : "Simpan Password"}
        </button>
      </div>
    </form>
  );
}
