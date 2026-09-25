# PROGRESS PICKING HOOK FIX

## Langkah 1 - Lokasi bug
- File: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx`
- Baris 794: `const zonaNameMap = useMemo(...)` dipanggil DI DALAM callback `.map()` yang me-render tiap item picking
- Ini melanggar Rules of Hooks: hook tidak boleh dipanggil di dalam loop/map/kondisi

## Langkah 2 - Perbaikan
- Pindahkan `zonaNameMap` useMemo ke level teratas komponen (setelah `isDadakanSingleZone`, sebelum useEffect)
- Dalam `.map()` per item, ganti referensi menjadi memakai variabel `zonaNameMap` yang sudah ada di scope komponen
- Tidak ada perubahan backend/schema/migrations/seed

## Langkah 3 - Verifikasi hook lain
- Cek seluruh file: tidak ada useState/useMemo/useEffect/useCallback/useRef lain yang berada di dalam .map(), .filter(), kondisi if, atau fungsi bersarang non-komponen
- Hooks yang ada:
  - `ConfirmModal` dan `OverrideConfirmModal` adalah komponen terpisah, hook di dalamnya valid
  - Semua hook di komponen utama sudah di level teratas
