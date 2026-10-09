"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLogo from "@/components/AuthLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetLink, setResetLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setResetLink("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmitted(true);
        setResetLink(data.data?.resetUrl || "");
      } else {
        setErrorMessage(data.message || "Gagal memproses permintaan.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Koneksi gagal. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAF8F5] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <AuthLogo />
          <h2 className="text-xl font-bold text-gray-900 mt-2">Lupa Kata Sandi?</h2>
          <p className="text-sm text-gray-500 mt-1">
            Masukkan email terdaftar Anda untuk menerima instruksi pemulihan kata sandi.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-center">
            {errorMessage}
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center leading-relaxed">
              ✓ Akun terverifikasi untuk:<br />
              <strong className="text-sm font-semibold">{email}</strong>
            </div>

            {resetLink && (
              <Link
                href={resetLink}
                className="block w-full py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition duration-200 text-sm shadow-sm text-center"
              >
                Lanjut Buat Kata Sandi Baru →
              </Link>
            )}

            <div className="text-center pt-2">
              <Link className="text-xs text-gray-500 hover:text-orange-600 transition" href="/">
                Batal & Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Terdaftar</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition duration-200 text-sm shadow-sm disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Kirim Tautan Reset"}
            </button>

            <div className="text-center pt-2">
              <Link className="text-xs text-gray-500 hover:text-orange-600 transition" href="/">
                ← Kembali ke Halaman Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
