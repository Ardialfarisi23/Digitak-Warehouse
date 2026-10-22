/**
 * Shared types and pure builder for cluster reconciliation data.
 *
 * Moved from use-supervisor-dashboard.ts (baris 463-533) and supervisor-dashboard.tsx
 * (type ClusterReconciliation, baris 90-101) so both Supervisor and Admin dashboards
 * can reuse the exact same aggregation logic and shape.
 */

export type ClusterReconciliation = {
  clusterId: string;
  clusterName: string;
  projectName: string;
  boqPlan: number;
  additional: number;
  mos: number;
  used: number;
  remains: number;
  status: string;
  items: number;
};

type RawReconciliationRow = {
  cluster_id?: string | null;
  nama_cluster?: string | null;
  projectnama?: string;
  projectNama?: string;
  project_name?: string;
  project_nama?: string;
  boq?: number;
  additional?: number;
  mos?: number;
  used?: number;
  remains?: number;
  status?: string;
};

/**
 * Build ClusterReconciliation[] from raw rows returned by
 * GET /api/reconciliation/inventory?groupBy=cluster.
 *
 * Logic and sort order MUST stay identical to the original inline code in
 * use-supervisor-dashboard.ts (baris 463-533).
 */
export function buildClusterReconciliation(
  data: RawReconciliationRow[]
): ClusterReconciliation[] {
  const grouped = new Map<string, {
    clusterId: string;
    clusterName: string;
    projectName: string;
    boqPlan: number;
    additional: number;
    mos: number;
    used: number;
    remains: number;
    hasPerhatian: boolean;
    hasSesuai: boolean;
    items: number;
  }>();

  for (const row of data) {
    const projectName = row.projectnama || row.projectNama || row.project_name || row.project_nama || "-";
    const clusterId = row.cluster_id ? String(row.cluster_id) : "";
    const clusterName = (row.nama_cluster || "").trim() || (clusterId || "Belum ditentukan");
    const key = clusterId || `${projectName}::tanpa-cluster`;
    const boq = Number(row.boq || 0);
    const additional = Number(row.additional || 0);
    const mos = Number(row.mos || 0);
    const used = Number(row.used || 0);
    const remains = Number(row.remains || 0);

    if (!grouped.has(key)) {
      grouped.set(key, {
        clusterId,
        clusterName,
        projectName,
        boqPlan: 0,
        additional: 0,
        mos: 0,
        used: 0,
        remains: 0,
        hasPerhatian: false,
        hasSesuai: false,
        items: 0,
      });
    }

    const g = grouped.get(key)!;
    g.boqPlan += boq;
    g.additional += additional;
    g.mos += mos;
    g.used += used;
    g.remains += remains;
    g.items += 1;
    if (row.status === "perhatian") g.hasPerhatian = true;
    else if (row.status === "sesuai") g.hasSesuai = true;
  }

  if (grouped.size) {
    return Array.from(grouped.values())
      .map((g) => ({
        clusterId: g.clusterId,
        clusterName: g.clusterName,
        projectName: g.projectName,
        boqPlan: g.boqPlan,
        additional: g.additional,
        mos: g.mos,
        used: g.used,
        remains: g.remains,
        status: g.hasPerhatian ? "perhatian" : g.hasSesuai ? "sesuai" : "berjalan",
        items: g.items,
      }))
      .sort((a, b) =>
        a.clusterName.localeCompare(b.clusterName, "id-ID", { numeric: true })
      );
  }

  return [];
}