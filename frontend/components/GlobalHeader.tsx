"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatRole } from "@/lib/navigation";
import { useSidebar } from "@/components/sidebar-context";
import {
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  LayoutDashboard,
  ExternalLink,
  ChevronDown,
  Menu,
} from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { UserAvatar } from "@/components/UserAvatar";

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width, isMobile, setMobileOpen } = useSidebar();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
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

  async function handleNotificationClick(notif: { id: number; link: string | null; type?: string | null; title?: string | null; message?: string | null }) {
    await markAsRead(notif.id);
    setNotifOpen(false);

    if (!notif.link) {
      return;
    }

    const link = notif.link;

    if (notif.type === "approval" || /outbound/i.test(notif.title || "") || /outbound/i.test(notif.message || "")) {
      const match = link.match(/\/staff\/outbound\/(\d+)/);
      if (match && match[1]) {
        router.push(`/dashboard/supervisor/approval/outbound/${match[1]}`);
        return;
      }
    }

    router.push(link);
  }

  if (!user) return null;

  const displayName = user.name || user.email || "User";

  return (
    <>
      <header
        style={{ left: `${width}px` }}
        className="fixed top-0 right-0 z-40 flex h-16 items-center justify-between bg-[#FAF8F5] px-4 lg:px-6 transition-all duration-300"
      >
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
        )}
        <div className={`flex items-center gap-2 ${isMobile ? "" : "ml-auto"}`}>
          {/* Notification */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen(!notifOpen);
                setSettingsOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Bell size={20} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/40 z-50">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-900">Notifikasi</h3>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronDown size={14} className="rotate-180" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">
                      Tidak ada notifikasi.
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-50">
                      {notifications.map((notif) => (
                        <li
                          key={notif.id}
                          className={`px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                            !notif.is_read ? "bg-orange-50/40" : ""
                          }`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p
                                className={`text-xs font-semibold ${
                                  !notif.is_read ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {notif.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">{timeAgo(notif.created_at)}</p>
                            </div>
                            {!notif.is_read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-stone-100 px-4 py-2.5">
                  <Link
                    href="/notifications"
                    className="block w-full text-center text-xs font-semibold text-orange-500 hover:text-orange-600"
                    onClick={() => setNotifOpen(false)}
                  >
                    Lihat Semua Notifikasi
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button
            type="button"
            onClick={() => {
              setHelpOpen(true);
              setNotifOpen(false);
              setSettingsOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <HelpCircle size={20} strokeWidth={2} />
          </button>

          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                setNotifOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Settings size={20} strokeWidth={2} />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/40 z-50 py-1.5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  <LayoutDashboard size={14} className="text-slate-400" />
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  <Settings size={14} className="text-slate-400" />
                  Pengaturan
                </Link>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-1 h-6 w-[1px] bg-stone-200" />

          {/* User Profile */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => {
                setAccountOpen(!accountOpen);
                setNotifOpen(false);
                setSettingsOpen(false);
              }}
              className="flex items-center gap-3 pl-1"
            >
              <div className="hidden text-right md:block">
                <p className="text-sm font-bold text-slate-900 leading-tight">{displayName}</p>
                <p className="text-[11px] text-slate-500 font-medium capitalize">{formatRole(user.role)}</p>
              </div>
              <UserAvatar src={user.avatar_url} name={displayName} size={36} />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/40 z-50 py-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setAccountOpen(false)}
                >
                  <LayoutDashboard size={14} className="text-slate-400" />
                  Profil Saya
                </Link>

                <div className="my-1.5 border-t border-stone-100" />

                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Bantuan & Informasi</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <ExternalLink size={16} className="rotate-45" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 border border-stone-100">
                <div className="relative h-10 w-10 shrink-0">
                   <Image
                     src="/logo digitak .png"
                     alt="Digitak Logo"
                     fill
                     className="object-contain"
                   />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Digitak Studio</p>
                  <p className="text-xs text-slate-500">Warehouse Management System</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  Sistem manajemen gudang internal PT Metanouva Informatika untuk
                  mengelola operasional, inventaris, dan logistik secara terintegrasi.
                </p>
                <p>
                  Jika mengalami kendala atau membutuhkan bantuan lebih lanjut, silakan
                  hubungi tim support kami.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3">
                <ExternalLink size={14} className="text-slate-400 shrink-0" />
                <a
                  href="https://digitak.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                >
                  Kunjungi Website Digitak Studio
                </a>
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                &copy; {new Date().getFullYear()} PT Metanouva Informatika. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
