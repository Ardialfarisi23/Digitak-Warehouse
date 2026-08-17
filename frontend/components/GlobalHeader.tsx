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

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const dummyNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Surat Jalan Baru",
    message: "SJ-2024001 menunggu konfirmasi penerimaan.",
    time: "10 menit lalu",
    read: false,
  },
  {
    id: "2",
    title: "Stok Menipis",
    message: "Barang dengan kode SW-024 hampir habis.",
    time: "1 jam lalu",
    read: false,
  },
  {
    id: "3",
    title: "Approval BOQ",
    message: "BOQ Proyek RW 05 menunggu persetujuan Anda.",
    time: "3 jam lalu",
    read: true,
  },
];

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width, isMobile, setMobileOpen } = useSidebar();

  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const unreadCount = dummyNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!user) return null;

  const displayName = user.name || user.email || "User";
  const initials = displayName.charAt(0).toUpperCase();

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
                  {dummyNotifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">
                      Tidak ada notifikasi.
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-50">
                      {dummyNotifications.map((notif) => (
                        <li
                          key={notif.id}
                          className={`px-4 py-3 transition-colors hover:bg-slate-50 ${
                            !notif.read ? "bg-orange-50/40" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p
                                className={`text-xs font-semibold ${
                                  !notif.read ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {notif.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">{notif.time}</p>
                            </div>
                            {!notif.read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-stone-100 px-4 py-2.5">
                  <button
                    type="button"
                    className="w-full text-center text-xs font-semibold text-orange-500 hover:text-orange-600"
                  >
                    Lihat Semua Notifikasi
                  </button>
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
                <div className="px-3 py-2 border-b border-stone-100 mb-1">
                  <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{formatRole(user.role)}</p>
                </div>

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

                <div className="my-1.5 border-t border-stone-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-1 h-6 w-[1px] bg-stone-200" />

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-1">
            <div className="hidden text-right md:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">{displayName}</p>
               <p className="text-[11px] text-slate-500 font-medium capitalize">{formatRole(user.role)}</p>
            </div>
            <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm bg-orange-100 flex items-center justify-center font-bold text-orange-700 text-sm">
              {initials}
            </div>
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
                     src="/logo-digitak.png"
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
                  href="https://digitak.studio"
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
