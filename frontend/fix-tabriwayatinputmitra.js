const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the duplicate return in the full file
const mitraStart = content.indexOf('function TabRiwayatInputMitra({ get }: { get: (url: string) => Promise<Response> }) {');
const mitraEnd = content.indexOf('\nexport default function LaporanAuditPage() {');
const mitraContent = content.slice(mitraStart, mitraEnd);

// The duplicate return is at position 112091 in mitraContent
const dupStartInMitra = 112091;
const dupStartInFile = mitraStart + dupStartInMitra;

console.log('Duplicate return starts at file position:', dupStartInFile);

// Find the function end by counting braces from the function start
let braceCount = 0;
let inString = false;
let stringChar = '';
let funcEndInFile = -1;

for (let i = mitraStart; i < mitraEnd; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString) {
    if (c === '{') braceCount++;
    if (c === '}') {
      braceCount--;
      if (braceCount === 0) {
        funcEndInFile = i;
        break;
      }
    }
  }
}

console.log('Function ends at:', funcEndInFile);

// Now find the duplicate return start in the full file
const dupStart = content.indexOf('  return (\n    <div>\n      {mobileCards}\n      {desktopTable}\n    <div>\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">', mitraStart);

if (dupStart !== -1) {
  console.log('Duplicate return found at:', dupStart);
  
  // The correct return should replace from dupStart to funcEndInFile
  const oldCode = content.slice(dupStart, funcEndInFile + 1);
  console.log('Old code length:', oldCode.length);
  console.log('Old code end:', oldCode.slice(-300));
  
  // New code: proper return with filter UI, mobileCards, desktopTable, Modal
  const newCode = `  return (
    <div>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari nama file atau pengguna…"
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        <div>
          <select
            value={actorId}
            onChange={(e) => { setActorId(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua pengguna</option>
            {actors.map((a) => (
              <option key={a.user_id} value={String(a.user_id)}>{a.nama}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>
      </div>

      {mobileCards}
      {desktopTable}

      {detailRow && (
        <Modal
          open={!!detailRow}
          onClose={() => setDetailRow(null)}
          title="Detail Upload Laporan Mitra"
          className="max-w-3xl"
        >
          {detailRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Nama File</p>
                  <div className="text-sm font-semibold text-slate-800">{renderFilename(detailRow.filename)}</div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Waktu Upload</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailRow.uploaded_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
                  <p className="text-sm font-semibold text-slate-800">{detailRow.uploaded_by_nama}</p>
                  {detailRow.uploaded_by_role && (
                    <div className="mt-1">
                      <Badge label={humanizeValue("user_role", detailRow.uploaded_by_role)} variant="gray" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total / Berhasil / Gagal</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {detailRow.total_rows} / {detailRow.success_rows} / {detailRow.failed_rows}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-3">Detail Baris</p>
                {detailRow.details && detailRow.details.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Used</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kondisi</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan Gagal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailRow.details.map((d) => {
                          const hasDetail = d.nama_barang || d.kode_barang || d.project_nama || d.pic_mitra || d.tanggal_laporan || d.catatan;
                          const formatDate = (iso?: string | null) => {
                            if (!iso) return null;
                            const date = new Date(iso);
                            if (Number.isNaN(date.getTime())) return null;
                            return date.toLocaleDateString("id-ID", { dateStyle: "medium" });
                          };
                          const parts = hasDetail
                            ? [
                                d.nama_barang ? <span key="nama">Nama: <span className="font-semibold">{d.nama_barang}</span></span> : null,
                                d.kode_barang ? <span key="kode"><code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">{d.kode_barang}</code></span> : null,
                                d.project_nama ? <span key="project">Project: <span className="font-semibold">{d.project_nama}</span></span> : null,
                                d.pic_mitra ? <span key="pic">PIC: <span className="font-semibold">{d.pic_mitra}</span></span> : null,
                                d.tanggal_laporan ? <span key="tgl">Tgl: <span className="font-semibold">{formatDate(d.tanggal_laporan)}</span></span> : null,
                                d.catatan ? <span key="catatan">Catatan: <span className="font-semibold">{d.catatan}</span></span> : null,
                              ].filter(Boolean)
                            : [];
                          return (
                            <Fragment key={d.detail_id}>
                              <tr className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.kode_tiket}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{d.used}</td>
                                <td className="px-3 py-2">
                                  {d.kondisi ? (
                                    <KondisiBadge value={d.kondisi} />
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{statusBadge(d.status || "-")}</td>
                                <td className="px-3 py-2 text-slate-500">{d.reason || "-"}</td>
                              </tr>
                              {parts.length > 0 && (
                                <tr className="bg-slate-50/60">
                                  <td colSpan={5} className="px-3 py-1.5 text-[11px] text-slate-500">
                                    {parts.map((part, idx) => (
                                      <span key={idx} className="mr-3">{part}</span>
                                    ))}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Tidak ada detail baris untuk upload ini.</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
`;
  
  if (content.slice(dupStart, funcEndInFile + 1) === oldCode) {
    content = content.slice(0, dupStart) + newCode + content.slice(funcEndInFile + 1);
    console.log('Replaced duplicate return with proper return');
  } else {
    console.log('Content mismatch - manual intervention needed');
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');