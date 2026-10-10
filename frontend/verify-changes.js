const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

const checks = [
  { name: 'Modal mobile (p-4 sm:p-0)', search: 'p-4 sm:p-0' },
  { name: 'Modal touch-target close', search: 'touch-target' },
  { name: 'Modal aria-label Tutup', search: 'aria-label="Tutup"' },
  { name: 'Modal aria-modal', search: 'aria-modal="true"' },
  { name: 'UploadLogCard component', search: 'function UploadLogCard' },
  { name: 'TabRiwayatInputMitra mobile cards', search: 'mobileCards' },
  { name: 'TabRiwayatInputMitra desktopTable', search: 'desktopTable' },
  { name: 'Tab bar role=tablist', search: 'role="tablist"' },
  { name: 'Tab bar aria-selected', search: 'aria-selected={active}' },
  { name: 'Tab bar aria-controls', search: 'aria-controls=' },
  { name: 'Tab bar scrollIntoView', search: 'scrollIntoView' },
  { name: 'tabRefs callback ref', search: 'tabRefs.current[t.key]' },
  { name: 'Export Audit Log aria-label', search: 'aria-label="Ekspor Audit Log"' },
  { name: 'Export Riwayat Stok aria-label', search: 'aria-label="Ekspor Riwayat Stok"' },
  { name: 'Detail button touch-target (h-10 w-10)', search: 'h-10 w-10' },
];

for (const check of checks) {
  const found = content.includes(check.search);
  console.log(found ? '✅' : '❌', check.name);
}