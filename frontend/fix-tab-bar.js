const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// FIX TAB BAR - Move hooks outside map
// ============================================================
// Find the tab bar with the hooks inside map
const tabBarStart = content.indexOf('<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">\r\n          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">');
if (tabBarStart === -1) {
  console.log('ERROR: Tab bar not found');
  process.exit(1);
}

// Find the end of this tab bar section
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
console.log('Fixed tab bar - removed hooks from inside map');

// Also need to add scrollIntoView logic - we can do this with a useEffect at component level
// Find the Reports component and add the scroll effect there
const reportsComponentStart = content.indexOf('export function Reports() {');
if (reportsComponentStart === -1) {
  console.log('ERROR: Reports component not found');
  process.exit(1);
}

// Find where to add the scroll effect - after the tab state is defined
const tabStateIdx = content.indexOf('const [tab, setTab] = useState<', reportsComponentStart);
if (tabStateIdx === -1) {
  console.log('ERROR: tab state not found');
  process.exit(1);
}

// Find the end of the tab state line
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

// Now update the tab buttons to use the ref object
const tabButtonIdx = content.indexOf('key={t.key}\r\n                  onClick={() => setTab(t.key)}');
if (tabButtonIdx !== -1) {
  // Find the button element start
  const buttonStart = content.lastIndexOf('<button', tabButtonIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  
  // Replace to add ref
  if (!buttonTag.includes('ref={tabRefs.current}')) {
    const newButtonTag = buttonTag.replace('key={t.key}', 'ref={(el) => { tabRefs.current[t.key] = el; }} key={t.key}');
    content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
    console.log('Updated tab buttons with callback refs');
  }
}

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('All tab bar fixes written successfully!');