"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

const areaOptions = [
  "Pilih Area Operasional",
  "Gudang Pusat Cimahi",
  "Gudang Kedua",
  "Site Klien - Jakarta",
];

const projectOptions = [
  { id: "p1", label: "Project Backbone JKT" },
  { id: "p2", label: "Project Office Network BDG" },
  { id: "p3", label: "Project Data Center CML" },
];

type ItemOption = {
  id: string;
  label: string;
  satuan: string;
};

const defaultRow = {
  id: crypto.randomUUID(),
  barangId: "",
  qty: 1,
};

export default function SupervisorBoqPage() {
  const { get } = useApi();
  const [itemsFromApi, setItemsFromApi] = useState<ItemOption[]>([]);
  const [projectsFromApi, setProjectsFromApi] = useState<{ id: string; label: string }[]>([]);
  const [area, setArea] = useState(areaOptions[0]);
  const [project, setProject] = useState(projectOptions[0].id);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [kodeTiket, setKodeTiket] = useState("");
  const [rows, setRows] = useState(() => [defaultRow]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [attachmentInfo, setAttachmentInfo] = useState<{ url?: string; filename?: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/items`);
        if (!response.ok) {
          console.error("Gagal mengambil daftar barang", response.status);
          return;
        }

        const payload = await response.json();
        const rawItems = payload?.data?.data ?? payload?.data ?? payload ?? [];

        if (!mounted) return;

        const mappedItems = Array.isArray(rawItems)
          ? rawItems.map((item: any) => ({
              id: String(item.barang_id ?? item.kode_perangkat ?? item.id ?? item.kode ?? item.nama_barang ?? ""),
              label: String(item.nama_barang ?? item.kode_perangkat ?? item.id ?? "Barang"),
              satuan:
                typeof item.unit === "string"
                  ? item.unit
                  : item.satuan_default?.kode_satuan ||
                    item.satuan_default?.kodeSatuan ||
                    String(item.satuan_default_id ?? "Unit"),
            }))
          : [];

        setItemsFromApi(mappedItems);
        if (mounted && rows.length === 1 && !rows[0].barangId && mappedItems.length > 0) {
          setRows([{ ...rows[0], barangId: mappedItems[0].id }]);
        }
        // load projects as well
        try {
          const resp2 = await get(`${baseUrl}/api/projects`);
          if (resp2.ok) {
            const pPayload = await resp2.json();
            const rawProjects = pPayload?.data?.data ?? pPayload?.data ?? pPayload ?? [];
            const mappedProjects = Array.isArray(rawProjects)
              ? rawProjects.map((p: any) => ({ id: String(p.project_id ?? p.id ?? p.projectId ?? p.kode ?? p.nama_project ?? p.title ?? p.name ?? ""), label: String(p.nama_project ?? p.title ?? p.name ?? "Project") }))
              : [];
            setProjectsFromApi(mappedProjects);
            if (mounted && mappedProjects.length > 0 && !project) setProject(mappedProjects[0].id);
          }
        } catch (err) {
          console.error("Error fetching projects", err);
        }
      } catch (error) {
        console.error("Error fetching items", error);
      }
    }

    loadItems();
    return () => {
      mounted = false;
    };
  }, [get, rows]);

  const handleRowChange = (id: string, field: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id !== id
          ? row
          : {
              ...row,
              [field]: field === "qty" ? Number(value) : value,
            }
      )
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        barangId: itemsFromApi[0]?.id ?? "",
        qty: 1,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const summary = useMemo(() => {
    const totalJenis = rows.length;
    const totalKuantitas = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
    const tujuan = projectsFromApi.find((p) => p.id === project)?.label || projectOptions.find((item) => item.id === project)?.label || "-";

    return { totalJenis, totalKuantitas, tujuan };
  }, [project, rows]);

  // ============================================================
  // HANDLE SUBMIT
  // ============================================================
  const buildPayload = () => {
    return {
      projectId: project,
      area,
      ticketNumber: kodeTiket,
      status: "DRAFT",
      source: "TOP_DOWN",
      externalVerificationStatus: "MENUNGGU",
      notes: attachmentInfo ? JSON.stringify(attachmentInfo) : undefined,
      items: rows.map((r) => {
        const sel = itemsFromApi.find((it) => it.id === r.barangId);
        return {
          itemCode: sel?.id ?? String(r.barangId ?? ""),
          itemName: sel?.label ?? "",
          quantity: Number(r.qty || 0),
          unit: sel?.satuan ?? "Unit",
          destinationWarehouseId: null,
          notes: null,
        };
      }),
    };
  };

  const createBoq = async (payload: any) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const resp = await fetch(`${baseUrl}/api/boqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => null);
      throw new Error(err?.message || "Gagal menyimpan BOQ.");
    }

    return await resp.json();
  };

  const activateBoq = async (boqId: string | number) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const resp = await fetch(`${baseUrl}/api/boqs/${boqId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "aktif" }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => null);
      throw new Error(err?.message || "Gagal mengaktifkan BOQ.");
    }

    return await resp.json();
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project) {
      alert("Pilih project terlebih dahulu.");
      return;
    }

    if (!kodeTiket.trim()) {
      alert("Masukkan kode tiket.");
      return;
    }

    if (!area || area === "Pilih Area Operasional") {
      alert("Pilih area.");
      return;
    }

    if (!rows.length) {
      alert("Tambahkan minimal satu barang.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (pdfFile) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const form = new FormData();
        form.append("file", pdfFile);
        const uploadResp = await fetch(`${baseUrl}/api/upload`, {
          method: "POST",
          body: form,
        });
        if (uploadResp.ok) {
          const up = await uploadResp.json();
          setAttachmentInfo({ url: up?.data?.url || up?.data?.filename || "", filename: pdfFile.name });
        } else {
          console.warn("Upload PDF gagal", uploadResp.status);
        }
      }

      const payload = buildPayload();
      payload.notes = attachmentInfo ? JSON.stringify(attachmentInfo) : undefined;

      const result = await createBoq(payload);
      alert("BOQ berhasil dibuat: " + (result?.data?.boq_id || "(OK)"));
      setKodeTiket("");
      setRows([defaultRow]);
      setPdfFile(null);
      setAttachmentInfo(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan BOQ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!project) {
      alert("Pilih project terlebih dahulu.");
      return;
    }

    if (!kodeTiket.trim()) {
      alert("Masukkan kode tiket.");
      return;
    }

    if (!area || area === "Pilih Area Operasional") {
      alert("Pilih area.");
      return;
    }

    if (!rows.length) {
      alert("Tambahkan minimal satu barang.");
      return;
    }

    setIsActivating(true);

    try {
      if (pdfFile) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const form = new FormData();
        form.append("file", pdfFile);
        const uploadResp = await fetch(`${baseUrl}/api/upload`, {
          method: "POST",
          body: form,
        });
        if (uploadResp.ok) {
          const up = await uploadResp.json();
          setAttachmentInfo({ url: up?.data?.url || up?.data?.filename || "", filename: pdfFile.name });
        } else {
          console.warn("Upload PDF gagal", uploadResp.status);
        }
      }

      const payload = buildPayload();
      payload.notes = attachmentInfo ? JSON.stringify(attachmentInfo) : undefined;

      const createResult = await createBoq(payload);
      const boqId = createResult?.data?.boq_id;

      if (!boqId) {
        throw new Error("Gagal membuat BOQ. ID tidak ditemukan.");
      }

      await activateBoq(boqId);
      alert("BOQ berhasil dibuat dan diaktifkan: " + String(boqId));
      setKodeTiket("");
      setRows([defaultRow]);
      setPdfFile(null);
      setAttachmentInfo(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat mengaktifkan BOQ.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-10 px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                Input BOQ Plan
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                Berdasarkan Tiket Material External
              </h1>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Status: Draft
            </div>
          </div>

          <form onSubmit={handleSaveDraft} className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <section className="rounded-3xl border border-slate-200/80 bg-[#FEFBF8] p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Informasi Utama</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pilih area, project, dan masukkan kode tiket.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Area
                    <select
                      value={area}
                      onChange={(event) => setArea(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                    >
                      {areaOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-700">
                    Project
                    <select
                      value={project}
                      onChange={(event) => setProject(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                    >
                      {projectsFromApi.length > 0 ? (
                        projectsFromApi.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))
                      ) : (
                        projectOptions.map((projectOption) => (
                          <option key={projectOption.id} value={projectOption.id}>
                            {projectOption.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-700 sm:col-span-2">
                    Kode Tiket
                    <input
                      type="text"
                      value={kodeTiket}
                      onChange={(event) => setKodeTiket(event.target.value)}
                      placeholder="Contoh: PO-2024-05-882"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-700 sm:col-span-2">
                    Lampiran PDF BOQ
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                    />
                    {pdfFile && <p className="mt-1 text-xs text-slate-500">{pdfFile.name}</p>}
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Daftar Barang</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tambah atau hapus baris produk untuk BOQ Plan.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {rows.map((row) => {
                    const selectedItem = itemsFromApi.find((item) => item.id === row.barangId);

                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 rounded-3xl border border-slate-200/80 bg-slate-50 p-4 sm:grid-cols-[1.3fr_0.9fr_0.8fr_auto]"
                      >
                        <label className="space-y-2 text-sm text-slate-700">
                          Nama Barang
                          <select
                            value={row.barangId}
                            onChange={(event) => handleRowChange(row.id, "barangId", event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                          >
                            <option value="" disabled>
                              {itemsFromApi.length > 0 ? "Pilih Nama Barang" : "Memuat barang..."}
                            </option>
                            {itemsFromApi.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm text-slate-700">
                          Qty
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(event) => handleRowChange(row.id, "qty", event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
                          />
                        </label>

                        <div className="space-y-2 text-sm text-slate-700">
                          <span className="block mb-2">Satuan</span>
                          <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                            {selectedItem?.satuan ?? "Unit"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <Button variant="outline" type="button" onClick={addRow}>
                    + Tambah Barang
                  </Button>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200/80 bg-[#FEFBF8] p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                      Ringkasan
                    </p>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900">
                      Todo BOQ Plan
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4 text-sm text-slate-700">
                  <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Jenis Barang</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalJenis} Jenis</p>
                  </div>

                  <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Kuantitas</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalKuantitas} Unit</p>
                  </div>

                  <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tujuan Alokasi</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{summary.tujuan}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button className="w-full bg-white text-slate-800 hover:bg-slate-100 border border-slate-200" variant="outline" type="submit" disabled={isSubmitting || isActivating}>
                    {isSubmitting ? "Menyimpan..." : "Simpan sebagai Draft"}
                  </Button>
                  <Button className="w-full bg-orange-500 text-white hover:bg-orange-600" type="button" onClick={handleActivate} disabled={isSubmitting || isActivating}>
                    {isActivating ? "Mengaktifkan..." : "Konfirmasi & Aktifkan BOQ"}
                  </Button>
                </div>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
}
