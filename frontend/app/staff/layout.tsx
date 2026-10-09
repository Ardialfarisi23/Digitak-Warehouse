"use client";

import { CompactSidebar } from "@/components/CompactSidebar";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { useSidebar } from "@/components/sidebar-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
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

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, refresh, showDeactivatedModal, handleReturnToLogin } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/");
      } else if (userRole !== "staff") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, userRole, router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
          <div className="flex items-center justify-end px-6 pt-4">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  refresh();
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                aria-label="Notifikasi"
              >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                  <div className="fixed inset-x-3 top-16 md:absolute md:right-0 md:top-full md:mt-2 w-auto md:w-80 md:max-w-80 rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifikasi</p>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await markAllAsRead();
                          }}
                          className="text-[11px] font-semibold text-[#E8632C] hover:text-[#D9591F]"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAllNotifications();
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Bersihkan semua notifikasi"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-slate-400">Tidak ada notifikasi.</p>
                    ) : (
                      <ul className="divide-y divide-stone-50">
                        {notifications.map((notif) => (
                          <li
                            key={notif.id}
                            className={`group px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                              !notif.is_read ? "bg-orange-50/40" : ""
                            }`}
                            onClick={async () => {
                              if (!notif.is_read) {
                                await markAsRead(notif.id);
                              }
                              if (notif.link) {
                                router.push(notif.link);
                              }
                              setNotifOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{notif.message}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {new Date(notif.created_at).toLocaleString("id-ID")}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await deleteNotification(notif.id);
                                }}
                                className="rounded-lg p-1 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                                title="Hapus notifikasi"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-stone-100 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/notifications");
                      }}
                      className="block w-full text-center text-xs font-semibold text-[#E8632C] hover:text-[#D9591F]"
                    >
                      Lihat Semua Notifikasi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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