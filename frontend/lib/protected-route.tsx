"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/");
      } else if (
        user?.must_change_password &&
        pathname !== "/dashboard/change-password"
      ) {
        router.replace("/dashboard/change-password");
      } else {
        setShouldRender(true);
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user?.must_change_password]);

  if (isLoading || !shouldRender) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <svg
            width="120"
            height="80"
            viewBox="0 0 120 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto sm:w-[150px] sm:h-[100px]"
          >
            <style>{`
              @keyframes wheelSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes boxBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
              }
              @keyframes forkliftMove {
                0% { transform: translateX(-8px); }
                50% { transform: translateX(8px); }
                100% { transform: translateX(-8px); }
              }
              .wheel {
                transform-origin: center;
                transform-box: fill-box;
                animation: wheelSpin 0.8s linear infinite;
              }
              .forklift {
                animation: forkliftMove 2s ease-in-out infinite;
              }
              .box-load {
                animation: boxBounce 1s ease-in-out infinite;
              }
              .pulse-dot {
                animation: dotPulse 1.4s ease-in-out infinite both;
              }
              .pulse-dot:nth-child(2) { animation-delay: 0.2s; }
              .pulse-dot:nth-child(3) { animation-delay: 0.4s; }
              @keyframes dotPulse {
                0%, 80%, 100% { opacity: 0.3; }
                40% { opacity: 1; }
              }
            `}</style>

            <g className="forklift">
              <rect x="25" y="35" width="35" height="25" rx="3" fill="#E8632C" />
              <rect x="30" y="40" width="12" height="10" rx="1" fill="#FAF8F5" opacity="0.3" />
              <rect x="55" y="28" width="8" height="32" rx="1" fill="#4A4A4A" />
              <rect x="52" y="25" width="14" height="8" rx="1" fill="#4A4A4A" />
              <rect x="63" y="30" width="3" height="20" rx="1" fill="#E8632C" />
              <circle cx="35" cy="65" r="6" fill="#2D2D2D" />
              <circle cx="35" cy="65" r="3" fill="#6B6B6B" className="wheel" />
              <circle cx="50" cy="65" r="6" fill="#2D2D2D" />
              <circle cx="50" cy="65" r="3" fill="#6B6B6B" className="wheel" />
            </g>

            <g className="box-load">
              <rect x="68" y="42" width="20" height="18" rx="2" fill="#D4A373" stroke="#B8895A" strokeWidth="1" />
              <line x1="68" y1="51" x2="88" y2="51" stroke="#B8895A" strokeWidth="1" />
              <line x1="78" y1="42" x2="78" y2="60" stroke="#B8895A" strokeWidth="1" />
            </g>

            <rect x="20" y="68" width="80" height="3" rx="1.5" fill="#E0DCD5" />
          </svg>

          <p className="mt-6 text-base sm:text-lg font-medium text-slate-700 tracking-wide">
            Menyiapkan gudang Anda
            <span className="inline-flex ml-1">
              <span className="pulse-dot text-[#E8632C]">.</span>
              <span className="pulse-dot text-[#E8632C]">.</span>
              <span className="pulse-dot text-[#E8632C]">.</span>
            </span>
          </p>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Memuat data inventaris
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
