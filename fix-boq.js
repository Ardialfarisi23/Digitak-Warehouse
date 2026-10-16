
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'app', 'dashboard', 'boq', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
// Replace literal \\r\\n with actual newline
content = content.replace(/\\r\\n/g, '\n');
// Fix EMPTY_CLUSTER_FORM: replace semicolons between properties with commas
const emptyClusterFormMatch = content.match(/const EMPTY_CLUSTER_FORM: ClusterForm = \{[\s\S]*?\}/);
if (emptyClusterFormMatch) {
  let objText = emptyClusterFormMatch[0];
  objText = objText.replace(/;/g, ',');
  objText = objText.replace(/,\s*\}/g, '}');
  content = content.replace(emptyClusterFormMatch[0], objText);
}
// Remove leftover code after handleCreateCluster function and trailing whitespace
content = content.trimEnd() + '\n';
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed');

