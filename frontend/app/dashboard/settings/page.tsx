"use client";

import { useEffect, useState } from "react";
import { Bell, Monitor, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";

import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const NOTIFICATION_CATEGORIES = [
  { key: "BOQ", label: "BOQ", description: "Notifikasi terkait Bill of Quantities" },
  { key: "SURAT_JALAN", label: "Surat Jalan", description: "Notifikasi terkait Surat Jalan inbound/outbound" },
  { key: "USER", label: "User", description: "Notifikasi terkait management user" },
  { key: "ITEM", label: "Item / Barang", description: "Notifikasi terkait item dan barang" },
  { key: "PROJECT", label: "Project", description: "Notifikasi terkait project" },
  { key: "GUDANG", label: "Gudang", description: "Notifikasi terkait gudang" },
  { key: "ZONA", label: "Zona", description: "Notifikasi terkait zona gudang" },
];

type Tab = "notifications" | "display";

function SettingsPageContent() {
  const { get, request } = useApi();

  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [language, setLanguage] = useState("id");
  const [isSavingDisplay, setIsSavingDisplay] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      setIsLoadingPrefs(true);
      try {
        const res = await get(`${API_BASE}/api/settings/notifications`);
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json?.data)) {
            const map: Record<string, boolean> = {};
            for (const pref of json.data) {
              map[pref.category] = pref.enabled;
            }
            setNotificationPrefs(map);
          }
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    loadNotificationPreferences();
  }, [get]);

  const handleToggleNotification = async (category: string, enabled: boolean) => {
    setNotificationPrefs((prev) => ({ ...prev, [category]: enabled }));
    setIsSavingPrefs(true);

    try {
      const res = await request(`${API_BASE}/api/settings/notifications`, {
        method: "PUT",
        body: JSON.stringify({
          notifications: [{ category, enabled }],
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal memperbarui preferensi notifikasi.");
      }

      showToast("Preferensi notifikasi berhasil diperbarui.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui preferensi notifikasi.";
      showToast(message, "error");
      setNotificationPrefs((prev) => ({ ...prev, [category]: !enabled }));
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSaveDisplay = async () => {
    setIsSavingDisplay(true);
    try {
      const res = await request(`${API_BASE}/api/settings`, {
        method: "PUT",
        body: JSON.stringify({
          dark_mode: darkModeEnabled,
          language,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal memperbarui pengaturan tampilan.");
      }

      showToast("Pengaturan tampilan berhasil diperbarui.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui pengaturan tampilan.";
      showToast(message, "error");
    } finally {
      setIsSavingDisplay(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "notifications", label: "Notifikasi", icon: Bell },
    { key: "display", label: "Tampilan", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-xs text-slate-500">Kelola preferensi notifikasi, tampilan, dan keamanan akun Anda.</p>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-xs">
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                  isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === "notifications" && (
            <div>
              <div className="mb-5">
                <h2 className="text-sm font-bold text-slate-900">Preferensi Notifikasi</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih jenis notifikasi yang ingin Anda terima. Preferensi ini akan disimpan per akun.
                </p>
              </div>

              {isLoadingPrefs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {NOTIFICATION_CATEGORIES.map((cat) => {
                    const enabled = notificationPrefs[cat.key] ?? true;
                    return (
                      <div key={cat.key} className="flex items-center justify-between py-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{cat.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{cat.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleNotification(cat.key, !enabled)}
                          disabled={isSavingPrefs}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            enabled ? "bg-slate-900" : "bg-slate-200"
                          } ${isSavingPrefs ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                              enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "display" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">Tampilan</h2>
                <p className="text-xs text-slate-500">Sesuaikan tampilan halaman sesuai preferensi Anda.</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Mode Gelap</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Aktifkan tampilan gelap untuk seluruh aplikasi. Fitur ini sedang dalam pengembangan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDarkModeEnabled((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      darkModeEnabled ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        darkModeEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Bahasa</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Pilih bahasa yang ingin ditampilkan di aplikasi.
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="appearance-none rounded-xl border border-stone-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none focus:border-slate-400"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en" disabled>
                        English (Segera Hadir)
                      </option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute inset-y-0 right-2 my-auto text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveDisplay}
                  disabled={isSavingDisplay}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isSavingDisplay ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span className="ml-1.5">Menyimpan...</span>
                    </>
                  ) : (
                    "Simpan Pengaturan"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800"
              : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              toast.type === "success" ? "bg-emerald-100" : "bg-rose-100",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : (
              <AlertCircle size={20} className="text-rose-600" />
            )}
          </div>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 shrink-0 rounded-full p-1 transition-colors"
          >
            <AlertCircle size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
