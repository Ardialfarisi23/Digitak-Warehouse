import { Box } from "lucide-react";
import { ClusterReconciliation } from "@/lib/cluster-reconciliation";

export interface ClusterReconciliationSectionProps {
  clusters: ClusterReconciliation[];
  isLoading?: boolean;
  emptyMessage?: string;
  filterActive?: boolean;
  title?: string;
  description?: string;
}

export function ClusterReconciliationSection({
  clusters,
  isLoading = false,
  emptyMessage,
  filterActive = false,
  title = "Rekonsiliasi Hardware per Cluster",
  description = "Rincian material per cluster berdasarkan 5 komponen wajib PRD: BOQ Plan, Additional, MOS (Material on Site), Used, dan Remains. Semua angka merupakan total kuantitas material di masing-masing cluster.",
}: ClusterReconciliationSectionProps) {
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

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm font-semibold text-slate-400">Memuat data rekonsiliasi...</div>
      ) : (
        (() => {
          if (clusters.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-10 text-center text-sm font-semibold text-slate-400">
                <span>{emptyMessage || "Belum ada data rekonsiliasi."}</span>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((cluster) => {
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
          );
        })()
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