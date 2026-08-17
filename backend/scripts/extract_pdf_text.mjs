import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let text = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    text += strings.join(' ') + '\n\n';
  }

  return text;
}

(async () => {
  try {
    const filePath = path.resolve('docs', 'Master Data digitak gudang.pdf');
    const text = await extractText(filePath);
    fs.writeFileSync(path.resolve('docs', 'pdf_text_extracted.txt'), text, 'utf8');
    console.log(text.slice(0, 4000));
    console.log('\n--- extracted text saved to docs/pdf_text_extracted.txt ---');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
