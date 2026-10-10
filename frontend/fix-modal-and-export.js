const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// FIX MODAL - Mobile friendly
// ============================================================
const modalStart = content.indexOf('function Modal({ open, onClose, title, children, className }');
const nextFunc = content.indexOf('\nfunction ', modalStart + 10);
const oldModal = content.slice(modalStart, nextFunc);

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

if (!content.includes(oldModal)) {
  console.log('ERROR: Old Modal not found');
  process.exit(1);
}
content = content.replace(oldModal, newModal);
console.log('1. Modal component updated for mobile');

// ============================================================
// FIX EXPORT RIWAYAT STOK aria-label
// ============================================================
const exportStokIdx = content.indexOf('onClick={handleExportRiwayatStok}');
if (exportStokIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', exportStokIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('aria-label')) {
    const newButtonTag = buttonTag.replace('className="w-full', 'aria-label="Ekspor Riwayat Stok" className="w-full');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('2. TabRiwayatStok export button aria-label added');
  } else {
    console.log('2. TabRiwayatStok export button already has aria-label');
  }
}

// ============================================================
// VERIFY UploadLogCard component exists
// ============================================================
const uploadLogCardIdx = content.indexOf('function UploadLogCard');
if (uploadLogCardIdx === -1) {
  console.log('3. WARNING: UploadLogCard component NOT FOUND - need to re-add');
} else {
  console.log('3. UploadLogCard component found');
}

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Fixes written!');