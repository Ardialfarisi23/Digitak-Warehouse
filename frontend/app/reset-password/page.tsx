"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import AuthLogo from "@/components/AuthLogo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-100 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Tidak Sah</h2>
          <p className="text-sm text-gray-500">Token reset kata sandi tidak ditemukan atau telah kadaluarsa.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-orange-600 hover:underline text-sm">
            Minta tautan reset baru
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Gagal memperbarui kata sandi.");
        return;
      }

      setSuccess("Kata sandi berhasil diperbarui! Mengalihkan ke login...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Terjadi masalah jaringan.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <AuthLogo />
          <p className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mt-2">
            PT METANOUVA INFORMATIKA
          </p>
          <h2 className="text-xl font-bold text-gray-900">Buat Kata Sandi Baru</h2>
          <p className="text-sm text-gray-500 mt-1">
            Untuk akun: <span className="font-semibold text-gray-700">{email || "User Digitak"}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition duration-200 text-sm shadow-sm disabled:opacity-50"
          >
            {loading ? "Simpan..." : "Simpan Kata Sandi Baru"}
          </button>

          <div className="text-center pt-2">
            <Link className="text-xs text-gray-500 hover:text-orange-600 transition" href="/">
              Batal & Kembali ke Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
