import { useState, useMemo } from "react";
import { Box } from "lucide-react";
import { ClusterReconciliation } from "@/lib/cluster-reconciliation";

export interface ClusterReconciliationSectionProps {
  clusters: ClusterReconciliation[];
  isLoading?: boolean;
  emptyMessage?: string;
  filterActive?: boolean;
  title?: string;
  description?: string;
  sortByPriority?: boolean;
  enableFilters?: boolean;
  initialVisibleCount?: number;
  loadMoreStep?: number;
}

function projectLabelOf(projectName?: string): string {
  const t = (projectName || "").trim();
  return t && t !== "-" ? t : "Tanpa Project";
}

export function ClusterReconciliationSection({
  clusters,
  isLoading = false,
  emptyMessage,
  filterActive = false,
  title = "Rekonsiliasi Hardware per Cluster",
  description = "Rincian material per cluster berdasarkan 5 komponen wajib PRD: BOQ Plan, Additional, MOS (Material on Site), Used, dan Remains. Semua angka merupakan total kuantitas material di masing-masing cluster.",
  sortByPriority = false,
  enableFilters = false,
  initialVisibleCount,
  loadMoreStep,
}: ClusterReconciliationSectionProps) {
  const step = loadMoreStep ?? initialVisibleCount ?? 8;
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount ?? (clusters.length || 0));
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clusters) set.add(projectLabelOf(c.projectName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID", { numeric: true }));
  }, [clusters]);

  const statusOptions = useMemo(() => {
    const order: Record<string, number> = { perhatian: 0, berjalan: 1, sesuai: 2 };
    const set = new Set<string>();
    for (const c of clusters) set.add(c.status);
    return Array.from(set).sort(
      (a, b) => (order[a] ?? 9) - (order[b] ?? 9)
    );
  }, [clusters]);

  const filtered = useMemo(() => {
    const arr = [...clusters];
    if (!enableFilters) return arr;
    const term = searchTerm.trim().toLowerCase();
    const filteredArr = arr.filter((c) => {
      if (projectFilter && projectLabelOf(c.projectName) !== projectFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (term) {
        const hay = `${c.clusterName} ${projectLabelOf(c.projectName)}`.trim().toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (!sortByPriority) return filteredArr;
    const sev: Record<string, number> = { perhatian: 0, berjalan: 1, sesuai: 2 };
    return filteredArr.sort((a, b) => {
      const sa = sev[a.status] ?? 9;
      const sb = sev[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      if (b.remains !== a.remains) return b.remains - a.remains;
      return a.clusterName.localeCompare(b.clusterName, "id-ID", { numeric: true });
    });
  }, [clusters, enableFilters, projectFilter, statusFilter, searchTerm, sortByPriority]);

  const shown = initialVisibleCount ? filtered.slice(0, Math.min(visibleCount, filtered.length)) : filtered;
  const hasActiveFilter =
    enableFilters && (projectFilter || statusFilter || searchTerm.trim());
  const resetFilters = () => {
    setProjectFilter("");
    setStatusFilter("");
    setSearchTerm("");
    setVisibleCount(initialVisibleCount ?? (filtered.length || 0));
  };
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Box className="text-orange-500" size={20} />
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        {filterActive && <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-extrabold">Data terfilter</span>}
      </div>

      <p className="text-xs text-slate-500 mb-6">{description}</p>

      {enableFilters && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="cluster-search" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Pencarian
            </label>
            <input
              id="cluster-search"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(initialVisibleCount ?? (filtered.length || 0));
              }}
              placeholder="Cari cluster atau project..."
              aria-label="Pencarian cluster"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="sm:w-56">
            <label htmlFor="cluster-project-filter" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Project
            </label>
            <select
              id="cluster-project-filter"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setVisibleCount(initialVisibleCount ?? (filtered.length || 0));
              }}
              aria-label="Filter project"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Semua Project</option>
              {projectOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <label htmlFor="cluster-status-filter" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </label>
            <select
              id="cluster-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setVisibleCount(initialVisibleCount ?? (filtered.length || 0));
              }}
              aria-label="Filter status"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Semua Status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === "sesuai" ? "Sesuai" : s === "perhatian" ? "Perhatian" : "Berjalan"}</option>
              ))}
            </select>
          </div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-stone-50"
            >
              Reset filter
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm font-semibold text-slate-400">Memuat data rekonsiliasi...</div>
      ) : (
        <div className="flex flex-col">
          {clusters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm font-semibold text-slate-400">
              <span>{emptyMessage || "Belum ada data rekonsiliasi."}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm font-semibold text-slate-400">
              <span>Tidak ada cluster yang cocok dengan filter.</span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shown.map((cluster) => {
                const statusLabel = cluster.status === "sesuai" ? "Sesuai" : cluster.status === "perhatian" ? "Perhatian" : "Berjalan";
                const statusTone = cluster.status === "sesuai" ? "bg-emerald-100 text-emerald-700" : cluster.status === "perhatian" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";

                const progressPercentage = cluster.boqPlan > 0 ? Math.min(Math.max((cluster.used / cluster.boqPlan) * 100, 0), 100) : 0;
                const fallbackPercentage = cluster.boqPlan > 0 ? Math.min(Math.max((cluster.mos / cluster.boqPlan) * 100, 0), 100) : 0;
                const displayPercentage = progressPercentage > 0 ? progressPercentage : fallbackPercentage;

                return (
                  <div key={`${cluster.clusterId || cluster.clusterName}-${cluster.projectName}`} className="rounded-2xl border border-stone-100 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Cluster: {cluster.clusterName}</p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {cluster.projectName} {cluster.items > 0 ? `• ${cluster.items} material` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusTone}`}>{statusLabel}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div style={{ width: `${displayPercentage}%` }} className={`h-full transition-all ${progressPercentage > 0 ? "bg-amber-500" : "bg-emerald-500/60"}`} title={`Realisasi: ${progressPercentage.toFixed(1)}%`} />
                      </div>
                    </div>
                    {progressPercentage === 0 && <p className="text-[10px] font-semibold text-slate-400">*Belum ada realisasi, menampilkan persentase MOS sebagai placeholder</p>}

                    <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-semibold">
                      <div className="rounded-lg bg-white border border-stone-100 p-2">
                        <span className="block text-[10px] text-slate-400 mb-0.5">BOQ Plan</span>
                        <span className="text-slate-700">{cluster.boqPlan.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="rounded-lg bg-white border border-stone-100 p-2">
                        <span className="block text-[10px] text-slate-400 mb-0.5">Additional</span>
                        <span className="text-slate-700">+{cluster.additional.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-emerald-800">
                        <span className="block text-[10px] text-emerald-600 mb-0.5">MOS</span>
                        <span>{cluster.mos.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="rounded-lg bg-orange-50 border border-orange-100 p-2 text-orange-800">
                        <span className="block text-[10px] text-orange-600 mb-0.5">Used</span>
                        <span>{cluster.used.toLocaleString("id-ID")}</span>
                      </div>
                      <div className={`rounded-lg border p-2 ${cluster.remains < 0 ? "bg-rose-50 border-rose-200 text-rose-600 font-extrabold" : "bg-amber-50 border-amber-100 text-amber-800"}`}>
                        <span className="block text-[10px] mb-0.5">Remains</span>
                        <span>{cluster.remains.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {initialVisibleCount && visibleCount < filtered.length && (
            <div className="mt-4 text-center">
              <button onClick={() => setVisibleCount((v) => Math.min(v + step, filtered.length))} className="rounded bg-orange-500 px-4 py-2 text-sm text-white">
                Tampilkan lagi
              </button>
            </div>
          )}
          {initialVisibleCount && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Menampilkan {shown.length} dari {filtered.length} cluster
              {hasActiveFilter && filtered.length !== clusters.length ? ` (total ${clusters.length})` : ""}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span>MOS (Material on Site)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span>Used</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span>Remains</span>
        </div>
      </div>
    </div>
  );
}