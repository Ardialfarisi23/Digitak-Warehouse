"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompactSidebar } from "@/components/CompactSidebar";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { useSidebar } from "@/components/sidebar-context";

function SidebarSkeleton() {
  const { width } = useSidebar();

  return (
    <aside
      className="fixed left-0 top-0 z-[60] flex h-screen flex-col items-center bg-[#F5F3EF] py-6 px-2 select-none border-r border-stone-200/60 shadow-xs animate-pulse transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      <div className="w-12 h-12 bg-stone-300/50 rounded-full mb-8"></div>
      <div className="flex flex-col gap-4 w-full items-center">
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
        <div className="p-3 rounded-2xl w-12 h-12 bg-stone-300/50"></div>
      </div>
    </aside>
  );
}

export default function MasterDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { width } = useSidebar();
  const router = useRouter();

  const userRole = mapRole(user?.role);

  // Route guard (K7): Master Data (termasuk tab Cluster) hanya untuk Admin &
  // Supervisor. Staf Gudang yang membuka URL langsung diarahkan ke beranda staf.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/");
    } else if (userRole === "staff") {
      router.replace("/staff/dashboard");
    }
  }, [isLoading, user, userRole, router]);

  if (isLoading || !user || userRole === "staff") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-slate-500">
        Memuat...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#FAF8F5] overflow-visible">
        {isLoading || !user ? <SidebarSkeleton /> : <CompactSidebar userRole={userRole} />}
        <main className="flex-1 mt-16 p-4 sm:p-6 overflow-y-auto transition-all duration-300 ml-0 md:ml-[var(--sidebar-w)]" style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
