"use client";

import { CompactSidebar } from "@/components/CompactSidebar";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { useSidebar } from "@/components/sidebar-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SidebarSkeleton() {
  const { width } = useSidebar();

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen flex-col items-center bg-[#F5F3EF] py-6 px-2 select-none border-r border-stone-200/60 shadow-xs animate-pulse transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      <div className="w-12 h-12 bg-stone-300/50 rounded-full mb-8"></div>
      <div className="flex flex-col gap-4 w-full items-center">
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
      </div>
    </aside>
  );
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { width } = useSidebar();
  const router = useRouter();

  const userRole = mapRole(user?.role);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/");
      } else if (userRole !== "staff") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, userRole, router]);

  if (isLoading || !user || userRole !== "staff") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-slate-500">
        Memuat...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAFAF8] overflow-x-hidden">
        <CompactSidebar userRole={userRole} />
        <main className="mt-16 min-h-screen transition-all duration-300" style={{ marginLeft: `${width}px` }}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
