import { Badge } from "@/components/ui/badge";
import { getKondisiLabel } from "@/lib/kondisi-barang";

const KONDISI_TONE: Record<string, string> = {
  baik: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700",
  rusak_ringan: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700",
  rusak_berat: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700",
  tidak_sesuai_spek: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-700",
  doa: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-700",
};

export function KondisiBadge({ value }: { value?: string | null }) {
  const label = getKondisiLabel(value);
  if (!value || label === "-") return <span className="text-sm text-gray-500">-</span>;

  const normalized = String(value).trim().toLowerCase();
  const tone = KONDISI_TONE[normalized] || "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600";

  return (
    <Badge variant="default" className={`ring-1 ring-inset ${tone}`}>
      {label}
    </Badge>
  );
}
