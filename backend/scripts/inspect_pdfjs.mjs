import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
console.log('keys', Object.keys(pdfjs).slice(0, 40));
console.log('has default', Object.prototype.hasOwnProperty.call(pdfjs, 'default'));
console.log('getDocument', typeof pdfjs.getDocument);
