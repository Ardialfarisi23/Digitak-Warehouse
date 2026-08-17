"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, UserCheck, UserX, X, Clock3, Eye, Pencil } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole, formatRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/* =========================================================
   DATA GUDANG
======================================================== */

const warehouseOptions = [
  {
    id: "1",
    nama: "Gudang Rancamanyar",
  },
  {
    id: "2",
    nama: "Gudang Ciamis",
  },
  {
    id: "3",
    nama: "Gudang Transit",
  },
];

/* =========================================================
   DATA PERSONIL
======================================================== */

const personilOptions = [
  {
    id: "",
    nama: "Tidak dihubungkan",
  },
];

/* =========================================================
   HELPER FOTO
======================================================== */

const getPhotoUrl = (
  foto: string | null | undefined
): string | null => {
  if (!foto) return null;

  if (
    foto.startsWith("http://") ||
    foto.startsWith("https://") ||
    foto.startsWith("data:image/")
  ) {
    return foto;
  }

  if (foto.startsWith("/")) {
    return `${API_BASE}${foto}`;
  }

  return `${API_BASE}/${foto}`;
};

/* =========================================================
   HELPER ROLE
======================================================== */

const getRoleLabel = (role: string) => {
  switch (role) {
    case "admin_general":
      return "Admin General";

    case "supervisor":
      return "Supervisor";

    case "staf_gudang":
      return "Staf Gudang";

    default:
      return formatRole(role);
  }
};

/* =========================================================
   PAGE
======================================================== */

export default function UsersPage() {
  const { user } = useAuth();
  const { get, put, post } = useApi();

  const [users, setUsers] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] =
    useState<any | null>(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  /* =========================================================
     FORM TAMBAH USER
  ========================================================= */

  const [newUser, setNewUser] = useState({
    nama: "",
    email: "",
    no_telepon: "",
    role: "staf_gudang",
    gudang_id: "",
    personil_id: "",
    metode_aktivasi: "email" as "email" | "manual",
    password: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

   const [confirmToggle, setConfirmToggle] = useState<{
     open: boolean;
     record: any | null;
     nextStatus: boolean;
   }>({ open: false, record: null, nextStatus: false });

   const [showEditModal, setShowEditModal] = useState(false);
   const [editForm, setEditForm] = useState<any | null>(null);

  /* =========================================================
     CEK ROLE ADMIN
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    const currentRole = mapRole(user.role);

    if (currentRole !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  /* =========================================================
     AMBIL DATA USER
  ========================================================= */

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await get(
        `${API_BASE}/api/users?page=1&limit=100`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil daftar pengguna."
        );
      }

      const payload = json?.data ?? null;

      let list: any[] = [];

      if (Array.isArray(payload)) {
        list = payload;
      } else if (
        payload &&
        Array.isArray(payload.data)
      ) {
        list = payload.data;
      }

      setUsers(list);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Terjadi kesalahan saat memuat pengguna."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     LOAD AWAL
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    fetchUsers();
  }, [user]);

  /* =========================================================
     SEARCH
  ========================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) {
      return users;
    }

    const query = search.toLowerCase();

    return users.filter((record) =>
      [
        record.nama,
        record.email,
        record.no_telepon,
        getRoleLabel(record.role),
        record.gudang_nama,
        record.is_aktif ? "aktif" : "nonaktif",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  /* =========================================================
     TOGGLE STATUS
  ========================================================= */

  const toggleStatus = async (
    record: any
  ) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await put(
        `${API_BASE}/api/users/${record.user_id ?? record.id}`,
        {
          is_aktif: !record.is_aktif,
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal memperbarui status pengguna."
        );
      }

      setUsers((current) =>
        current.map((item) =>
          (item.user_id ?? item.id) === (record.user_id ?? record.id)
            ? {
                ...item,
                is_aktif:
                  !record.is_aktif,
              }
            : item
        )
      );

      setSelectedUser((current: any) =>
        current &&
        (current.user_id ?? current.id) ===
          (record.user_id ?? record.id)
          ? {
              ...current,
              is_aktif:
                !record.is_aktif,
            }
          : current
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Terjadi kesalahan saat memperbarui status."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================================
     BUKA MODAL TAMBAH
  ========================================================= */

  const handleAdd = () => {
    setError(null);

    setNewUser({
      nama: "",
      email: "",
      no_telepon: "",
      role: "supervisor",
      gudang_id: "",
      personil_id: "",
      metode_aktivasi: "email",
      password: "",
    });

    setShowAddModal(true);
  };

  /* =========================================================
     TAMBAH USER
  ========================================================= */

  const handleCreateUser = async () => {
    if (
      !newUser.nama.trim() ||
      !newUser.email.trim() ||
      !newUser.role ||
      !newUser.gudang_id
    ) {
      setError(
        "Nama lengkap, email, role, dan gudang yang ditugaskan wajib diisi."
      );
      return;
    }

    if (
      newUser.metode_aktivasi === "manual" &&
      !newUser.password.trim()
    ) {
      setError(
        "Password sementara wajib diisi jika menggunakan password manual."
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const selectedWarehouse =
        warehouseOptions.find(
          (warehouse) =>
            warehouse.id === newUser.gudang_id
        );

      const payload: Record<string, any> = {
        nama: newUser.nama.trim(),
        email: newUser.email.trim(),
        no_telepon:
          newUser.no_telepon.trim(),
        role: newUser.role,
        gudang_id: newUser.gudang_id,
        gudang_nama:
          selectedWarehouse?.nama ?? "",
      };

      if (newUser.personil_id) {
        payload.personil_id =
          newUser.personil_id;
      }

      if (
        newUser.metode_aktivasi ===
        "manual"
      ) {
        payload.password =
          newUser.password.trim();
      }

      const response = await post(
        `${API_BASE}/api/users`,
        payload
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal menambahkan pengguna."
        );
      }

      setShowAddModal(false);

      setNewUser({
        nama: "",
        email: "",
        no_telepon: "",
        role: "staf_gudang",
        gudang_id: "",
        personil_id: "",
        metode_aktivasi: "email",
        password: "",
      });

      await fetchUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Terjadi kesalahan saat menambahkan pengguna."
      );
    } finally {
      setIsSaving(false);
    }
   };

   /* =========================================================
      BUKA MODAL EDIT
   ========================================================= */

   const handleOpenEdit = (record: any) => {
     setEditForm({ ...record });
     setShowEditModal(true);
     setError(null);
   };

   /* =========================================================
      SIMPAN PERUBAHAN EDIT
   ========================================================= */

   const handleEditUser = async () => {
     if (!editForm) return;

     if (!editForm.nama?.trim() || !editForm.email?.trim()) {
       setError("Nama lengkap dan email wajib diisi.");
       return;
     }

     setIsSaving(true);
     setError(null);

     try {
       const userId = editForm.user_id ?? editForm.id;

       const response = await put(
         `${API_BASE}/api/users/${userId}`,
         {
           nama: editForm.nama.trim(),
           email: editForm.email.trim(),
           no_telepon:
             editForm.no_telepon?.trim() || null,
           role: editForm.role,
           gudang_id: editForm.gudang_id
             ? String(editForm.gudang_id)
             : undefined,
           is_aktif: editForm.is_aktif,
         }
       );

       const json = await response.json();

       if (!response.ok) {
         throw new Error(
           json?.message ||
             "Gagal memperbarui pengguna."
           );
       }

       const updatedUser = json?.data ?? null;

       setUsers((current) =>
         current.map((item) =>
           (item.user_id ?? item.id) ===
           (editForm.user_id ?? editForm.id)
             ? updatedUser
               ? { ...item, ...updatedUser }
               : item
             : item
         )
       );

       setShowEditModal(false);
       setEditForm(null);
     } catch (caughtError) {
       setError(
         caughtError instanceof Error
           ? caughtError.message
           : "Terjadi kesalahan saat memperbarui pengguna."
       );
     } finally {
       setIsSaving(false);
     }
   };

   /* =========================================================
      RENDER
   ========================================================= */

  return (
    <div className={`${plusJakartaSans.className} flex flex-1 flex-col p-6`}>
      <div className="mx-auto w-full max-w-6xl">
        {/* HEADER */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Manajemen Pengguna
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola akun Admin General, Supervisor,
              dan Staf Gudang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Cari nama, email, role..."
                className="w-full rounded-full border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <Button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600"
            >
              <Plus size={16} />
              Tambah Pengguna
            </Button>
          </div>
        </header>

        {/* TABLE */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Nama
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    No. Telepon
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Role
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Gudang
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 7 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 7 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">
                      Tidak ada pengguna yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((record) => {
                    const photoUrl =
                      getPhotoUrl(record.foto);

                    const userId = record.user_id ?? record.id;

                    return (
                      <tr
                        key={userId}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={record.nama}
                                className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                                {record.nama
                                  ? record.nama
                                      .charAt(0)
                                      .toUpperCase()
                                  : "?"}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {record.nama}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {record.email}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {record.no_telepon || "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {getRoleLabel(record.role)}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {record.gudang_nama || "-"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              record.is_aktif
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {record.is_aktif
                              ? "Aktif"
                              : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                             <button
                               type="button"
                               onClick={() =>
                                 setSelectedUser(record)
                               }
                               title="Detail"
                               className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-orange-600"
                             >
                               <Eye size={14} />
                             </button>

                             <button
                               type="button"
                               onClick={() =>
                                 handleOpenEdit(record)
                               }
                               title="Edit"
                               className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-orange-600"
                             >
                               <Pencil size={14} />
                             </button>

                             <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                setConfirmToggle({
                                  open: true,
                                  record,
                                  nextStatus: !record.is_aktif,
                                })
                              }
                              title={record.is_aktif ? "Nonaktifkan" : "Aktifkan"}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-rose-600 disabled:opacity-40"
                            >
                              {record.is_aktif ? (
                                <UserX size={14} />
                              ) : (
                                <UserCheck size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="mx-6 mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <div className="text-sm text-slate-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)} dari {filteredUsers.length} pengguna
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          MODAL DETAIL PENGGUNA
      ===================================================== */}

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
              style={{
                maxHeight: "calc(100vh - 32px)",
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Detail Pengguna
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Informasi akun pengguna.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedUser(null)
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <div className="flex flex-col items-center">
                  {getPhotoUrl(selectedUser.foto) ? (
                    <img
                      src={getPhotoUrl(selectedUser.foto)!}
                      alt={selectedUser.nama}
                      className="h-24 w-24 rounded-full border-4 border-slate-100 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-3xl font-semibold text-slate-500">
                      {selectedUser.nama
                        ? selectedUser.nama
                            .charAt(0)
                            .toUpperCase()
                        : "?"}
                    </div>
                  )}

                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {selectedUser.nama}
                  </h3>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {getRoleLabel(selectedUser.role)}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Nama
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedUser.nama || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-700">
                      {selectedUser.email || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      No. Telepon
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {selectedUser.no_telepon || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Role
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {getRoleLabel(
                        selectedUser.role
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Gudang yang Ditugaskan
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {selectedUser.gudang_nama || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Status Akun
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedUser.is_aktif
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {selectedUser.is_aktif
                        ? "Aktif"
                        : "Nonaktif"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setSelectedUser(null)
                    }
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL KONFIRMASI TOGGLE STATUS
      ===================================================== */}

      {confirmToggle.open && confirmToggle.record && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => {
            if (!isSaving) {
              setConfirmToggle({ open: false, record: null, nextStatus: false });
            }
          }}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Konfirmasi Perubahan Status
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Apakah Anda yakin ingin mengubah status akun ini?
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
                  {confirmToggle.record.nama?.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {confirmToggle.record.nama}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {getRoleLabel(confirmToggle.record.role)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-slate-600">
                <Clock3 size={14} className="shrink-0 text-amber-500" />

                <span>
                  Status akan diubah menjadi:
                </span>

                <span className="font-semibold text-amber-700">
                  {confirmToggle.nextStatus ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] leading-relaxed text-rose-600">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  setConfirmToggle({ open: false, record: null, nextStatus: false })
                }
                className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (confirmToggle.record) {
                    toggleStatus(confirmToggle.record);
                    setConfirmToggle({ open: false, record: null, nextStatus: false });
                  }
                }}
                className="h-8 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Ya, Ubah Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL TAMBAH ANGGOTA
          PUTIH / COMPACT
      ===================================================== */}

      {showAddModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-3 sm:p-4"
          onClick={() => {
            if (!isSaving) {
              setShowAddModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-[540px] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
            style={{
              maxHeight: "calc(100vh - 24px)",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 pr-4">
                <h2 className="text-base font-semibold leading-tight text-slate-900">
                  Tambah anggota
                </h2>

                <p className="mt-1 text-[11px] leading-[1.4] text-slate-500">
                  Akun ini akan mendapat akses ke sistem gudang
                  sesuai peran yang dipilih.
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  setShowAddModal(false)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* =================================================
                ISI MODAL
            ================================================= */}

            <div className="max-h-[calc(100vh-105px)] overflow-y-auto px-5 py-4">
              {/* =================================================
                  IDENTITAS
              ================================================= */}

              <div>
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Identitas
                </p>

                {/* NAMA */}

                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Nama lengkap
                  </label>

                  <input
                    type="text"
                    value={newUser.nama}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        nama: event.target.value,
                      })
                    }
                    placeholder="Nama sesuai KTP/identitas resmi"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* EMAIL */}

                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        email: event.target.value,
                      })
                    }
                    placeholder="nama@digitakgudang.com"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />

                  <p className="mt-1.5 text-[9px] text-slate-400">
                    Link undangan aktivasi akan dikirim ke email ini.
                  </p>
                </div>

                {/* NO TELEPON */}

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    No. telepon / WhatsApp{" "}
                    <span className="font-normal text-slate-400">
                      (opsional)
                    </span>
                  </label>

                  <input
                    type="tel"
                    value={newUser.no_telepon}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        no_telepon:
                          event.target.value,
                      })
                    }
                    placeholder="08xx-xxxx-xxxx"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* =================================================
                  PERAN DAN AKSES
              ================================================= */}

              <div className="mt-5">
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Peran dan akses
                </p>

                {/* ROLE */}

                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Role
                  </label>

                  <select
                    value={newUser.role}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        role:
                          event.target
                            .value as "admin_general" | "supervisor" | "staf_gudang",
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="admin_general">
                      Admin General
                    </option>

                    <option value="supervisor">
                      Supervisor
                    </option>

                    <option value="staf_gudang">
                      Staf Gudang
                    </option>
                  </select>
                </div>

                {/* GUDANG */}

                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Gudang yang ditugaskan
                  </label>

                  <select
                    value={newUser.gudang_id}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        gudang_id:
                          event.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Pilih gudang
                    </option>

                    {warehouseOptions.map(
                      (warehouse) => (
                        <option
                          key={warehouse.id}
                          value={warehouse.id}
                        >
                          {warehouse.nama}
                        </option>
                      )
                    )}
                  </select>

                  <p className="mt-1.5 text-[9px] text-slate-400">
                    Menentukan lingkup data yang bisa dilihat dan
                    disetujui akun ini.
                  </p>
                </div>

                {/* PERSONIL */}

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Hubungkan ke data personil{" "}
                    <span className="font-normal text-slate-400">
                      (opsional)
                    </span>
                  </label>

                  <select
                    value={newUser.personil_id}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        personil_id:
                          event.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  >
                    {personilOptions.map(
                      (personil) => (
                        <option
                          key={personil.id}
                          value={personil.id}
                        >
                          {personil.nama}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* =================================================
                  KEAMANAN DAN STATUS
              ================================================= */}

              <div className="mt-5">
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Keamanan dan status
                </p>

                {/* RADIO EMAIL */}

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="radio"
                    name="metode_aktivasi"
                    value="email"
                    checked={
                      newUser.metode_aktivasi ===
                      "email"
                    }
                    onChange={() =>
                      setNewUser({
                        ...newUser,
                        metode_aktivasi: "email",
                        password: "",
                      })
                    }
                    className="h-3.5 w-3.5 accent-slate-700"
                  />

                  <span>
                    Kirim link undangan lewat email
                  </span>
                </label>

                {/* RADIO MANUAL */}

                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="radio"
                    name="metode_aktivasi"
                    value="manual"
                    checked={
                      newUser.metode_aktivasi ===
                      "manual"
                    }
                    onChange={() =>
                      setNewUser({
                        ...newUser,
                        metode_aktivasi: "manual",
                      })
                    }
                    className="h-3.5 w-3.5 accent-slate-700"
                  />

                  <span>
                    Buat password sementara secara manual
                  </span>
                </label>

                {/* PASSWORD MANUAL */}

                {newUser.metode_aktivasi ===
                  "manual" && (
                  <div className="mt-2.5">
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(event) =>
                        setNewUser({
                          ...newUser,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Masukkan password sementara"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                )}

                {/* STATUS */}

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-[10px] text-slate-500">
                  <Clock3
                    size={13}
                    className="shrink-0 text-amber-500"
                  />

                  <span>
                    Status setelah disimpan:
                  </span>

                  <span className="font-semibold text-amber-600">
                    Menunggu aktivasi
                  </span>
                </div>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] leading-relaxed text-rose-600">
                  {error}
                </div>
              )}

              {/* =================================================
                  FOOTER
              ================================================= */}

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCreateUser}
                  className="h-8 rounded-lg bg-slate-900 px-3.5 text-[10px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Menyimpan..."
                    : "Tambah anggota"}
                </button>
              </div>
            </div>
          </div>
         </div>
       )}

       {/* =====================================================
           MODAL EDIT PENGGUNA
       ===================================================== */}

       {showEditModal && editForm && (
         <div
           className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-3 sm:p-4"
           onClick={() => {
             if (!isSaving) {
               setShowEditModal(false);
               setEditForm(null);
             }
           }}
         >
           <div
             className="w-full max-w-[540px] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
             style={{
               maxHeight: "calc(100vh - 24px)",
             }}
             onClick={(event) =>
               event.stopPropagation()
             }
           >
             {/* HEADER */}

             <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
               <div className="min-w-0 pr-4">
                 <h2 className="text-base font-semibold leading-tight text-slate-900">
                   Edit Pengguna
                 </h2>

                 <p className="mt-1 text-[11px] leading-[1.4] text-slate-500">
                   Perbarui informasi akun pengguna.
                 </p>
               </div>

               <button
                 type="button"
                 disabled={isSaving}
                 onClick={() => {
                   setShowEditModal(false);
                   setEditForm(null);
                 }}
                 className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                 aria-label="Tutup"
               >
                 <X size={18} />
               </button>
             </div>

             {/* BODY */}

             <div className="max-h-[calc(100vh-105px)] overflow-y-auto px-5 py-4">
               {/* IDENTITAS */}

               <div>
                 <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                   Identitas
                 </p>

                 {/* NAMA */}

                 <div className="mb-3">
                   <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                     Nama lengkap
                   </label>

                   <input
                     type="text"
                     value={editForm.nama ?? ""}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         nama: event.target.value,
                       })
                     }
                     placeholder="Nama sesuai KTP/identitas resmi"
                     className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                   />
                 </div>

                 {/* EMAIL */}

                 <div className="mb-3">
                   <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                     Email
                   </label>

                   <input
                     type="email"
                     value={editForm.email ?? ""}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         email: event.target.value,
                       })
                     }
                     placeholder="nama@digitakgudang.com"
                     className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                   />
                 </div>

                 {/* NO TELEPON */}

                 <div>
                   <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                     No. telepon / WhatsApp{" "}
                     <span className="font-normal text-slate-400">
                       (opsional)
                     </span>
                   </label>

                   <input
                     type="tel"
                     value={editForm.no_telepon ?? ""}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         no_telepon:
                           event.target.value,
                       })
                     }
                     placeholder="08xx-xxxx-xxxx"
                     className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                   />
                 </div>
               </div>

               {/* PERAN DAN AKSES */}

               <div className="mt-5">
                 <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                   Peran dan akses
                 </p>

                 {/* ROLE */}

                 <div className="mb-3">
                   <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                     Role
                   </label>

                   <select
                     value={editForm.role ?? ""}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         role:
                           event.target
                             .value as "admin_general" | "supervisor" | "staf_gudang",
                       })
                     }
                     className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                   >
                     <option value="admin_general">
                       Admin General
                     </option>

                     <option value="supervisor">
                       Supervisor
                     </option>

                     <option value="staf_gudang">
                       Staf Gudang
                     </option>
                   </select>

                   <p className="mt-1.5 text-[9px] text-amber-600">
                     Perubahan role akan berlaku setelah pengguna
                     login kembali.
                   </p>
                 </div>

                 {/* GUDANG */}

                 <div className="mb-3">
                   <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                     Gudang yang ditugaskan
                   </label>

                   <select
                     value={editForm.gudang_id ? String(editForm.gudang_id) : ""}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         gudang_id:
                           event.target.value
                             ? event.target.value
                             : "",
                       })
                     }
                     className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                   >
                     <option value="">
                       Tidak dihubungkan
                     </option>

                     {warehouseOptions.map(
                       (warehouse) => (
                         <option
                           key={warehouse.id}
                           value={warehouse.id}
                         >
                           {warehouse.nama}
                         </option>
                       )
                     )}
                   </select>

                   <p className="mt-1.5 text-[9px] text-slate-400">
                     Menentukan lingkup data yang bisa dilihat dan
                     disetujui akun ini.
                   </p>
                 </div>
               </div>

               {/* STATUS AKUN */}

               <div className="mt-5">
                 <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                   Status akun
                 </p>

                 <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                   <input
                     type="checkbox"
                     checked={Boolean(editForm.is_aktif)}
                     onChange={(event) =>
                       setEditForm({
                         ...editForm,
                         is_aktif:
                           event.target.checked,
                       })
                     }
                     className="h-3.5 w-3.5 accent-slate-700"
                   />

                   <span>
                     Aktifkan akun ini
                   </span>
                 </label>
               </div>

               {/* ERROR */}

               {error && (
                 <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] leading-relaxed text-rose-600">
                   {error}
                 </div>
               )}

               {/* FOOTER */}

               <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-3">
                 <button
                   type="button"
                   disabled={isSaving}
                   onClick={() => {
                     setShowEditModal(false);
                     setEditForm(null);
                   }}
                   className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                 >
                   Batal
                 </button>

                 <button
                   type="button"
                   disabled={isSaving}
                   onClick={handleEditUser}
                   className="h-8 rounded-lg bg-slate-900 px-3.5 text-[10px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                 >
                   {isSaving
                     ? "Menyimpan..."
                     : "Simpan Perubahan"}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }

