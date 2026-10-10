const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the ENTIRE tab bar section and replace it completely
const tabBarStart = content.indexOf('<div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100">');
if (tabBarStart === -1) {
  console.log('ERROR: Tab bar not found');
  process.exit(1);
}

// Find the end - need to find the matching </div></div>
let depth = 0;
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
console.log('Old tab bar length:', oldTabBar.length);

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
console.log('Replaced tab bar completely');

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Tab bar fix written!');