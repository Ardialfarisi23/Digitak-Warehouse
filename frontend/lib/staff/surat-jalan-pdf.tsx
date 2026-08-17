"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { SuratJalan } from "./surat-jalan-store";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#E8632C",
    paddingBottom: 16,
    marginBottom: 20,
  },
  logo: { width: 140, height: 50, objectFit: "contain", resizeMode: "contain" },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 20, fontWeight: 700, color: "#1f2937" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  companyBlock: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  companyName: { fontSize: 11, fontWeight: 700, color: "#E8632C" },
  companyInfo: { fontSize: 8, color: "#6b7280", textAlign: "right" },
  infoGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  infoCol: { width: "48%" },
  infoRow: { flexDirection: "row", marginBottom: 8 },
  infoLabel: { width: 110, color: "#6b7280", fontSize: 9 },
  infoColon: { width: 8, color: "#6b7280" },
  infoValue: { flex: 1, fontWeight: 700, fontSize: 10 },
  table: { borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 40 },
  tableRow: { flexDirection: "row" },
  tableHeaderCell: {
    backgroundColor: "#FFF7ED",
    padding: 8,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightColor: "#F3D9C7",
    borderBottomWidth: 1,
    borderBottomColor: "#F3D9C7",
    fontSize: 9,
    color: "#9a3412",
  },
  tableCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    fontSize: 10,
  },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signCol: { width: "30%", alignItems: "center" },
  signLabel: { marginBottom: 60, fontSize: 10, color: "#374151", fontWeight: 600 },
  signLine: { borderTopWidth: 1, borderTopColor: "#9ca3af", paddingTop: 6, width: "100%", alignItems: "center" },
  signName: { fontSize: 10, fontWeight: 700, color: "#111827" },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
  },
});

const COLS = [
  { key: "no", label: "No", width: 30 },
  { key: "kode", label: "Kode Barang", width: 100 },
  { key: "nama", label: "Nama Barang", width: 180 },
  { key: "qty", label: "QTY", width: 45 },
  { key: "uom", label: "UOM", width: 55 },
  { key: "ket", label: "Keterangan", width: 105 },
];

export function SuratJalanPdfDocument({
  data,
  materialHandlerName,
}: {
  data: SuratJalan;
  materialHandlerName: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header dengan logo dan judul */}
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/logo digitak grdasi.png" style={styles.logo} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>SURAT JALAN</Text>
            <Text style={styles.subtitle}>Surat Jalan Internal — Digitak Studio</Text>
            <View style={styles.companyBlock}>
            <Text style={styles.companyName}>PT Metanouva Informatika</Text>
            <Text style={styles.companyInfo}>Digitak Studio</Text>
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No Surat Jalan</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.nomor}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tujuan</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.tujuan}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.projectName || "-"}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.tanggal}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama PIC Pemohon</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.namaPicPemohon}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kendaraan</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.kendaraan}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No Polisi</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.noPolisi}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Driver</Text>
              <Text style={styles.infoColon}>:</Text>
              <Text style={styles.infoValue}>{data.namaDriver}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            {COLS.map((c) => (
              <Text key={c.key} style={[styles.tableHeaderCell, { width: c.width }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {data.items.map((item, i) => (
            <View style={styles.tableRow} key={item.kodeBarang}>
              <Text style={[styles.tableCell, { width: COLS[0].width }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: COLS[1].width }]}>{item.kodeBarang}</Text>
              <Text style={[styles.tableCell, { width: COLS[2].width }]}>{item.namaBarang}</Text>
              <Text style={[styles.tableCell, { width: COLS[3].width, textAlign: "center" }]}>
                {item.qty}
              </Text>
              <Text style={[styles.tableCell, { width: COLS[4].width, textAlign: "center" }]}>
                {item.uom}
              </Text>
              <Text style={[styles.tableCell, { width: COLS[5].width }]}>
                {item.keterangan || ""}
              </Text>
            </View>
          ))}
        </View>

        {/* Tanda tangan */}
        <View style={styles.signRow}>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Material Handler</Text>
            <View style={styles.signLine}>
              <Text style={styles.signName}>{materialHandlerName}</Text>
            </View>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Driver</Text>
            <View style={styles.signLine}>
              <Text style={styles.signName}>{data.namaDriver}</Text>
            </View>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>PIC Pemohon (Penerima)</Text>
            <View style={styles.signLine}>
              <Text style={styles.signName}>{data.namaPicPemohon}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Dokumen ini digenerate secara otomatis oleh sistem Digitak Studio.</Text>
          <Text>{data.nomor} | {data.tanggal}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Generate PDF di browser lalu trigger download langsung (bukan print dialog). */
export async function downloadSuratJalanPdf(
  data: SuratJalan,
  materialHandlerName: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <SuratJalanPdfDocument data={data} materialHandlerName={materialHandlerName} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.nomor.replace(/\//g, "-")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}