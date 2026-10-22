const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// 1. UPDATE MODAL COMPONENT FOR MOBILE FRIENDLINESS
// ============================================================
// Read the exact old modal content
const modalStart = content.indexOf('function Modal({ open, onClose, title, children, className }');
const modalEnd = content.indexOf('}', modalStart) + 1;
// Find the closing brace of the function
let braceCount = 0;
let modalEndPos = modalStart;
for (let i = modalStart; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      modalEndPos = i + 1;
      break;
    }
  }
}
const oldModal = content.slice(modalStart, modalEndPos);
console.log('Found Modal, length:', oldModal.length);

const newModal = `function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sm:p-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={\`w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl \${className || ""}\`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 touch-target"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}`;

content = content.slice(0, modalStart) + newModal + content.slice(modalEndPos);
console.log('1. Modal component updated for mobile');

// ============================================================
// 2. ADD MOBILE CARD FOR TabRiwayatInputMitra
// ============================================================
const mitraReturnMarker = `  return (
    <div>
      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
        Tabel ini menampilkan histori upload laporan mitra. Setiap baris merepresentasikan 1 sesi upload file Excel.
      </div>`;

const mitraIdx = content.indexOf(mitraReturnMarker);
if (mitraIdx === -1) {
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
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                    >
                      <Eye size={16} />
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

content = content.slice(0, mitraIdx) + mitraMobileLogic + content.slice(mitraIdx + mitraReturnMarker.length);
console.log('2. TabRiwayatInputMitra mobile cards added');

// ============================================================
// 3. UPDATE TAB BAR FOR SCROLL INTO VIEW
// ============================================================
// Find the tab bar
const tabBarStart = content.indexOf('<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">');
if (tabBarStart === -1) {
  console.log('ERROR: Tab bar not found');
  process.exit(1);
}

// Find the end of the tab bar div
let tbBraceCount = 0;
let tabBarEndPos = tabBarStart;
for (let i = tabBarStart; i < content.length; i++) {
  if (content[i] === '<' && content[i+1] !== '/') {
    // Check if it's a closing div
    const tagEnd = content.indexOf('>', i);
    const tag = content.slice(i, tagEnd + 1);
    if (tag.startsWith('</div>')) {
      if (tbBraceCount === 0) {
        tabBarEndPos = tagEnd + 1;
        break;
      } else {
        tbBraceCount--;
      }
    } else if (tag.startsWith('<div')) {
      tbBraceCount++;
    }
  }
}

const oldTabBar = content.slice(tabBarStart, tabBarEndPos);
console.log('Found tab bar, length:', oldTabBar.length);

const newTabBar = `<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            const ref = useRef<HTMLButtonElement>(null);
            useEffect(() => {
              if (active && ref.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }
            }, [active]);
            return (
              <button
                ref={ref}
                key={t.key}
                onClick={() => setTab(t.key)}
                role="tab"
                aria-selected={active}
                aria-controls={\`panel-\${t.key}\`}
                id={\`tab-\${t.key}\`}
                className={\`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors \$\{
                  active ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }\`}>
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
          </div>
        </div>`;

content = content.slice(0, tabBarStart) + newTabBar + content.slice(tabBarEndPos);
console.log('3. Tab bar updated with scrollIntoView');

// ============================================================
// 4. ADD aria-label TO EXPORT BUTTONS
// ============================================================
// TabAuditLog export button
const exportAuditIdx = content.indexOf('onClick={handleExportAuditLog}');
if (exportAuditIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', exportAuditIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('aria-label')) {
    const newButtonTag = buttonTag.replace('className="w-full', 'aria-label="Ekspor Audit Log" className="w-full');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('4a. TabAuditLog export button aria-label added');
  }
}

// TabRiwayatStok export button
const exportStokIdx = content.indexOf('onClick={handleExportRiwayatStok}');
if (exportStokIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', exportStokIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('aria-label')) {
    const newButtonTag = buttonTag.replace('className="w-full', 'aria-label="Ekspor Riwayat Stok" className="w-full');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('4b. TabRiwayatStok export button aria-label added');
  }
}

// ============================================================
// 5. UPDATE TabRiwayatStok DETAIL MODAL - ensure close button has proper size
// The Modal component update handles this, but the detail button in table rows needs touch-target
// Update the detail button in TabRiwayatStok table
const stokDetailBtnIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}', 30000);
if (stokDetailBtnIdx !== -1) {
  // Find the button tag
  const buttonStart = content.lastIndexOf('<button', stokDetailBtnIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('5. TabRiwayatStok detail button updated for touch target');
  }
}

// ============================================================
// 6. UPDATE TabRiwayatInputMitra DETAIL BUTTON IN TABLE
// ============================================================
const mitraDetailBtnIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}', 45000);
if (mitraDetailBtnIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', mitraDetailBtnIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('6. TabRiwayatInputMitra detail button updated for touch target');
  }
}

// ============================================================
// 7. UPDATE TabAuditLog DETAIL BUTTON IN TABLE
// ============================================================
const auditDetailBtnIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}', 20000);
if (auditDetailBtnIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', auditDetailBtnIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('7. TabAuditLog detail button updated for touch target');
  }
}

// ============================================================
// 8. UPDATE TabRiwayatInputMitra DETAIL MODAL - ensure all fields shown
// The modal already has all fields. Just need to make sure the close button is accessible (done via Modal)

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('All changes written successfully!');