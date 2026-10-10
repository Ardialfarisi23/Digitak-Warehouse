const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find end of TabRiwayatInputMitra - look for the closing brace at top level
let braceCount = 0;
let inString = false;
let stringChar = '';
let inJsx = false;

// Start from return statement
for (let i = 108069; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString) {
    // Track JSX braces
    if (c === '<' && content[i+1] !== '/' && content[i+1] !== '?') {
      inJsx = true;
    }
    if (c === '>' && inJsx) {
      inJsx = false;
    }
    if (!inJsx) {
      if (c === '{') braceCount++;
      if (c === '}') {
        braceCount--;
        if (braceCount === 0) {
          console.log('Component ends at:', i);
          console.log('Content:', content.slice(i - 50, i + 100));
          break;
        }
      }
    }
  }
}