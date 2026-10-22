"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";

// Halaman rekonsiliasi + input laporan mitra hanya boleh dibuka Admin.
// Supervisor dialihkan ke halaman rekonsiliasi miliknya (read-only),
// staf gudang dialihkan ke dashboard staf.
export default function ReconciliationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    const role = mapRole(user.role);

    if (role === "admin") return;

    if (role === "supervisor") {
      router.replace("/dashboard/supervisor/reconciliation");
    } else {
      router.replace("/staff/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || mapRole(user?.role) !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-slate-500">
        Memuat...
      </div>
    );
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
