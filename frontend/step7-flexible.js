const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// 3. UPDATE TAB BAR - scrollIntoView for active tab
// ============================================================
// Use a more flexible search - find the key parts
const tabBarStart = content.indexOf('<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">');
if (tabBarStart === -1) {
  console.log('ERROR: Tab bar start not found');
  process.exit(1);
}

// Find the closing </div> for this section
let braceCount = 0;
let inString = false;
let stringChar = '';
let pos = tabBarStart;
for (let i = tabBarStart; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString) {
    if (c === '<' && content.slice(i, i+6) === '<div') braceCount++;
    if (c === '<' && content.slice(i, i+6) === '</div>') {
      braceCount--;
      if (braceCount === 0) {
        pos = i + 6;
        break;
      }
    }
  }
}

const oldTabBar = content.slice(tabBarStart, pos);
console.log('Found tab bar, length:', oldTabBar.length);
console.log('First 100:', JSON.stringify(oldTabBar.slice(0, 100)));
console.log('Last 100:', JSON.stringify(oldTabBar.slice(-100)));

const newTabBar = `        <div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            const tabRef = useRef<HTMLButtonElement>(null);
            useEffect(() => {
              if (active && tabRef.current) {
                tabRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }
            }, [active]);
            return (
              <button
                ref={tabRef}
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

content = content.slice(0, tabBarStart) + newTabBar + content.slice(pos);
console.log('3. Tab bar updated with scrollIntoView for active tab');

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
// 5. UPDATE DETAIL BUTTONS IN TABLES - touch-target class
// ============================================================
// TabAuditLog detail button
const auditDetailIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}');
if (auditDetailIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', auditDetailIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('5a. TabAuditLog detail button updated with touch-target');
  }
}

// TabRiwayatStok detail button
const stokDetailIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}');
if (stokDetailIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', stokDetailIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('5b. TabRiwayatStok detail button updated with touch-target');
  }
}

// TabRiwayatInputMitra detail button in desktop table
const mitraDetailIdx = content.indexOf('onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}', 50000);
if (mitraDetailIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', mitraDetailIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  if (!buttonTag.includes('touch-target') && !buttonTag.includes('h-10')) {
    const newButtonTag = buttonTag.replace('className="rounded-lg p-1', 'className="inline-flex h-10 w-10 items-center justify-center rounded-lg');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('5c. TabRiwayatInputMitra detail button updated with touch-target');
  }
}

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('All changes written successfully!');