"use client";

import { CompactSidebar } from "@/components/CompactSidebar";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { useSidebar } from "@/components/sidebar-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { ConfirmModal } from "@/components/ConfirmModal";

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

  const { showDeactivatedModal, handleReturnToLogin } = useNotifications();

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
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-slate-500">
        Memuat...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAFAF8] overflow-visible">
        <CompactSidebar userRole={userRole} />
        <main className="min-h-screen p-4 sm:p-6 transition-all duration-300 ml-0 md:ml-[var(--sidebar-w)]" style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}>
          <div className="h-4 sm:h-6" />
          {children}
          <ConfirmModal
            open={showDeactivatedModal}
            onConfirm={handleReturnToLogin}
            onClose={() => {}}
            title="Akun Anda Dinonaktifkan"
            description="Akun Anda telah dinonaktifkan oleh admin. Anda akan diarahkan ke halaman login."
            confirmText="Kembali ke Login"
            cancelText=""
            dismissProof
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}