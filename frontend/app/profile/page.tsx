"use client";

import { useEffect, useState, useRef } from "react";
import { Camera, Upload, X, CheckCircle2, AlertCircle, Trash2, Mail, Phone, Briefcase, Building2, CalendarDays } from "lucide-react";

import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/lib/auth-context";
import { mapRole, formatRole } from "@/lib/navigation";
import { CompactSidebar } from "@/components/CompactSidebar";
import { useSidebar } from "@/components/sidebar-context";
import { useApi } from "@/lib/api";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { PhotoCropModal } from "@/components/profile/PhotoCropModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ProfileDetails {
  no_hp?: string | null;
  posisi?: string | null;
  gudang_nama?: string | null;
  created_at?: string | null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function ProfilePageContent() {
  const { user, updateUser } = useAuth();
  const { width } = useSidebar();
  const { get, request } = useApi();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>({});
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cropImageSrcRef = useRef<string | null>(null);
  const userRole = mapRole(user?.role);
  const displayName = user?.name || user?.email || "User";

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await get(`${API_BASE}/api/profile`);
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            updateUser({
              name: json.data.nama || json.data.name,
              avatar_url: json.data.foto || json.data.avatar_url,
            });
            setProfileDetails({
              no_hp: json.data.no_hp || json.data.no_telepon || null,
              posisi: json.data.posisi || null,
              gudang_nama: json.data.gudang_nama || json.data.gudang?.nama_gudang || null,
              created_at: json.data.created_at || null,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [get, updateUser]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current && previewUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (cropImageSrcRef.current && cropImageSrcRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrcRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      if (previewUrlRef.current && previewUrlRef.current !== previewUrl && previewUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = previewUrl;
    }
  }, [previewUrl]);

  useEffect(() => {
    if (cropImageSrc && cropImageSrc.startsWith("blob:")) {
      if (cropImageSrcRef.current && cropImageSrcRef.current !== cropImageSrc && cropImageSrcRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrcRef.current);
      }
      cropImageSrcRef.current = cropImageSrc;
    }
  }, [cropImageSrc]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Tipe file tidak didukung. Gunakan jpg, jpeg, png, atau webp.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const file = new File([blob], "cropped-avatar.jpg", { type: "image/jpeg" });
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(blob));
    setCropModalOpen(false);
    setCropImageSrc(null);
  };

  const handleCropCancel = () => {
    if (cropImageSrc && cropImageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const res = await request(`${API_BASE}/api/users/me/avatar`, {
        method: "PATCH",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal upload foto profil.");
      }

      const newAvatarUrl = json?.data?.foto || null;
      updateUser({ avatar_url: newAvatarUrl });
      
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showToast("Foto profil berhasil diperbarui.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal upload foto profil.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    if (cropImageSrc && cropImageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setCropModalOpen(false);
    setCropImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await request(`${API_BASE}/api/users/me/avatar`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menghapus foto profil.");
      }

      updateUser({ avatar_url: null });
      setShowDeleteConfirm(false);
      showToast("Foto profil berhasil dihapus.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus foto profil.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="flex min-h-screen bg-[#FAF8F5] overflow-x-hidden">
      <CompactSidebar userRole={userRole} />
      <main
        className="flex-1 mt-16 p-6 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: `${width}px` }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
            <p className="mt-1 text-xs text-slate-500">Kelola informasi akun dan foto profil Anda.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kolom kiri: Avatar + Aksi */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-slate-100 bg-white shadow-xs p-6">
                <div className="flex flex-col items-center text-center">
                  <UserAvatar src={previewUrl || user?.avatar_url} name={displayName} size={120} />

                  <div className="mt-4">
                    <p className="text-base font-bold text-slate-900">{displayName}</p>
                    <p className="mt-1 text-xs text-slate-500 capitalize">{user?.role ? formatRole(user.role) : ""}</p>
                  </div>

                  <div className="mt-5 w-full space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!previewUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Camera size={14} />
                        <span className="ml-1.5">Ganti Foto</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex-1 rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
                        >
                          <X size={14} />
                          <span className="ml-1.5">Batal</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUpload}
                          disabled={isSaving}
                          className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                        >
                          {isSaving ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              <span className="ml-1.5">Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span className="ml-1.5">Simpan</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {user?.avatar_url && !previewUrl && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isSaving || isDeleting}
                        className="w-full rounded-xl"
                      >
                        <Trash2 size={14} />
                        <span className="ml-1.5">Hapus Foto</span>
                      </Button>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {selectedFile && !error && (
                    <p className="mt-3 text-center text-[11px] text-slate-400">
                      File terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Kolom kanan: Informasi Akun */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-100 bg-white shadow-xs p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-5">Informasi Akun</h2>
                <div className="divide-y divide-slate-50">
                  <DetailRow icon={Mail} label="Email" value={user?.email ?? "-"} />
                  <DetailRow icon={Phone} label="No. HP" value={profileDetails.no_hp ?? "-"} />
                  <DetailRow
                    icon={Briefcase}
                    label="Posisi / Jabatan"
                    value={profileDetails.posisi ?? (user?.role ? formatRole(user.role) : "-")}
                  />
                  <DetailRow icon={Building2} label="Gudang" value={profileDetails.gudang_nama ?? "-"} />
                  <DetailRow
                    icon={CalendarDays}
                    label="Tanggal Bergabung"
                    value={formatDate(profileDetails.created_at)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Hapus Foto Profil</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Apakah Anda yakin ingin menghapus foto profil? Avatar akan kembali ke inisial nama Anda dan tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={isDeleting}
                className="rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoCropModal
        open={cropModalOpen}
        imageSrc={cropImageSrc || ""}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {/* Toast notification */}
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
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-900 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
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
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
