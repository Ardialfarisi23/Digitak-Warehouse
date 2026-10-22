const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// FIX: Move scroll effect AFTER tabs declaration
// ============================================================
// First, remove the incorrectly placed scroll effect
const badEffectStart = content.indexOf('  // Scroll active tab into view');
if (badEffectStart !== -1) {
  const badEffectEnd = content.indexOf('\n\n', badEffectStart);
  if (badEffectEnd !== -1) {
    content = content.slice(0, badEffectStart) + content.slice(badEffectEnd + 2);
    console.log('Removed misplaced scroll effect');
  }
}

// Now find the tabs array and add scroll effect AFTER it
const tabsArrayIdx = content.indexOf('  const tabs = [');
if (tabsArrayIdx === -1) {
  console.log('ERROR: tabs array not found');
  process.exit(1);
}

// Find the end of the tabs array
let braceCount = 0;
let inString = false;
let stringChar = '';
let tabsEnd = tabsArrayIdx;
for (let i = tabsArrayIdx; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString) {
    if (c === '[') braceCount++;
    if (c === ']') {
      braceCount--;
      if (braceCount === 0) {
        tabsEnd = i + 1;
        break;
      }
    }
  }
}

// Find the next line after tabs array
const nextLine = content.indexOf('\n', tabsEnd);
const insertPos = nextLine + 1;

const scrollEffect = `
  // Scroll active tab into view
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const activeTab = tabs.find((t) => t.key === tab);
    if (activeTab && tabRefs.current[activeTab.key]) {
      tabRefs.current[activeTab.key]!.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [tab, tabs]);

`;

content = content.slice(0, insertPos) + scrollEffect + content.slice(insertPos);
console.log('Added scroll effect after tabs declaration');

// ============================================================
// VERIFY TAB BAR USES CALLBACK REFS
// ============================================================
const tabBarIdx = content.indexOf('ref={(el) => { tabRefs.current[t.key] = el; }}');
if (tabBarIdx === -1) {
  console.log('WARNING: Tab bar may not have callback refs');
} else {
  console.log('Tab bar has callback refs');
}

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Fixes written successfully!');