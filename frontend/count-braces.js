const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Count braces, ignoring strings and JSX
let braceCount = 0;
let inString = false;
let stringChar = '';
let inTemplate = false;
let parenCount = 0;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  const next = content[i+1];
  
  if (!inString && !inTemplate && (c === '"' || c === "'")) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if (!inString && !inTemplate && c === '`') {
    inTemplate = true;
  } else if (inTemplate && c === '`' && prev !== '\\') {
    inTemplate = false;
  } else if (!inString && !inTemplate) {
    if (c === '{') {
      // Check if it's JSX expression
      if (next !== '{' && prev !== '<' && prev !== '{') {
        braceCount++;
      }
    }
    if (c === '}') {
      if (prev !== '}' && next !== '}' && prev !== '>') {
        braceCount--;
      }
    }
    if (c === '(') parenCount++;
    if (c === ')') parenCount--;
  }
  
  if (braceCount < 0) {
    console.log('Negative brace count at:', i);
    console.log('Context:', content.slice(Math.max(0, i-50), i+50));
    break;
  }
}

console.log('Final brace count:', braceCount);
console.log('Final paren count:', parenCount);