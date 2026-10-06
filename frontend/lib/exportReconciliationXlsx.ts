import ExcelJS from "exceljs";

export interface ReconciliationRecord {
  project_id: string;
  project_nama: string;
  cluster_id: string;
  nama_cluster: string;
  cluster_type: string | null;
  project_type: string | null;
  alamat_lengkap: string | null;
  kso_partner: string | null;
  kso_contact: string | null;
  no_tiket_release: string | null;
  vendor: string | null;
  homepass_plan: number | null;
  status_aktif: boolean | null;
  pic_nama: string | null;
  kode_tiket: string;
  boq_list: Array<{ kode_boq?: string }>;
  barang_id: string;
  nama_barang: string;
  kode_perangkat: string;
  satuan: string;
  gudang_nama: string;
  boq: number;
  additional: number;
  mos: number;
  used: number;
  remains: number;
  status: "sesuai" | "perhatian" | "belum_ada_data";
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\[\]:*?/\\]/g, "").trim();
  return cleaned.slice(0, 31);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateLocal(): string {
  const d = new Date();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function exportReconciliationXlsx(records: ReconciliationRecord[]) {
  if (!records.length) {
    throw new Error("Tidak ada data rekonsiliasi untuk diekspor.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;

  const grouped = new Map<string, ReconciliationRecord[]>();
  for (const r of records) {
    const key = r.project_id || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const sortedProjects = Array.from(grouped.keys()).sort();
  for (const projectId of sortedProjects) {
    const projectRecords = grouped.get(projectId)!;
    const projectName = projectRecords[0].project_nama || "Project";
    const sheetName = sanitizeSheetName(projectName);
    const ws = workbook.addWorksheet(sheetName);

    ws.views = [{ state: "frozen", xSplit: 9, ySplit: 9, topLeftCell: "J10", showGridLines: false } as ExcelJS.WorksheetView];
    ws.columns = [
      { width: 4 },
      { width: 60 },
      { width: 16 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];

    const clusters = Array.from(
      new Map(projectRecords.map((r) => [r.cluster_id, r])).values()
    ).sort((a, b) => a.nama_cluster.localeCompare(b.nama_cluster));

    const materials = Array.from(
      new Map(projectRecords.map((r) => [r.barang_id, r])).values()
    ).sort((a, b) => a.nama_barang.localeCompare(b.nama_barang));

    const clusterStartCol = 10;
    const clusterCount = clusters.length;
    const clusterCols: number[] = [];
    for (let i = 0; i < clusterCount; i++) {
      clusterCols.push(clusterStartCol + i * 5);
    }

    const summaryStartCol = 5;
    const summaryEndCol = 9;

    ws.mergeCells("B1", "I1");
    const titleCell = ws.getCell("B1");
    titleCell.value = `Rekonsiliasi Inventory BOQ per Cluster - ${projectName}`;
    titleCell.font = { name: "Trebuchet MS", size: 14, bold: true };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };

    ws.mergeCells("B2", "E2");
    const dateCell = ws.getCell("B2");
    dateCell.value = `Diekspor: ${formatDateLocal()}`;
    dateCell.font = { name: "Trebuchet MS", size: 10 };

    const labelRows = [
      { label: "Cluster ID", key: "cluster_id" },
      { label: "Cluster", key: "nama_cluster" },
      { label: "PIC", key: "pic_nama" },
      { label: "No. Tiket", key: "kode_tiket" },
      { label: "Kode BOQ", key: "kode_boq" },
    ];

    for (let i = 0; i < labelRows.length; i++) {
      const row = 2 + i;
      ws.mergeCells(`G${row}:H${row}`);
      const labelCell = ws.getCell(`G${row}`);
      labelCell.value = labelRows[i].label;
      labelCell.font = { name: "Trebuchet MS", size: 10, bold: true };
      labelCell.alignment = { horizontal: "left", vertical: "middle" };
    }

    const clusterHeaderRow = 2;
    for (let i = 0; i < clusterCount; i++) {
      const cluster = clusters[i];
      const startCol = clusterCols[i];
      const endCol = startCol + 4;
      const startColLetter = String.fromCharCode(64 + startCol);
      const endColLetter = String.fromCharCode(64 + endCol);

      ws.mergeCells(`${startColLetter}${clusterHeaderRow}:${endColLetter}${clusterHeaderRow}`);
      const headerCell = ws.getCell(clusterHeaderRow, startCol);
      headerCell.value = cluster.cluster_id;
      headerCell.font = { name: "Trebuchet MS", size: 10, bold: true };
      headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      headerCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };

      ws.mergeCells(`${startColLetter}${clusterHeaderRow + 1}:${endColLetter}${clusterHeaderRow + 1}`);
      const nameCell = ws.getCell(clusterHeaderRow + 1, startCol);
      nameCell.value = cluster.nama_cluster;
      nameCell.font = { name: "Trebuchet MS", size: 10, bold: true };
      nameCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      nameCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };

      const tickets = Array.from(new Set(projectRecords.filter((r) => r.cluster_id === cluster.cluster_id).map((r) => r.kode_tiket))).join(", ");
      ws.mergeCells(`${startColLetter}${clusterHeaderRow + 2}:${endColLetter}${clusterHeaderRow + 2}`);
      const ticketCell = ws.getCell(clusterHeaderRow + 2, startCol);
      ticketCell.value = tickets;
      ticketCell.font = { name: "Trebuchet MS", size: 10 };
      ticketCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      ticketCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      ticketCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };

      const boqCodes = Array.from(
        new Set(projectRecords.filter((r) => r.cluster_id === cluster.cluster_id).flatMap((r) => r.boq_list.map((b) => b.kode_boq).filter(Boolean)))
      ).join(", ");
      ws.mergeCells(`${startColLetter}${clusterHeaderRow + 3}:${endColLetter}${clusterHeaderRow + 3}`);
      const boqCell = ws.getCell(clusterHeaderRow + 3, startCol);
      boqCell.value = boqCodes;
      boqCell.font = { name: "Trebuchet MS", size: 10 };
      boqCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      boqCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      boqCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };

      ws.mergeCells(`${startColLetter}${clusterHeaderRow + 4}:${endColLetter}${clusterHeaderRow + 4}`);
      const picCell = ws.getCell(clusterHeaderRow + 4, startCol);
      picCell.value = cluster.pic_nama || "-";
      picCell.font = { name: "Trebuchet MS", size: 10 };
      picCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      picCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      picCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };
    }

    const clusterCountRow = 3;
    const clusterNameStartCol = clusterCols[0];
    const clusterNameEndCol = clusterCols[clusterCount - 1] + 4;
    const clusterNameEndLetter = String.fromCharCode(64 + clusterNameEndCol);
    ws.getCell(clusterCountRow, 9).value = { formula: `=COUNTA(${String.fromCharCode(64 + clusterNameStartCol)}${clusterCountRow}:${clusterNameEndLetter}${clusterCountRow})`, result: clusterCount };
    ws.getCell(clusterCountRow, 9).font = { name: "Trebuchet MS", size: 10, bold: true };
    ws.getCell(clusterCountRow, 9).alignment = { horizontal: "center", vertical: "middle" };

    const summaryTitleRow = 8;
    ws.mergeCells(`E${summaryTitleRow}:I${summaryTitleRow}`);
    const summaryTitle = ws.getCell(summaryTitleRow, summaryStartCol);
    summaryTitle.value = "Summary All Qty Material";
    summaryTitle.font = { name: "Trebuchet MS", size: 10, bold: true };
    summaryTitle.alignment = { horizontal: "center", vertical: "middle" };
    summaryTitle.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
    };
    summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

    for (let i = 0; i < clusterCount; i++) {
      const startCol = clusterCols[i];
      const endCol = startCol + 4;
      const startColLetter = String.fromCharCode(64 + startCol);
      const endColLetter = String.fromCharCode(64 + endCol);
      ws.mergeCells(`${startColLetter}${summaryTitleRow}:${endColLetter}${summaryTitleRow}`);
      const clusterSummaryTitle = ws.getCell(summaryTitleRow, startCol);
      clusterSummaryTitle.value = `Qty Material - ${clusters[i].nama_cluster}`;
      clusterSummaryTitle.font = { name: "Trebuchet MS", size: 10, bold: true };
      clusterSummaryTitle.alignment = { horizontal: "center", vertical: "middle" };
      clusterSummaryTitle.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      clusterSummaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };
    }

    const headerRow = 9;
    const subHeaders = ["BoQ Plan", "Additional", "MOS", "Used", "Remains"];
    const subHeaderFills = [{ argb: "FFC6E0B4" }, { argb: "FFF2F2F2" }, { argb: "FFFEF1CC" }, { argb: "FFD9E6FC" }, { argb: "FFFAD9D6" }];
    for (let i = 0; i < 5; i++) {
      const cell = ws.getCell(headerRow, summaryStartCol + i);
      cell.value = subHeaders[i];
      cell.font = { name: "Trebuchet MS", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: subHeaderFills[i] };
    }

    for (let i = 0; i < clusterCount; i++) {
      const startCol = clusterCols[i];
      for (let j = 0; j < 5; j++) {
        const cell = ws.getCell(headerRow, startCol + j);
        cell.value = subHeaders[j];
        cell.font = { name: "Trebuchet MS", size: 10, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
          bottom: { style: "thin" },
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: subHeaderFills[j] };
      }
    }

    const dataStartRow = 10;
    const dataEndRow = dataStartRow + materials.length - 1;

    materials.forEach((mat, idx) => {
      const row = dataStartRow + idx;
      ws.getCell(row, 2).value = mat.nama_barang;
      ws.getCell(row, 3).value = String(mat.kode_perangkat ?? "");
      ws.getCell(row, 4).value = mat.satuan;

      const matRecords = projectRecords.filter((r) => r.barang_id === mat.barang_id);
      const totals = matRecords.reduce(
        (acc, r) => {
          acc.boq += r.boq;
          acc.additional += r.additional;
          acc.mos += r.mos;
          acc.used += r.used;
          acc.remains += r.remains;
          return acc;
        },
        { boq: 0, additional: 0, mos: 0, used: 0, remains: 0 }
      );

      for (let i = 0; i < 5; i++) {
        const cell = ws.getCell(row, summaryStartCol + i);
        const keys = ["boq", "additional", "mos", "used", "remains"] as const;
        const val = totals[keys[i]];
        cell.value = val || undefined;
        cell.font = { name: "Trebuchet MS", size: 10 };
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
          bottom: { style: "thin" },
        };
        if (i === 4) {
          cell.numFmt = '#,##0;[Red]-#,##0';
        } else {
          cell.numFmt = "#,##0";
        }
      }

      for (let i = 0; i < clusterCount; i++) {
        const cluster = clusters[i];
        const startCol = clusterCols[i];
        const rec = matRecords.find((r) => r.cluster_id === cluster.cluster_id);
        const values = rec ? [rec.boq, rec.additional, rec.mos, rec.used] : [undefined, undefined, undefined, undefined];
        const remainsFormula = rec ? `=${String.fromCharCode(65 + startCol + 2)}${row}-${String.fromCharCode(65 + startCol + 1)}${row}-${String.fromCharCode(65 + startCol)}${row}` : undefined;

        for (let j = 0; j < 5; j++) {
          const cell = ws.getCell(row, startCol + j);
          if (j < 4 && rec) {
            cell.value = values[j];
          } else if (j === 4 && rec) {
            cell.value = { formula: remainsFormula!, result: rec.remains };
          }
          cell.font = { name: "Trebuchet MS", size: 10 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
            bottom: { style: "thin" },
          };
          if (j === 0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
          } else if (j === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
          } else if (j === 2) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF1CC" } };
          } else if (j === 3) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E6FC" } };
          } else if (j === 4) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAD9D6" } };
            cell.numFmt = "#,##0;[Red]-#,##0";
          } else {
            cell.numFmt = "#,##0";
          }
        }
      }
    });

    const totalRow = dataEndRow + 2;
    ws.getCell(totalRow, 2).value = "Total";
    ws.getCell(totalRow, 2).font = { name: "Trebuchet MS", size: 10, bold: true };
    ws.getCell(totalRow, 2).border = {
      top: { style: "medium" },
      left: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
    };

    for (let c = summaryStartCol; c <= summaryEndCol; c++) {
      const cell = ws.getCell(totalRow, c);
      const colLetter = String.fromCharCode(64 + c);
      cell.value = { formula: `=SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`, result: 0 };
      cell.font = { name: "Trebuchet MS", size: 10, bold: true };
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
      cell.numFmt = c === summaryEndCol ? "#,##0;[Red]-#,##0" : "#,##0";
    }

    for (let i = 0; i < clusterCount; i++) {
      const startCol = clusterCols[i];
      for (let j = 0; j < 5; j++) {
        const cell = ws.getCell(totalRow, startCol + j);
        const colLetter = String.fromCharCode(65 + startCol + j);
        const isRemains = j === 4;
        cell.value = { formula: `=SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`, result: 0 };
        cell.font = { name: "Trebuchet MS", size: 10, bold: true };
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          right: { style: "thin" },
          bottom: { style: "thin" },
        };
        cell.numFmt = isRemains ? "#,##0;[Red]-#,##0" : "#,##0";
      }
    }

    const noteStart = totalRow + 2;
    ws.getCell(noteStart, 2).value = "Catatan";
    ws.getCell(noteStart, 2).font = { name: "Trebuchet MS", size: 10, bold: true };
    const notes = [
      "BoQ Plan : Jumlah material yang direncanakan sejak awal untuk cluster ini.",
      "Additional : Tambahan material yang diajukan karena kekurangan dari rencana BOQ awal, setelah disetujui dan ditambahkan resmi ke sistem.",
      "MOS (Material On Site) : Material yang sudah dikirim dan terkonfirmasi diterima di lapangan.",
      "Used : Jumlah material yang sudah dipasang/digunakan di lapangan, berdasarkan laporan harian dari mitra.",
      "Remains : MOS - (BoQ Plan + Additional). Menghitung sisa pengiriman, bukan pemakaian di lapangan.",
    ];
    notes.forEach((note, idx) => {
      const cell = ws.getCell(noteStart + 1 + idx, 2);
      cell.value = note;
      cell.font = { name: "Trebuchet MS", size: 10 };
    });

    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  }

  const detailSheet = workbook.addWorksheet("Data Detail");
  detailSheet.views = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" } as ExcelJS.WorksheetView];
  detailSheet.columns = [
    { header: "Project", key: "project_nama", width: 30 },
    { header: "Cluster Name", key: "nama_cluster", width: 30 },
    { header: "Cluster ID", key: "cluster_id", width: 18 },
    { header: "Tipe Cluster", key: "cluster_type", width: 16 },
    { header: "Tipe Project", key: "project_type", width: 16 },
    { header: "Alamat Lengkap", key: "alamat_lengkap", width: 40 },
    { header: "Mitra KSO", key: "kso_partner", width: 24 },
    { header: "Kontak KSO", key: "kso_contact", width: 18 },
    { header: "No. Tiket Release", key: "no_tiket_release", width: 20 },
    { header: "Vendor", key: "vendor", width: 20 },
    { header: "Homepass Plan", key: "homepass_plan", width: 14 },
    { header: "Status", key: "status_aktif", width: 14 },
    { header: "PIC", key: "pic_nama", width: 20 },
    { header: "Kode Tiket", key: "kode_tiket", width: 20 },
    { header: "Kode BOQ", key: "kode_boq", width: 20 },
    { header: "Barang", key: "nama_barang", width: 40 },
    { header: "Kode Perangkat", key: "kode_perangkat", width: 18 },
    { header: "Gudang", key: "gudang_nama", width: 20 },
    { header: "Satuan", key: "satuan", width: 12 },
    { header: "BOQ", key: "boq", width: 12 },
    { header: "Additional", key: "additional", width: 12 },
    { header: "MOS", key: "mos", width: 12 },
    { header: "Used", key: "used", width: 12 },
    { header: "Remains", key: "remains", width: 12 },
    { header: "Status", key: "status", width: 14 },
  ];

  records.forEach((r) => {
    const boqCodes = (r.boq_list || []).map((b) => b.kode_boq).filter(Boolean).join(", ");
    detailSheet.addRow({
      project_nama: r.project_nama || "-",
      nama_cluster: r.nama_cluster || "-",
      cluster_id: r.cluster_id || "-",
      cluster_type: r.cluster_type || "-",
      project_type: r.project_type || "-",
      alamat_lengkap: r.alamat_lengkap || "-",
      kso_partner: r.kso_partner || "-",
      kso_contact: r.kso_contact || "-",
      no_tiket_release: r.no_tiket_release || "-",
      vendor: r.vendor || "-",
      homepass_plan: r.homepass_plan ?? "-",
      status_aktif: r.status_aktif === true ? "Aktif" : r.status_aktif === false ? "Nonaktif" : "-",
      pic_nama: r.pic_nama || "-",
      kode_tiket: r.kode_tiket,
      kode_boq: boqCodes,
      nama_barang: r.nama_barang,
      kode_perangkat: String(r.kode_perangkat ?? ""),
      gudang_nama: r.gudang_nama || "-",
      satuan: r.satuan,
      boq: r.boq,
      additional: r.additional,
      mos: r.mos,
      used: r.used,
      remains: r.remains,
      status: r.status === "sesuai" ? "Sesuai" : r.status === "perhatian" ? "Perhatian" : r.status,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const d = new Date();
  const tanggal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  link.download = `rekonsiliasi-inventory-${tanggal}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
