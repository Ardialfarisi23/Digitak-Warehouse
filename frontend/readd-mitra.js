const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// RE-ADD UploadLogCard component and mobile cards for TabRiwayatInputMitra
// ============================================================
const mitraReturnStart = content.indexOf('  return (\r\n    <div>\r\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">\r\n        Tabel ini menampilkan histori upload laporan mitra. Setiap baris merepresentasikan 1 sesi upload file Excel.\r\n      </div>');

if (mitraReturnStart === -1) {
  console.log('ERROR: TabRiwayatInputMitra return not found');
  process.exit(1);
}

const mitraMobileLogic = `  // Mobile card component
  function UploadLogCard({ row, onClick }: { row: ReconciliationUploadLogEntry; onClick: () => void }) {
    const allSuccess = row.failed_rows === 0 && row.success_rows > 0;
    const hasFailed = row.failed_rows > 0;
    const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-400 truncate">{formatDateTime(row.uploaded_at)}</p>
          </div>
          <div className="shrink-0">
            {overallStatus === "berhasil" && <Badge label="Berhasil" variant="green" className="whitespace-nowrap shrink-0" />}
            {overallStatus === "sebagian_gagal" && <Badge label="Sebagian Gagal" variant="orange" className="whitespace-nowrap shrink-0" />}
            {overallStatus === "draft" && <Badge label="Draft" variant="gray" className="whitespace-nowrap shrink-0" />}
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <p className="font-semibold text-slate-900 line-clamp-2 break-words">{renderFilename(row.filename)}</p>
        </div>

        <div className="mt-2 min-w-0">
          <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate" title={row.uploaded_by_nama}>{row.uploaded_by_nama}</p>
            <Badge label={humanizeValue("user_role", row.uploaded_by_role)} variant="gray" className="whitespace-nowrap shrink-0" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-slate-400">Total</p>
            <p className="font-mono text-slate-900">{row.total_rows}</p>
          </div>
          <div>
            <p className="text-slate-400">Berhasil</p>
            <p className="font-mono text-emerald-600">{row.success_rows}</p>
          </div>
          <div>
            <p className="text-slate-400">Gagal</p>
            <p className="font-mono text-rose-600">{row.failed_rows}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 touch-target"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Lihat detail"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile card list (< md)
  if (loading) {
    return (
      <div className="md:hidden space-y-3" role="status" aria-label="Memuat riwayat upload">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-full mb-2" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-rose-500">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-400">Belum ada riwayat upload laporan mitra.</p>
      </div>
    );
  }

  // Mobile cards
  const mobileCards = (
    <div className="md:hidden space-y-3" role="list" aria-label="Riwayat upload">
      {data.map((r) => (
        <UploadLogCard key={r.upload_id} row={r} onClick={() => setDetailRow(r)} />
      ))}
    </div>
  );

  // Desktop table (md+)
  const desktopTable = (
    <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left text-sm border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-[160px] min-w-[160px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waktu Upload</th>
              <th className="w-[300px] min-w-[300px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nama File</th>
              <th className="w-[240px] min-w-[240px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diunggah Oleh</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Berhasil</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gagal</th>
              <th className="w-[140px] min-w-[140px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
              <th className="w-10 min-w-10 overflow-hidden px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((r) => {
              const allSuccess = r.failed_rows === 0 && r.success_rows > 0;
              const hasFailed = r.failed_rows > 0;
              const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
              return (
                <tr
                  key={r.upload_id}
                  className="group cursor-pointer transition-colors hover:bg-slate-50 min-h-16"
                  onClick={() => setDetailRow(r)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400 overflow-hidden">
                    {formatDateTime(r.uploaded_at)}
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <div className="font-semibold text-slate-900 truncate">{renderFilename(r.filename)}</div>
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <div className="font-semibold text-slate-900 truncate" title={r.uploaded_by_nama}>{r.uploaded_by_nama}</div>
                    <div className="text-xs">
                      <Badge label={humanizeValue("user_role", r.uploaded_by_role)} variant="gray" className="whitespace-nowrap shrink-0" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-slate-600 overflow-hidden">{r.total_rows}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-emerald-600 overflow-hidden">{r.success_rows}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-rose-600 overflow-hidden">{r.failed_rows}</td>
                  <td className="px-6 py-4 overflow-hidden">
                    {overallStatus === "berhasil" && <Badge label="Berhasil" variant="green" className="whitespace-nowrap shrink-0" />}
                    {overallStatus === "sebagian_gagal" && <Badge label="Sebagian Gagal" variant="orange" className="whitespace-nowrap shrink-0" />}
                    {overallStatus === "draft" && <Badge label="Draft" variant="gray" className="whitespace-nowrap shrink-0" />}
                  </td>
                  <td className="px-6 py-4 text-right overflow-hidden">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 touch-target"
                      onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                      aria-label="Lihat detail"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {mobileCards}
      {desktopTable}`;

content = content.slice(0, mitraReturnStart) + mitraMobileLogic + content.slice(mitraReturnStart);
console.log('TabRiwayatInputMitra mobile cards re-added (UploadLogCard, loading/error/empty states, mobileCards, desktopTable)');

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Fixes written!');