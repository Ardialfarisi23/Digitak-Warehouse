"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Eye,
  EyeOff,
  ShieldCheck,
  LayoutDashboard,
  Box,
  Shield,
  ArrowRight,
} from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ============================================================
// LOGIN VALIDATION
// ============================================================

const loginSchema = z.object({
  email: z
    .string()
    .nonempty("Email wajib diisi")
    .email("Format email tidak valid"),

  password: z
    .string()
    .nonempty("Password wajib diisi")
    .min(6, "Password minimal 6 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ============================================================
// LOGIN PAGE
// ============================================================

export default function Home() {
  const router = useRouter();

  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    const flash = sessionStorage.getItem("flash:session_expired");
    if (flash) {
      setFlashMessage(flash);
      sessionStorage.removeItem("flash:session_expired");
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // ============================================================
  // HANDLE LOGIN
  // ============================================================

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);

    try {

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
        setServerError(
          data?.message ||
            "Login gagal. Periksa kembali email dan password."
        );

        return;
      }

      if (!data?.data?.token || !data?.data?.user) {
        console.error("Invalid login response:", data);

        setServerError(
          "Login berhasil tetapi data sesi tidak lengkap."
        );

        return;
      }

      login(data.data.user, data.data.token);

      const userRole = mapRole(data.data.user?.role);

      const redirectPath =
        userRole === "supervisor"
          ? "/dashboard/supervisor"
          : userRole === "admin"
          ? "/dashboard"
          : userRole === "staff"
          ? "/staff/dashboard"
          : "/dashboard";

      router.replace(redirectPath);

    } catch (error) {
      console.error("Login error:", error);

      setServerError(
        "Tidak dapat terhubung ke server. Pastikan backend sedang berjalan."
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className={`min-h-screen w-full bg-[#FAF8F5] flex flex-col justify-between p-6 lg:p-12 text-slate-800 ${plusJakartaSans.className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-12 lg:flex-row lg:items-center my-auto">

        {/* =====================================================
            LEFT SECTION
        ====================================================== */}

        <div className="flex-1 space-y-8 max-w-xl">

          {/* Logo */}
          <div className="relative h-12 w-52">
            <Image
              src="/logo digitak grdasi.png"
              alt="Digitak Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
              Warehouse
              <br />
              Management System
            </h1>

            <p className="text-sm text-slate-500 leading-relaxed">
              Kelola operasional gudang dengan lebih cerdas,
              lebih cepat, dan lebih efisien.
            </p>
          </div>

          {/* Warehouse Illustration */}
          <div className="relative h-64 w-full">
            <Image
              src="/hero.png"
              alt="Warehouse Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Features */}
          <div className="space-y-3">

            {/* Feature 1 */}
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <LayoutDashboard className="h-5 w-5" />
              </div>

              <span className="font-medium text-sm text-slate-800">
                Pemantauan Gudang secara Real-time
              </span>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <Box className="h-5 w-5" />
              </div>

              <span className="font-medium text-sm text-slate-800">
                Pelacakan Gudang
              </span>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>

              <span className="font-medium text-sm text-slate-800">
                Role-Based Access yang Dilindungi
              </span>
            </div>

          </div>
        </div>

        {/* =====================================================
            RIGHT SECTION - LOGIN CARD
        ====================================================== */}

        <div className="w-full lg:w-[460px] flex flex-col items-center">

          <div className="w-full rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">

            {/* Login Logo */}
            <div className="relative h-12 w-44 mx-auto mb-6">
              <Image
                src="/logo digitak grdasi.png"
                alt="Digitak Logo"
                fill
                className="object-contain"
              />
            </div>

            {/* Login Heading */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Selamat Datang
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Silakan masuk untuk melanjutkan.
              </p>
            </div>

            {/* =================================================
                LOGIN FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-2"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  disabled={isSubmitting}
                  autoComplete="email"
                  placeholder="email@example.com"
                  {...register("email")}
                  className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Gunakan email admin:{" "}
                  <strong>admin@digitakgudang.com</strong>
                </p>

                {errors.email && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-2"
                >
                  Kata Sandi
                </label>

                <div className="relative">

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>

                {errors.password && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember / Forgot Password */}
              <div className="flex items-center justify-between text-xs">

                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />

                  Ingat Saya
                </label>

                <Link
                  href="/forgot-password"
                  className="font-medium text-orange-500 hover:underline"
                >
                  Lupa Kata Sandi?
                </Link>

              </div>

              {/* Flash Message */}
              {flashMessage && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  {flashMessage}
                </div>
              )}

              {/* Server Error */}
              {serverError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {serverError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 focus:outline-none transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  "Sedang masuk..."
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

            </form>

            {/* Security Badge */}
            <div className="mt-6 border-t border-slate-100 pt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />

              <span>
                Dilindungi oleh Role-Based Access Control
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
            <p>
              © Warehouse Management System - PT Metanouva Informatika
            </p>

            <p>
              Version 1.0
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}