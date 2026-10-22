const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the exact broken empty state in desktop table - it's the one with colSpan={13} followed by more <td> elements
// The structure is: data.length === 0 ? ( <tr>...colSpan={13}...</tr>  <td>...more tds...</tr> ) : ( data.map... )
// We need to close the <tr> after the empty message and remove the orphaned <td> elements

const brokenPattern = `data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={13}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-orange-500 overflow-hidden">
                    {r.kode_tiket || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-700 overflow-hidden">
                    {r.nomor_surat_jalan && r.nomor_surat_jalan !== "-" ? r.nomor_surat_jalan : r.return_transaction_id ? \`Return #\${r.return_transaction_id}\` : "-"}
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        label={r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-"}
                        variant={r.tipe_surat_jalan === "inbound" ? "green" : r.tipe_surat_jalan === "outbound" ? "orange" : "gray"}
                        className="whitespace-nowrap shrink-0"
                      />
                      {r.is_putaway && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0" title={r.jenis_mutasi === "out" ? "Putaway · keluar (Generic)" : r.jenis_mutasi === "in" ? "Putaway · masuk (Zona)" : "Perpindahan Internal (Putaway)"}>{
                          r.jenis_mutasi === "out"
                            ? "Putaway · keluar (Generic)"
                            : r.jenis_mutasi === "in"
                              ? "Putaway · masuk (Zona)"
                              : "Perpindahan Internal (Putaway)"
                        }</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {renderAsal(r)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {renderTujuan(r)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))`;

const fixedPattern = `data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={13}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (`;

if (content.includes(brokenPattern)) {
  content = content.replace(brokenPattern, fixedPattern);
  console.log('Fixed broken empty state in desktop table');
} else {
  console.log('Pattern not found - trying alternative search');
  // Try finding just the key part
  const idx = content.indexOf('Tidak ada pergerakan stok yang cocok dengan filter ini.');
  if (idx !== -1) {
    console.log('Found at:', idx);
    console.log(content.slice(idx, idx + 500));
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');