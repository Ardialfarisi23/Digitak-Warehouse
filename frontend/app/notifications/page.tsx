"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BellOff, RefreshCw } from "lucide-react";

import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { CompactSidebar } from "@/components/CompactSidebar";
import { useSidebar } from "@/components/sidebar-context";
import { useNotifications } from "@/hooks/use-notifications";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const FILTER_TABS = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum dibaca" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  info: { label: "Info", bg: "bg-sky-50", text: "text-sky-700" },
  approval: { label: "Persetujuan", bg: "bg-amber-50", text: "text-amber-700" },
  warning: { label: "Peringatan", bg: "bg-orange-50", text: "text-orange-700" },
  success: { label: "Sukses", bg: "bg-emerald-50", text: "text-emerald-700" },
  error: { label: "Error", bg: "bg-rose-50", text: "text-rose-700" },
};

interface PaginatedNotifications {
  items: Array<{
    id: number;
    user_id: number | null;
    role: string | null;
    type: string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
  }>;
  total: number;
  totalPages: number;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useSidebar();
  const { unreadCount, markAsRead, markAllAsRead, refresh, showDeactivatedModal, handleReturnToLogin } = useNotifications();
  const { get } = useApi();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [paginatedNotifications, setPaginatedNotifications] = useState<PaginatedNotifications>({
    items: [],
    total: 0,
    totalPages: 1,
  });

  const userRole = mapRole(user?.role);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        if (filter === "unread") qs.set("is_read", "false");

        const res = await get(`${API_BASE}/api/notifications?${qs.toString()}`);

        if (res.status === 401) {
          const err = await res.json().catch(() => null);
          if (err?.code === "ACCOUNT_DEACTIVATED") {
            return;
          }
          router.replace("/");
          return;
        }

        if (res.ok) {
          const json = await res.json();
          if (json?.success) {
            setPaginatedNotifications({
              items: json.data?.items || [],
              total: json.data?.total || 0,
              totalPages: json.data?.totalPages || 1,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch paginated notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, limit, filter, router, get]);

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
    setPaginatedNotifications((prev) => ({
      ...prev,
      items: prev.items.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
    }));
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      await refresh();
      setPaginatedNotifications((prev) => ({
        ...prev,
        items: prev.items.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      }));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: { id: number; link: string | null }) => {
    await handleMarkAsRead(notif.id);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const isEmpty = !loading && paginatedNotifications.items.length === 0;

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] overflow-x-hidden">
      <CompactSidebar userRole={userRole} />
      <main
        className="flex-1 mt-16 p-4 sm:p-6 overflow-y-auto transition-all duration-300 ml-0 md:ml-[var(--sidebar-w)]"
        style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Semua Notifikasi</h1>
              <p className="mt-1 text-xs text-slate-500">
                {unreadCount > 0
                  ? `Anda memiliki ${unreadCount} notifikasi belum dibaca.`
                  : "Semua notifikasi sudah dibaca."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                <span className="ml-1.5">Refresh</span>
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
                >
                  <BellOff size={14} />
                  <span className="ml-1.5">Tandai semua sudah dibaca</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                  filter === tab.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-stone-200 hover:bg-slate-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-xs overflow-hidden">
            {isEmpty ? (
              <div className="px-6 py-12 text-center">
                <p className="text-xs text-slate-400">Tidak ada notifikasi.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-50">
                {paginatedNotifications.items.map((notif) => {
                  const typeStyle = TYPE_BADGE[notif.type] || TYPE_BADGE.info;

                  return (
                    <li
                      key={notif.id}
                      className={cn(
                        "px-6 py-4 transition-colors hover:bg-slate-50 cursor-pointer",
                        !notif.is_read && "bg-orange-50/30"
                      )}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={cn(
                                "text-sm font-semibold truncate",
                                !notif.is_read ? "text-slate-900" : "text-slate-700"
                              )}
                            >
                              {notif.title}
                            </p>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0",
                                typeStyle.bg,
                                typeStyle.text
                              )}
                            >
                              {typeStyle.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {paginatedNotifications.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">
                Halaman {page} dari {paginatedNotifications.totalPages} • {paginatedNotifications.total} notifikasi
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= paginatedNotifications.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
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
    </div>
  );
}

export default function NotificationsPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <p className="mt-4 text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <NotificationsPageContent />
    </ProtectedRoute>
  );
}
