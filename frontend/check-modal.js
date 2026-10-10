const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Check Modal
const modalIdx = content.indexOf('function Modal({ open, onClose, title, children, className }');
const nextFunc = content.indexOf('\nfunction ', modalIdx + 10);
const modalContent = content.slice(modalIdx, nextFunc);
console.log('Modal:', JSON.stringify(modalContent.slice(0, 300)));
console.log('---');
console.log('Modal end:', JSON.stringify(modalContent.slice(-300)));