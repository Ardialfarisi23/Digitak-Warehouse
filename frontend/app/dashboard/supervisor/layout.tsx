"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/");
      } else if (mapRole(user?.role) !== "supervisor") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || mapRole(user?.role) !== "supervisor") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-slate-500">
        Memuat...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
