"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, UserCheck, UserX, X, Clock3, Eye, Pencil, ShieldAlert, AlertCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole, formatRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import TablePagination from "@/components/TablePagination";
import { MobileCardList, type MobileCardField, type MobileCardItem } from "@/components/MobileCardList";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

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

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
    metode_aktivasi: "manual" as "email" | "manual",
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

  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

   /* =========================================================
      CEK ROLE ADMIN
   ========================================================= */

   useEffect(() => {
     if (!user) return;

     const currentRole = mapRole(user.role);

     if (currentRole !== "admin") {
       setToast({ message: "Anda tidak memiliki akses ke halaman ini.", type: "error" });

       setTimeout(() => {
         if (currentRole === "supervisor") {
           window.location.href = "/dashboard/supervisor";
         } else if (currentRole === "staff") {
           window.location.href = "/staff/dashboard";
         } else {
           window.location.href = "/dashboard";
         }
       }, 800);
     }
   }, [user]);

  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ id: string; nama: string; tipe?: string }>>([]);

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

  useEffect(() => {
    let cancelled = false;

    get(`${API_BASE}/api/warehouses?limit=1000&is_aktif=true&sortBy=nama_gudang&sortOrder=asc`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.data) ? json.data.data : Array.isArray(json) ? json : [];
        setWarehouseOptions(list.map((w: any) => ({ id: String(w.gudang_id), nama: w.nama_gudang + (w.tipe === "dadakan" ? " (Transit)" : ""), tipe: w.tipe })));
      })
      .catch(() => {
        if (!cancelled) setWarehouseOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user, get]);

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

  const mobileItems = useMemo<MobileCardItem[]>(() => {
    return paginatedUsers.map((record) => {
      const userId = record.user_id ?? record.id;
      const isSelf = !!user?.id && String(userId) === String(user.id);
      const roleLabel = getRoleLabel(record.role);
      const statusLabel = record.is_aktif ? "Aktif" : "Nonaktif";
      const statusTone = record.is_aktif
        ? "bg-emerald-50 text-emerald-600"
        : "bg-slate-100 text-slate-500";

      const actions = (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            aria-label="Lihat detail pengguna"
            onClick={() => setSelectedUser(record)}
            className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-orange-600"
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            aria-label="Edit pengguna"
            onClick={() => handleOpenEdit(record)}
            className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-orange-600"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            disabled={isSaving || isSelf}
            aria-label={record.is_aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
            onClick={() =>
              setConfirmToggle({
                open: true,
                record,
                nextStatus: !record.is_aktif,
              })
            }
            className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {record.is_aktif ? <UserX size={16} /> : <UserCheck size={16} />}
          </button>
        </div>
      );

      const fields: MobileCardField[] = [
        { label: "Email", value: <span className="break-all text-slate-600">{record.email || "-"}</span> },
        { label: "No. Telepon", value: record.no_telepon || "-" },
        { label: "Role", value: roleLabel },
        { label: "Gudang", value: record.gudangNama || "-" },
      ];

      return {
        key: String(userId),
        title: (
          <span className="flex items-center gap-2">
            {getPhotoUrl(record.foto) ? (
              <img
                src={getPhotoUrl(record.foto)!}
                alt={record.nama}
                className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {record?.nama
                  ? record?.nama.charAt(0).toUpperCase()
                  : "?"}
              </span>
            )}
            <span className="truncate">{record?.nama}</span>
          </span>
        ),
        badge: (
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone}`}>
              {statusLabel}
            </span>
          </div>
        ),
        fields,
        actions,
      };
    });
  }, [paginatedUsers, user, isSaving]);

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
      metode_aktivasi: "manual",
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
      !newUser.role
    ) {
      setError(
        "Nama lengkap, email, dan role wajib diisi."
      );
      return;
    }

    if (
      newUser.role === "staf_gudang" &&
      !newUser.gudang_id
    ) {
      setError(
        "Gudang yang ditugaskan wajib diisi untuk role Staf Gudang."
      );
      return;
    }

    if (
      newUser.metode_aktivasi ===
      "manual" &&
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

      if (newUser.metode_aktivasi === "manual") {
        setTempPassword(newUser.password.trim());
        setShowTempPasswordModal(true);
        setShowAddModal(false);
      } else {
        setShowAddModal(false);
      }

      setToast({ message: "Pengguna berhasil ditambahkan.", type: "success" });

      setNewUser({
        nama: "",
        email: "",
        no_telepon: "",
        role: "staf_gudang",
        gudang_id: "",
        metode_aktivasi: "manual",
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

      const role = editForm.role;

      if (role === "staf_gudang") {
        if (!editForm.gudang_id) {
          setError("Gudang yang ditugaskan wajib diisi untuk role Staf Gudang.");
          return;
        }
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
    <div className="flex flex-1 flex-col">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">
              Manajemen Pengguna
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola akun Admin General, Supervisor,
              dan Staf Gudang.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            <div className="relative w-full sm:w-72">
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
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 min-h-10"
            >
              <Plus size={16} />
              Tambah Pengguna
            </Button>
          </div>
        </header>

        {/* TABLE */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* MOBILE CARD LIST */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                        <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                Tidak ada pengguna yang cocok.
              </div>
            ) : (
              <MobileCardList items={mobileItems} />
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
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
                        {Array.from({ length: 8 }).map((_, colIndex) => (
                          <td key={colIndex} className="px-6 py-4">
                            <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-400">
                        Tidak ada pengguna yang cocok.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((record, index) => {
                    const photoUrl =
                      getPhotoUrl(record.foto);

                    const userId = record.user_id ?? record.id;

                    const isSelf: boolean =
                      !!user?.id &&
                      String(userId) ===
                        String(user.id);
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                    return (
                      <tr
                        key={userId}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-center text-xs text-slate-500">{rowNumber}</td>
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

                        <td className="max-w-[220px] px-6 py-4 text-slate-500">
                          <span className="block truncate" title={record.email}>{record.email}</span>
                        </td>

                        <td className="max-w-[140px] px-6 py-4 text-slate-500">
                          <span className="block truncate" title={record.no_telepon || "-"}>{record.no_telepon || "-"}</span>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {getRoleLabel(record.role)}
                        </td>

<td className="max-w-[180px] px-6 py-4 text-slate-500">
                          <span className="block truncate" title={record.gudangNama || "-"}>{record.gudangNama || "-"}</span>
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
                               disabled={isSaving || isSelf}
                               onClick={() =>
                                 setConfirmToggle({
                                   open: true,
                                   record,
                                   nextStatus: !record.is_aktif,
                                 })
                               }
                               title={record.is_aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
                               className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
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
        </div>
      </div>
    </div>

      {error && (
        <div className="mx-6 mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {filteredUsers.length > 0 && (
        <TablePagination
          page={currentPage}
          pageSize={itemsPerPage}
          total={filteredUsers.length}
          onPageChange={setCurrentPage}
        />
      )}

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
              className="relative flex w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
              style={{
                maxHeight: "calc(100dvh - 2rem)",
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
            className="w-[calc(100vw-1.5rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl"
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
            className="w-[calc(100vw-1.5rem)] max-w-[540px] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
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

              <div className="max-h-[calc(100dvh-105px)] overflow-y-auto px-5 py-4">
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
                    onChange={(event) => {
                      const newRole = event.target.value as "admin_general" | "supervisor" | "staf_gudang";
                      setNewUser((prev) => ({
                        ...prev,
                        role: newRole,
                        gudang_id:
                          newRole === "supervisor" ? "" : prev.gudang_id,
                      }));
                    }}
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
                    disabled={newUser.role === "supervisor"}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {newUser.role === "supervisor" ? (
                    <p className="mt-1.5 text-[9px] text-slate-400">
                      Supervisor dapat mengakses semua gudang, tidak perlu ditugaskan ke gudang tertentu.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[9px] text-slate-400">
                      Menentukan lingkup data yang bisa dilihat dan
                      disetujui akun ini.
                    </p>
                  )}
                </div>
              </div>

               {/* =================================================
                   KEAMANAN DAN STATUS
               ================================================= */}

               <div className="mt-5">
                 <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                   Keamanan dan status
                 </p>

                 {/* TODO: Opsi "Kirim link undangan lewat email" disembunyikan sementara — infrastruktur email (nodemailer/SMTP + activation token) belum diimplementasikan. Aktifkan kembali setelah backend siap. */}

                 <div className="flex items-center gap-2 text-[11px] text-slate-700">
                   <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">1</span>
                   <span>Metode aktivasi: Password sementara (manual)</span>
                 </div>

                 {/* PASSWORD MANUAL */}

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
              className="w-[calc(100vw-1.5rem)] max-w-[540px] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
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

            <div className="max-h-[calc(100dvh-105px)] overflow-y-auto px-5 py-4">
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

        {showTempPasswordModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-3 sm:p-4"
            onClick={() => setShowTempPasswordModal(false)}
          >
            <div
              className="w-[calc(100vw-1.5rem)] max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                <div className="min-w-0 pr-4">
                  <h2 className="text-base font-semibold leading-tight text-slate-900">
                    Password Sementara
                  </h2>
                  <p className="mt-1 text-[11px] leading-[1.4] text-slate-500">
                    Bagikan password ini kepada pengguna. Password ini hanya ditampilkan sekali.
                  </p>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-[10px] text-amber-700">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Simpan dan bagikan password ini secara aman. Setelah ditutup, password tidak akan ditampilkan kembali.</span>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-700">
                    Password Sementara
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tempPassword}
                      className="h-9 flex-1 rounded-lg border border-slate-200 bg-[#FAF8F5] px-3 text-xs text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Salin
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-0 flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowTempPasswordModal(false)}
                  className="h-8 rounded-lg bg-slate-900 px-3.5 text-[10px] font-semibold text-white transition hover:bg-slate-800"
                >
                  Saya sudah menyimpan password
                </button>
              </div>
            </div>
          </div>
         )}
 
         {toast && (
         <div
           className={`fixed right-4 top-4 sm:right-6 sm:top-6 z-[130] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
             toast.type === "success"
               ? "border-emerald-200 bg-emerald-50 text-emerald-800"
               : "border-rose-200 bg-rose-50 text-rose-800"
           }`}
         >
           <AlertCircle size={17} className="shrink-0" />
           <span className="text-[13px] font-semibold">{toast.message}</span>
         </div>
)}
    </div>
  );
}

