"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

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

// ============================================================
// LOGIN VALIDATION
// ============================================================

const loginSchema = z.object({
  email: z
    .string()
    .nonempty("Email wajib diisi")
    .email("Format email tidak valid"),

   password: z.string().nonempty("Password wajib diisi"),
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

       login(data.data.user, data.data.token, data.data.refreshToken);

      if (data.data.user.must_change_password) {
        router.replace("/dashboard/change-password");
        return;
      }

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
      className={`min-h-dvh w-full bg-[#FAF8F5] flex flex-col justify-center p-4 md:p-6 lg:h-dvh lg:justify-start lg:overflow-y-auto lg:p-8 text-slate-800 [@media(max-height:500px)]:p-2`}
    >
      <div className="mx-auto flex w-full max-w-[1040px] flex-col justify-center gap-8 md:items-center lg:grid lg:min-h-full lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:justify-center lg:gap-14 lg:px-8">

        {/* =====================================================
            LEFT SECTION
        ====================================================== */}

        <div className="hidden w-full max-w-xl md:mx-auto md:flex md:w-full md:max-w-[560px] md:flex-col md:gap-4 lg:flex lg:h-full lg:min-h-0 lg:w-full lg:max-w-[560px] lg:flex-col lg:justify-center lg:gap-[clamp(0.5rem,2dvh,1.25rem)]">

          {/* Logo */}
          <div className="relative h-12 w-52 md:max-lg:mx-auto lg:h-10">
            <Image
              src="/logo-digitak-gradasi.png"
              alt="Digitak Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Heading */}
          <div className="space-y-3 md:max-lg:text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-[clamp(1.5rem,4.5dvh,2.75rem)]">
              Warehouse
              <br />
              Management System
            </h1>

            <p className="hidden text-sm text-slate-500 leading-snug lg:block lg:line-clamp-2">
              Kelola operasional gudang dengan lebih cerdas,
              lebih cepat, dan lebih efisien.
            </p>
          </div>

          {/* Warehouse Illustration */}
          <div className="relative hidden w-full md:mx-auto md:block md:aspect-[16/9] md:max-h-[22dvh] lg:block lg:aspect-auto lg:flex-1 lg:min-h-[96px] lg:max-h-[30dvh] [@media(max-height:480px)]:hidden">
            <Image
              src="/hero.png"
              alt="Warehouse Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Features */}
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-2 [@media(max-height:420px)]:hidden">

            {/* Feature 1 */}
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-100 lg:gap-2 lg:p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <LayoutDashboard className="h-4 w-4" />
              </div>

              <span className="font-medium text-xs text-slate-800 lg:line-clamp-2">
                Pemantauan Gudang secara Real-time
              </span>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-100 lg:gap-2 lg:p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                <Box className="h-4 w-4" />
              </div>

              <span className="font-medium text-xs text-slate-800 lg:line-clamp-2">
                Pelacakan Gudang
              </span>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-100 lg:gap-2 lg:p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-4 w-4" />
              </div>

              <span className="font-medium text-xs text-slate-800 lg:line-clamp-2">
                Role-Based Access yang Dilindungi
              </span>
            </div>

          </div>
        </div>

        {/* =====================================================
            RIGHT SECTION - LOGIN CARD
        ====================================================== */}

        <div className="flex w-full flex-col items-center md:max-w-[360px] lg:h-full lg:max-w-[360px] lg:mx-auto lg:justify-center">

          <div className="w-full rounded-3xl bg-white p-4 md:p-[clamp(0.875rem,2.2dvh,1.5rem)] shadow-none md:shadow-xl md:shadow-slate-200/50 border border-slate-100 lg:p-[clamp(0.875rem,2.2dvh,1.5rem)]">

            {/* Login Logo */}
            <div className="relative h-10 w-36 md:h-8 md:w-28 mx-auto mb-4 md:mb-[clamp(0.5rem,2dvh,1.25rem)] lg:h-8 lg:w-28 lg:mb-[clamp(0.5rem,2dvh,1.25rem)]">
              <Image
                src="/logo-digitak-gradasi.png"
                alt="Digitak Logo"
                fill
                className="object-contain"
              />
            </div>

            {/* Login Heading */}
            <div className="text-center mb-4 md:mb-[clamp(0.5rem,2dvh,1rem)] lg:mb-[clamp(0.5rem,2dvh,1rem)]">
              <h2 className="text-xl md:text-[clamp(1.125rem,2.6dvh,1.5rem)] lg:text-[clamp(1.125rem,2.6dvh,1.5rem)] font-bold text-slate-900">
                Selamat Datang
              </h2>

              <p className="mt-1 text-xs text-slate-400 [@media(max-height:500px)]:hidden">
                Silakan masuk untuk melanjutkan.
              </p>
            </div>

            {/* =================================================
                LOGIN FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3 md:space-y-[clamp(0.375rem,1.2dvh,0.75rem)] lg:space-y-[clamp(0.375rem,1.2dvh,0.75rem)] [@media(max-height:500px)]:space-y-2"
            >

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs md:text-[13px] lg:text-[13px] font-medium text-slate-700 mb-1.5 md:mb-2 lg:mb-2"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  disabled={isSubmitting}
                  autoComplete="email"
                  placeholder="email@example.com"
                  {...register("email")}
                  className="w-full rounded-lg border border-slate-200 bg-[#FAF8F5]/60 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition md:h-10 md:px-3 md:py-0 md:text-sm lg:h-10 lg:px-3 lg:py-0 lg:text-sm"
                />

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
                  className="block text-xs md:text-[13px] lg:text-[13px] font-medium text-slate-700 mb-1.5 md:mb-2 lg:mb-2"
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
                    className="w-full rounded-lg border border-slate-200 bg-[#FAF8F5]/60 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition md:h-10 md:px-3 md:py-0 md:text-sm lg:h-10 lg:px-3 lg:py-0 lg:text-sm pr-11"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    ) : (
                      <Eye className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    )}
                  </button>

                </div>

                {errors.password && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.password.message}
                  </p>
                )}
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
                className="w-full h-11 md:h-10 md:text-sm lg:h-10 lg:text-sm rounded-xl bg-orange-500 text-base font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 focus:outline-none transition flex items-center justify-center gap-2"
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

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-slate-500 hover:text-orange-600 transition underline"
              >
                Lupa Kata Sandi?
              </Link>
            </div>

            {/* Security Badge */}
              <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-center gap-1.5 text-[10px] whitespace-nowrap text-slate-400 md:mt-3 md:gap-2 md:pt-2 md:text-xs lg:mt-3 lg:pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />

              <span>
                Dilindungi oleh Role-Based Access Control
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-2 w-full text-center text-slate-400 space-y-1 md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-1.5 md:space-y-0 md:text-[11px] lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-1.5 lg:text-[11px]">
            <p className="whitespace-nowrap">
              © Warehouse Management System - PT Metanouva Informatika
            </p>

            <p className="hidden md:block whitespace-nowrap">
              Version 1.0
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
