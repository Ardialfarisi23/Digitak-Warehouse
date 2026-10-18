const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix the broken ternary in TabRiwayatStok table
// The structure should be:
// loading ? (...) : error ? (...) : data.length === 0 ? (<tr>empty</tr>) : (data.map(...))

const brokenTernary = `              ) : data.length === 0 ? (
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
                ))
              )}`;

const fixedTernary = `              ) : data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={13}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const extraRef = getExtraRef(r);
                  return (
                    <tr
                      key={r.ledger_id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 min-h-16"
                      onClick={() => setDetailTiket(r)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400 overflow-hidden">
                        {formatDateTime(r.waktu_mutasi)}
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
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 touch-target"
                            onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}
                            aria-label="Lihat detail"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                  );
                }))
              )}`;

if (content.includes(brokenTernary)) {
  content = content.replace(brokenTernary, fixedTernary);
  console.log('Fixed broken ternary in TabRiwayatStok table');
} else {
  console.log('Pattern not found - trying alternative');
  // Try to find the key parts
  const idx = content.indexOf('data.length === 0 ? (');
  if (idx !== -1) {
    console.log('Found at:', idx);
    // Find the end of this broken section
    const nextBranch = content.indexOf('))', idx);
    console.log('Next )) at:', nextBranch);
    console.log('Content:', content.slice(idx, nextBranch + 2));
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');