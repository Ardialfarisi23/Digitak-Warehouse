export type ZonaCapacity = {
  zona_id: number;
  kode_zona: string;
  status_kecukupan?: string;
  status_kecukupan_source?: string;
  kapasitas_maksimum?: number | null;
  sisa?: number | null;
  kapasitas_belum_diatur?: boolean;
  dinilai_oleh?: string | null;
  dinilai_pada?: string | null;
  total_qty?: number;
};

export function getStatusBadgeClass(status?: string) {
  switch (status) {
    case "CUKUP":
      return "border-green-200 bg-green-100 text-green-800";
    case "MENDEKATI_PENUH":
      return "border-orange-200 bg-orange-100 text-orange-800";
    case "TIDAK_CUKUP":
      return "border-red-200 bg-red-100 text-red-800";
    default:
      return "border-gray-200 bg-gray-100 text-gray-800";
  }
}

export function getStatusLabel(status?: string) {
  switch (status) {
    case "CUKUP":
      return "Cukup";
    case "MENDEKATI_PENUH":
      return "Mendekati Penuh";
    case "TIDAK_CUKUP":
      return "Tidak Cukup";
    default:
      return "Belum dinilai";
  }
}

export function formatSisaCapacity(sisa: number | null, kapasitasMaksimum: number | null | undefined) {
  if (sisa === null || sisa === undefined || kapasitasMaksimum === null || kapasitasMaksimum === undefined) {
    return null;
  }

  const sisaNumber = Number(sisa);
  const kapasitasNumber = Number(kapasitasMaksimum);

  if (kapasitasNumber <= 0) {
    return `${sisaNumber.toLocaleString("id-ID")} unit tersisa`;
  }

  return `${sisaNumber.toLocaleString("id-ID")} / ${kapasitasNumber.toLocaleString("id-ID")} unit tersisa`;
}

export function getStatusSourceLabel(zone: Pick<ZonaCapacity, "status_kecukupan_source" | "dinilai_oleh" | "dinilai_pada">) {
  if (zone.status_kecukupan_source === "MANUAL" && zone.dinilai_oleh) {
    const tanggal = zone.dinilai_pada ? new Date(zone.dinilai_pada).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) : "-";

    return `Dinilai manual oleh ${zone.dinilai_oleh} pada ${tanggal}`;
  }

  return "Dihitung otomatis";
}

export function formatDateTime(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
