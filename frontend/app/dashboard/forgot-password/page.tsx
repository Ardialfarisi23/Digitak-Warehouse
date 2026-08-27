"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  RotateCcw,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Check,
  Circle,
  AlertTriangle,
  LogOut,
  User,
  Clock,
  Calendar,
} from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State Step 1
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Timer State Step 2
  const [resendTimer, setResendTimer] = useState(59);
  const [canResend, setCanResend] = useState(false);

  // Form State Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Countdown logic for Step 2
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Password Rules Check
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const calculateStrength = () => {
    let score = 0;
    if (hasMinLen) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    if (score <= 2) return { label: "Lemah", color: "bg-rose-500", text: "text-rose-500" };
    if (score <= 4) return { label: "Sedang", color: "bg-amber-500", text: "text-amber-500" };
    return { label: "Kuat", color: "bg-emerald-500", text: "text-emerald-500" };
  };

  const strength = calculateStrength();

  // Handlers
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setEmailError("Masukkan alamat email yang valid.");
      return;
    }
    setEmailError("");
    setStep(2);
  };

  const handleResendEmail = () => {
    if (!canResend) return;
    setResendTimer(59);
    setCanResend(false);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setPasswordError("Harap penuhi semua kriteria keamanan kata sandi.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setPasswordError("");
    setStep(4);
  };

  return (
    <div className={`min-h-screen w-full bg-[#FAF8F5] flex flex-col justify-center items-center p-4 md:p-8 ${plusJakartaSans.className}`}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">

        {/* STEP 1: REQUEST RESET LINK */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <RotateCcw className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">Lupa Kata Sandi?</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Masukkan alamat email Anda yang terdaftar untuk menerima tautan pengaturan ulang kata sandi.
            </p>

            <form onSubmit={handleStep1Submit} className="mt-8 w-full text-left space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
                {emailError && <p className="mt-1 text-xs text-rose-500">{emailError}</p>}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
              >
                Kirim Tautan Atur Ulang
              </button>
            </form>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-500 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Login
            </Link>
          </div>
        )}

        {/* STEP 2: CHECK EMAIL */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold text-slate-900">Periksa email Anda</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Tautan pengaturan ulang kata sandi telah dikirim ke alamat email Anda yang terdaftar.
            </p>

            <div className="mt-6 flex w-full items-center justify-between rounded-xl bg-[#FAF8F5] p-3 border border-slate-100">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-800">{email || "example@company.com"}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Menunggu verifikasi
              </span>
            </div>

            <button
              onClick={handleResendEmail}
              disabled={!canResend}
              className={`mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                canResend
                  ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20"
                  : "bg-orange-500/80 text-white cursor-not-allowed"
              }`}
            >
              Kirim Ulang
            </button>

            <p className="mt-3 text-[11px] text-slate-400">
              {canResend
                ? "Tautan siap dikirim ulang."
                : `Kirim ulang tersedia dalam ${resendTimer} Detik`}
            </p>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#FAF8F5] p-3 text-left border border-slate-100">
              <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-500">
                Selalu pastikan bahwa email tersebut berasal dari domain resmi organisasi Anda sebelum mengeklik tautan apa pun.
              </p>
            </div>

            {/* Tombol Simulasi Lanjut ke Step 3 */}
            <button
              onClick={() => setStep(3)}
              className="mt-4 text-[11px] text-orange-500 underline"
            >
              (Simulasi: Klik Tautan Reset Email)
            </button>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-500 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Login
            </Link>
          </div>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold text-slate-900">Buat Kata Sandi Baru</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Kata sandi baru Anda akan menggantikan kata sandi sebelumnya.
            </p>

            <form onSubmit={handleStep3Submit} className="mt-6 w-full text-left space-y-4">
              <div>
                <div className="relative flex items-center">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata Sandi Baru"
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none z-10"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="relative flex items-center">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi Kata Sandi"
                    className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5]/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                  <span>Kekuatan Kata Sandi</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{
                      width: `${
                        ([hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length / 5) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Rules List */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  {hasMinLen ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                  <span>Min 8 karakter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUpper ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                  <span>Huruf Besar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasLower ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                  <span>Huruf Kecil</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                  <span>Angka</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  {hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                  <span>Karakter khusus</span>
                </div>
              </div>

              {/* Warning Box */}
              <div className="flex items-start gap-2.5 rounded-xl bg-orange-50/60 p-3 text-left border border-orange-100">
                <div className="h-4 w-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">!</div>
                <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                  Rekomendasi Keamanan: Gunakan kata sandi unik yang tidak Anda gunakan di tempat lain untuk menjaga keamanan akun Anda.
                </p>
              </div>

              {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
              >
                Perbarui Kata Sandi
              </button>
            </form>

            <button
              onClick={() => setStep(1)}
              className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Batal
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS SUMMARY */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 mb-4">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              KEAMANAN DIPERBARUI
            </span>

            <h1 className="text-2xl font-bold text-slate-900">
              Kata Sandi Berhasil <br /> Diperbarui
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Akun Anda kini terlindungi menggunakan kata sandi baru Anda. Anda sekarang dapat mengakses ruang kerja Anda dengan aman.
            </p>

            <div className="mt-6 w-full rounded-2xl bg-[#FAF8F5] p-4 border border-slate-100 text-left grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AKUN</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {email || "example@company.com"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROLE</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Warehouse Administrator
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KATA SANDI DIPERBARUI</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Just now
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TANGGAL & WAKTU</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Today, 14:30 PM
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(5)}
              className="mt-6 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition flex items-center justify-center gap-2"
            >
              Lanjut &rarr;
            </button>

            <p className="mt-6 text-[10px] text-slate-400">StokFlow v1.0</p>
          </div>
        )}

        {/* STEP 5: SECURITY CONFIRMATION */}
        {step === 5 && (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold text-slate-900">Konfirmasi Keamanan</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Demi keamanan Anda, semua sesi login sebelumnya telah diakhiri.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 w-full">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#FAF8F5] p-3 text-center border border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Kata Sandi Berhasil Diperbarui
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#FAF8F5] p-3 text-center border border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Semua Perangkat Keluar dari Sistem
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#FAF8F5] p-3 text-center border border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Keamanan Diperbarui
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-left border border-rose-100 w-full">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              <p className="text-[11px] font-medium text-rose-600">
                Jika Anda tidak melakukan tindakan ini, segera hubungi administrator.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
              >
                Lanjutkan untuk Masuk
              </button>
              <a
                href="mailto:admin@company.com"
                className="flex-1 rounded-xl bg-[#FAF8F5] py-3 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-center"
              >
                Hubungi Administrator
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}