const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// FIX TAB BAR - Move hooks outside map
// ============================================================
const tabBarStart = content.indexOf('<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">\r\n          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">');
if (tabBarStart === -1) {
  console.log('ERROR: Tab bar not found');
  process.exit(1);
}

// Find the end of this tab bar section (two </div> tags)
let pos = tabBarStart;
let depth = 0;
let inString = false;
let stringChar = '';
for (let i = tabBarStart; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString) {
    if (c === '<' && content.slice(i, i+4) === '<div') depth++;
    if (c === '<' && content.slice(i, i+6) === '</div>') {
      depth--;
      if (depth === 0) {
        pos = i + 6;
        break;
      }
    }
  }
}

const oldTabBar = content.slice(tabBarStart, pos);
console.log('Found tab bar, length:', oldTabBar.length);

const newTabBar = `        <div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">
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
        </div>`;

content = content.slice(0, tabBarStart) + newTabBar + content.slice(pos);
console.log('Fixed tab bar - using callback refs');

// Add scrollIntoView effect at component level - find Reports component and tab state
const reportsComponentStart = content.indexOf('export function Reports() {');
if (reportsComponentStart === -1) {
  console.log('ERROR: Reports component not found');
  process.exit(1);
}

const tabStateIdx = content.indexOf('const [tab, setTab] = useState<', reportsComponentStart);
if (tabStateIdx === -1) {
  console.log('ERROR: tab state not found');
  process.exit(1);
}

const lineEnd = content.indexOf('\n', tabStateIdx);
const insertPos = lineEnd + 1;

const scrollEffect = `  // Scroll active tab into view
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const activeTab = tabs.find((t) => t.key === tab);
    if (activeTab && tabRefs.current[activeTab.key]) {
      tabRefs.current[activeTab.key]!.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [tab]);

`;

content = content.slice(0, insertPos) + scrollEffect + content.slice(insertPos);
console.log('Added scrollIntoView effect at component level');

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('All tab bar fixes written successfully!');