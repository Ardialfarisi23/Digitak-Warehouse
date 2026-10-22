const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// ============================================================
// FIX TAB BAR - Add callback refs
// ============================================================
const tabBarStart = content.indexOf('<button\n                  key={t.key}\n                  onClick={() => setTab(t.key)}');
if (tabBarStart === -1) {
  console.log('ERROR: Tab button not found');
  process.exit(1);
}

// Find the end of the button opening tag
const buttonEnd = content.indexOf('>', tabBarStart);
const buttonTag = content.slice(tabBarStart, buttonEnd + 1);
console.log('Current button tag:', JSON.stringify(buttonTag));

// Add ref if not present
if (!buttonTag.includes('ref=')) {
  const newButtonTag = buttonTag.replace('<button\n                  key=', '<button\n                  ref={(el) => { tabRefs.current[t.key] = el; }}\n                  key=');
  content = content.slice(0, tabBarStart) + newButtonTag + content.slice(buttonEnd + 1);
  console.log('Added callback ref to tab buttons');
} else {
  console.log('Tab button already has ref');
}

// Write the updated file
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Tab bar fix written!');