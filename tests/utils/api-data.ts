import { API_BASE_URL } from "../fixtures/test-data";

/**
 * Helper pengambilan data uji (master data) langsung dari API.
 * Dipisahkan dari logika test agar spec tetap fokus pada assertion.
 */

export interface InboundFormData {
  projectId: string;
  projectName: string;
  clusterId: string;
  clusterLabel: string;
  boqId: string;
  warehouseId: string;
  warehouseName: string;
  itemBarangId: string;
  itemCode: string;
  itemName: string;
}

async function apiGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} gagal dengan status ${res.status}`);
  }
  return res.json();
}

/**
 * Mengumpulkan data yang dibutuhkan form Input Inbound:
 * project aktif -> cluster -> BOQ aktif -> gudang tujuan -> barang dari BOQ.
 */
export async function fetchInboundFormData(token: string): Promise<InboundFormData> {
  const projects = await apiGet("/api/projects", token);
  const project = (projects.data ?? [])[0];
  if (!project) throw new Error("Tidak ada project untuk data uji inbound.");

  const clusters = await apiGet(`/api/clusters?project_id=${encodeURIComponent(project.project_id)}`, token);
  const cluster = (clusters.data ?? []).find((c: any) => c.cluster_id);
  if (!cluster) throw new Error("Tidak ada cluster untuk project terpilih.");

  const boqs = await apiGet("/api/boqs?limit=200", token);
  const boq = (boqs.data ?? []).find(
    (b: any) => String(b.cluster_id) === String(cluster.cluster_id) && b.status === "aktif",
  );
  if (!boq) throw new Error(`Tidak ada BOQ aktif untuk cluster ${cluster.cluster_id}.`);

  const boqDetail = await apiGet(`/api/boqs/${boq.boq_id}`, token);
  const boqItem = (boqDetail.data?.items ?? []).find((it: any) => it.barang?.barang_id);
  if (!boqItem) throw new Error("BOQ aktif tidak memiliki item barang.");

  const warehouses = await apiGet("/api/warehouses?limit=1000&is_aktif=true", token);
  const warehouse = (warehouses.data ?? []).find((w: any) => w.tipe !== "dadakan") ?? (warehouses.data ?? [])[0];
  if (!warehouse) throw new Error("Tidak ada gudang aktif untuk data uji inbound.");

  return {
    projectId: String(project.project_id),
    projectName: project.nama_project,
    clusterId: String(cluster.cluster_id),
    clusterLabel: `${cluster.cluster_id} — ${cluster.nama_cluster || cluster.cluster_id}`,
    boqId: String(boq.boq_id),
    warehouseId: String(warehouse.gudang_id),
    warehouseName: warehouse.nama_gudang,
    itemBarangId: String(boqItem.barang.barang_id),
    itemCode: boqItem.barang.kode_perangkat,
    itemName: boqItem.barang.nama_barang,
  };
}
