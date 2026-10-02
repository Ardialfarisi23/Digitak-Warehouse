"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();

interface PdfViewerProps {
  url: string;
}

export default function PdfViewerComponent({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);

  return (
    <div className="flex-1 w-full h-full bg-white rounded-xl overflow-hidden border border-slate-100 flex justify-center items-start">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div className="p-4 text-xs text-slate-500">Memuat PDF...</div>}
        error={<div className="p-4 text-xs text-red-500">Gagal memuat PDF.</div>}
        className="flex justify-center w-full"
      >
        {Array.from(new Array(numPages), (_el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} width={680} renderAnnotationLayer={false} renderTextLayer={false} className="mb-4 bg-white max-w-full" />
        ))}
      </Document>
    </div>
  );
}
