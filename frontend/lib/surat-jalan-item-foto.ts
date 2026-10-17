export type SuratJalanItemFoto = {
  // Backend men-serialize BigInt menjadi string (lihat app.js), jadi nomor bisa
  // datang sebagai string maupun number.
  foto_id: number | string;
  url: string;
  filename?: string;
  mimetype?: string;
  ukuran_bytes?: number | string;
};

export type SuratJalanItemForFoto = {
  fotos?: SuratJalanItemFoto[] | null;
  foto_url?: string | null;
};

export function getItemFotoUrls(item: SuratJalanItemForFoto): string[] {
  const urls = new Set<string>();

  for (const f of item.fotos || []) {
    if (f?.url) urls.add(f.url);
  }

  if (item.foto_url) urls.add(item.foto_url);

  return Array.from(urls);
}
