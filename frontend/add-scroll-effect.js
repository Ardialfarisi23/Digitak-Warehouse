const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// ADD SCROLL EFFECT AT COMPONENT LEVEL
// ============================================================
const reportsComponentStart = content.indexOf('export default function LaporanAuditPage() {');
if (reportsComponentStart === -1) {
  console.log('ERROR: Reports component not found');
  process.exit(1);
}

const tabStateIdx = content.indexOf('const [tab, setTab] = useState', reportsComponentStart);
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
console.log('Scroll effect added successfully!');