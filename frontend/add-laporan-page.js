const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// The file currently ends with TabRiwayatInputMitra at line 2606
// We need to add the LaporanAuditPage component after it

const laporanAuditPage = `
export default function LaporanAuditPage() {
  const [tab, setTab] = useState("audit");
  const { get } = useApi();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["audit", "stok", "reconciliation"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, []);

  const tabs = [
    { key: "audit", label: "Audit Log", icon: FileClock },
    { key: "stok", label: "Riwayat Stok", icon: PackageSearch },
    { key: "reconciliation", label: "Riwayat Input Laporan Mitra", icon: Upload },
  ];

  // Scroll active tab into view
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const activeTab = tabs.find((t) => t.key === tab);
    if (activeTab && tabRefs.current[activeTab.key]) {
      tabRefs.current[activeTab.key]!.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [tab, tabs]);


  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-500">Admin General</div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">Laporan & Audit Menyeluruh</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visibilitas penuh atas seluruh transaksi dan perubahan data di sistem — bersifat read-only, tanpa aksi ubah/hapus.
          </p>
        </div>

        <div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  ref={(el) => { tabRefs.current[t.key] = el; }}
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
        </div>

        <div className="mt-6">
          {tab === "audit" && <TabAuditLog get={get} />}
          {tab === "stok" && <TabRiwayatStok get={get} />}
          {tab === "reconciliation" && <TabRiwayatInputMitra get={get} />}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Data pada halaman ini bersifat append-only dan tidak dapat diubah dari sini, termasuk oleh Admin General.
        </div>
      </div>
    </div>
  );
}
`;

// Find the end of TabRiwayatInputMitra (the last '}' before end of file)
const lastBraceIdx = content.lastIndexOf('\n}');
if (lastBraceIdx !== -1) {
  // Insert after the closing brace
  const newContent = content.slice(0, lastBraceIdx + 2) + '\n' + laporanAuditPage;
  fs.writeFileSync('app/dashboard/reports/page.tsx', newContent);
  console.log('Added LaporanAuditPage component');
} else {
  console.log('Could not find end of file');
}