# LAPORAN DRY-RUN IMPORT BOQ EXCEL

**Generated:** 2026-10-09T03:56:04.501Z
**File:** D:\Project\digitak-warehouse\data import.xlsx
**Sheet:** Rekap BoQ Periode 2026
**User ID:** 1

## 1. RINGKASAN

| Metrik | Jumlah |
|--------|--------|
| Project akan dibuat | 1 |
| Cluster akan dibuat | 13 |
| BOQ akan dibuat | 12 |
| BOQ Item akan dibuat | 347 |
| Dilewati (sudah ada) | 0 |
| BLOCKER | 0 |
| Peringatan | 31 |

### Estimasi hitungan tabel setelah import:

| Tabel | Sebelum | Akan dibuat | Estimasi setelah |
|-------|---------|-------------|------------------|
| project | 11 | 1 | 12 |
| cluster | 13 | 13 | 26 |
| tiket_material | 20 | 0 | 20 |
| boq | 16 | 12 | 28 |
| boq_item | 64 | 347 | 411 |

## 2. PROJECT

| Field | Nilai |
|-------|-------|
| nama_project | FTTH-OPEN-AREA RANCAMANYAR |
| title | FTTH-OPEN-AREA RANCAMANYAR |
| area | Rancamanyar |
| kota_kabupaten | Kabupaten Bandung |
| kecamatan | Baleendah |
| desa_kelurahan | Rancamanyar |
| provinsi | Jawa Barat |
| klien | null |
| status_aktif | true |
| created_by | 1 |
| action | create |

## 3. CLUSTER DETAIL (13 cluster)

### Cluster NET-H-004396 — FTTH Open Area Rancamanyar RW 01

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004396 |
| nama_cluster | FTTH Open Area Rancamanyar RW 01 |
| homepass_plan | 353 |
| no_tiket_release | NULL |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 1.526 |
| Additional | 2 |
| MOS | 1.700 |
| Used | 15 |
| Remains (calc) | 172 |

Items: **29 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 9 | 2 | 9 | 15 | -2 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 28 | NULL | 28 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 907 | NULL | 907 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 4 | NULL | 4 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 37 | NULL | 37 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 42 | NULL | 42 | NULL | 0 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | NULL | NULL | -3 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | 3 | NULL | 0 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 7 | NULL | 7 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 10 | NULL | 10 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 4 | NULL | 4 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | 3 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 4 | NULL | 4 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 4 | NULL | 4 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 3 | NULL | 3 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 3 | NULL | 3 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 9 | NULL | 9 | NULL | 0 |
| 39 | 01-013-03083 | MUR + BAUT STENLIS M08 - 1.25 X 80 | 8 | NULL | 8 | NULL | 0 |
| ... | (9 item lainnya) | | | | | | |

### Cluster NET-H-004397 — FTTH Open Area Rancamanyar RW 02

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004397 |
| nama_cluster | FTTH Open Area Rancamanyar RW 02 |
| homepass_plan | 861 |
| no_tiket_release | UR10074 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 3.123 |
| Additional | 0 |
| MOS | 3.282 |
| Used | 0 |
| Remains (calc) | 159 |

Items: **31 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 27 | NULL | 27 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 52 | NULL | 52 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 1.557 | NULL | 1.557 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 140 | NULL | 140 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 10 | NULL | 10 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 79 | NULL | 79 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 66 | NULL | 66 | NULL | 0 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | NULL | NULL | -1 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 9 | NULL | NULL | NULL | -9 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 18 | NULL | 18 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 23 | NULL | 23 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 12 | NULL | 12 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 5 | NULL | 5 | NULL | 0 |
| 32 | CBL-00231 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | 1 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 17 | NULL | 17 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 10 | NULL | 10 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 4 | NULL | 4 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 4 | NULL | 4 | NULL | 0 |
| ... | (11 item lainnya) | | | | | | |

### Cluster NET-H-004938 — FTTH Open Area Rancamanyar RW 03

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004938 |
| nama_cluster | FTTH Open Area Rancamanyar RW 03 |
| homepass_plan | 1.220 |
| no_tiket_release | UR10468 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 4.330 |
| Additional | 0 |
| MOS | 4.470 |
| Used | 0 |
| Remains (calc) | 140 |

Items: **30 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 20 | NULL | 20 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 89 | NULL | 89 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | NULL | NULL | 1 | NULL | 1 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 4 | NULL | 4 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 785 | NULL | 785 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 1.518 | NULL | 1.518 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 14 | NULL | 14 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 109 | NULL | 109 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 118 | NULL | 118 | NULL | 0 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 10 | NULL | NULL | NULL | -10 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 20 | NULL | NULL | NULL | -20 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 33 | NULL | 33 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 22 | NULL | 22 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | 11 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | 3 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 15 | NULL | 15 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 14 | NULL | 14 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 3 | NULL | 3 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 3 | NULL | 3 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 9 | NULL | 9 | NULL | 0 |
| ... | (10 item lainnya) | | | | | | |

### Cluster NET-H-004399 — FTTH Open Area Rancamanyar RW 04

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004399 |
| nama_cluster | FTTH Open Area Rancamanyar RW 04 |
| homepass_plan | 455 |
| no_tiket_release | UR10558 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 1.937 |
| Additional | 0 |
| MOS | 2.099 |
| Used | 0 |
| Remains (calc) | 162 |

Items: **30 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 21 | NULL | 21 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 34 | NULL | 34 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 852 | NULL | 852 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 197 | NULL | 197 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 6 | NULL | 6 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 55 | NULL | 55 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 118 | NULL | 118 | NULL | 0 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | NULL | NULL | -1 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 6 | NULL | NULL | NULL | -6 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | 11 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 9 | NULL | 9 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 7 | NULL | 7 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 13 | NULL | 13 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 6 | NULL | 6 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 3 | NULL | 3 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 3 | NULL | 3 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 9 | NULL | 9 | NULL | 0 |
| ... | (10 item lainnya) | | | | | | |

### Cluster NET-H-004400 — FTTH Open Area Rancamanyar RW 05

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004400 |
| nama_cluster | FTTH Open Area Rancamanyar RW 05 |
| homepass_plan | 400 |
| no_tiket_release | UR08988 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 1.696 |
| Additional | 4 |
| MOS | 1.824 |
| Used | 0 |
| Remains (calc) | 124 |

Items: **29 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 5 | NULL | 5 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 44 | NULL | 44 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 990 | NULL | 990 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 5 | NULL | 5 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 49 | NULL | 49 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 42 | NULL | 36 | NULL | -6 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 6 | NULL | NULL | NULL | -6 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 8 | NULL | 8 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 10 | NULL | 10 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 4 | NULL | 4 | NULL | 0 |
| 32 | CBL-00231 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | 2 | NULL | 1 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 5 | NULL | 5 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 2 | NULL | 2 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 2 | NULL | 2 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 6 | NULL | 6 | NULL | 0 |
| 39 | 01-013-03083 | MUR + BAUT STENLIS M08 - 1.25 X 80 | 10 | NULL | 10 | NULL | 0 |
| 40 | GT0000100 | ODP Boxes 16 port with 1:8 PLC Splitter  | 5 | NULL | 5 | NULL | 0 |
| ... | (9 item lainnya) | | | | | | |

### Cluster NET-H-004401 — FTTH Open Area Rancamanyar RW 06

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004401 |
| nama_cluster | FTTH Open Area Rancamanyar RW 06 |
| homepass_plan | 413 |
| no_tiket_release | UR09954 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 1.571 |
| Additional | 0 |
| MOS | 1.687 |
| Used | 0 |
| Remains (calc) | 116 |

Items: **27 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 19 | NULL | 19 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 35 | NULL | 35 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 827 | NULL | 827 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 5 | NULL | 5 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 54 | NULL | 54 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 42 | NULL | NULL | NULL | -42 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | NULL | NULL | -11 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 10 | NULL | 10 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 10 | NULL | 10 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 32 | CBL-00231 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | 1 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 9 | NULL | 9 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 5 | NULL | 5 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 3 | NULL | 3 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 3 | NULL | 3 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 9 | NULL | 9 | NULL | 0 |
| 39 | 01-013-03083 | MUR + BAUT STENLIS M08 - 1.25 X 80 | 10 | NULL | 10 | NULL | 0 |
| 40 | GT0000100 | ODP Boxes 16 port with 1:8 PLC Splitter  | 5 | NULL | 5 | NULL | 0 |
| 41 | GT0000201M | Outdoor Connector with SC/UPC adapter, m | 75 | NULL | 75 | NULL | 0 |
| ... | (7 item lainnya) | | | | | | |

### Cluster NET-H-004402 — FTTH Open Area Rancamanyar RW 07

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004402 |
| nama_cluster | FTTH Open Area Rancamanyar RW 07 |
| homepass_plan | 589 |
| no_tiket_release | UR09786 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 2.263 |
| Additional | 0 |
| MOS | 2.344 |
| Used | 0 |
| Remains (calc) | 81 |

Items: **30 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 19 | NULL | 19 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 53 | NULL | 53 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | NULL | NULL | 1 | NULL | 1 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 2 | NULL | 2 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 958 | NULL | 958 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 270 | NULL | 270 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 7 | NULL | 7 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 72 | NULL | 72 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 54 | NULL | NULL | NULL | -54 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | NULL | NULL | -1 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | NULL | NULL | -11 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 12 | NULL | 12 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | 11 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 11 | NULL | 11 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | 3 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 10 | NULL | 10 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 7 | NULL | 7 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 3 | NULL | 3 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 3 | NULL | 3 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 9 | NULL | 9 | NULL | 0 |
| ... | (10 item lainnya) | | | | | | |

### Cluster NET-H-004404 — FTTH Open Area Rancamanyar RW 09

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004404 |
| nama_cluster | FTTH Open Area Rancamanyar RW 09 |
| homepass_plan | 555 |
| no_tiket_release | UR09788 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 1.891 |
| Additional | 0 |
| MOS | 1.904 |
| Used | 0 |
| Remains (calc) | 13 |

Items: **30 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 3 | NULL | 3 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 56 | NULL | 56 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 702 | NULL | 702 | NULL | 0 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 267 | NULL | 267 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 6 | NULL | 6 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 59 | NULL | 59 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 44 | NULL | NULL | NULL | -44 |
| 26 | CBL-00215 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 3 | NULL | NULL | NULL | -3 |
| 27 | CBL-00225 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 14 | NULL | NULL | NULL | -14 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 8 | NULL | 8 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 13 | NULL | 13 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 5 | NULL | 5 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 1 | NULL | 1 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 6 | NULL | 6 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 2 | NULL | 2 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 2 | NULL | 2 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 6 | NULL | 6 | NULL | 0 |
| ... | (10 item lainnya) | | | | | | |

### Cluster NET-H-004405 — FTTH Open Area Rancamanyar RW 10

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004405 |
| nama_cluster | FTTH Open Area Rancamanyar RW 10 |
| homepass_plan | 740 |
| no_tiket_release | UR12267 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 3.179 |
| Additional | 0 |
| MOS | 2.774 |
| Used | 0 |
| Remains (calc) | -405 |

Items: **27 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 50 | NULL | 50 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 37 | NULL | 37 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 2 | NULL | 2 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 481 | NULL | NULL | NULL | -481 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 1.289 | NULL | 1.289 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 10 | NULL | 10 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 87 | NULL | 87 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 82 | NULL | NULL | NULL | -82 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 44 | NULL | 44 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 16 | NULL | 16 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 5 | NULL | 5 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 31 | NULL | 31 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 10 | NULL | 10 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 4 | NULL | 4 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 4 | NULL | 4 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 12 | NULL | 12 | NULL | 0 |
| 39 | 01-013-03083 | MUR + BAUT STENLIS M08 - 1.25 X 80 | 20 | NULL | 20 | NULL | 0 |
| 40 | GT0000100 | ODP Boxes 16 port with 1:8 PLC Splitter  | 10 | NULL | 10 | NULL | 0 |
| 41 | GT0000201M | Outdoor Connector with SC/UPC adapter, m | 147 | NULL | 136 | NULL | -11 |
| ... | (7 item lainnya) | | | | | | |

### Cluster NET-H-004406 — FTTH Open Area Rancamanyar RW 11

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004406 |
| nama_cluster | FTTH Open Area Rancamanyar RW 11 |
| homepass_plan | 570 |
| no_tiket_release | UR11024 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 2.568 |
| Additional | 0 |
| MOS | 2.638 |
| Used | 0 |
| Remains (calc) | 70 |

Items: **30 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 24 | NULL | 24 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 41 | NULL | 41 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 718 | NULL | NULL | NULL | -718 |
| 15 | [01-013-00406] | KABEL FO 48 CORE- 8 T 2023 | NULL | NULL | 498 | NULL | 498 |
| 16 | [01-013-00344] | KABEL FO 48 CORE- 4 T 2023 | NULL | NULL | 300 | NULL | 300 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 791 | NULL | 791 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 8 | NULL | 8 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 65 | NULL | 65 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 66 | NULL | NULL | NULL | -66 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 26 | NULL | 26 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 14 | NULL | 14 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 7 | NULL | 7 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 15 | NULL | 15 | NULL | 0 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 8 | NULL | 8 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 5 | NULL | 5 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 5 | NULL | 5 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 15 | NULL | 15 | NULL | 0 |
| ... | (10 item lainnya) | | | | | | |

### Cluster NET-H-004409 — FTTH Open Area Rancamanyar RW 14

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004409 |
| nama_cluster | FTTH Open Area Rancamanyar RW 14 |
| homepass_plan | 1.722 |
| no_tiket_release | UR12741 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 8.125 |
| Additional | 0 |
| MOS | 5.095 |
| Used | 0 |
| Remains (calc) | -3.030 |

Items: **29 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 120 | NULL | 120 | NULL | 0 |
| 10 | [01-013-13104] | TIANG 6 METER - 2" OD.57 X 1.5 X 6000 | 56 | NULL | 56 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 1 | NULL | 1 | NULL | 0 |
| 12 | NWK-00466 | CLOSURE DACK 144 CORE FIBERTRON (LOGO) | 5 | NULL | 5 | NULL | 0 |
| 14 | CBL-00043 | KABEL FO 48 CORE ZTT 2024 | 2.642 | NULL | NULL | NULL | -2.642 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 2.139 | NULL | 2.139 | NULL | 0 |
| 22 | CPT-00620 | BRACKET TIANG DROP WIRE | 25 | NULL | 25 | NULL | 0 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 180 | NULL | 180 | NULL | 0 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 230 | NULL | NULL | NULL | -230 |
| 28 | CBL-00220 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 80 | NULL | 80 | NULL | 0 |
| 29 | CBL-00223 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 47 | NULL | 47 | NULL | 0 |
| 30 | CBL-00226 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 12 | NULL | 12 | NULL | 0 |
| 31 | CBL-00229 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 2 | NULL | 2 | NULL | 0 |
| 32 | CBL-00231 | KABEL DROPCORE PRECON 1 CORE 3 SELING SC | 1 | NULL | 1 | NULL | 0 |
| 33 | SPP-00100 | BRACKET X-FRAME BEHEL MINI 12X40X40 (HIT | 101 | NULL | 131 | NULL | 30 |
| 34 | CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | 25 | NULL | 25 | NULL | 0 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 10 | NULL | 10 | NULL | 0 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 10 | NULL | 10 | NULL | 0 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 30 | NULL | 30 | NULL | 0 |
| 39 | 01-013-03083 | MUR + BAUT STENLIS M08 - 1.25 X 80 | 50 | NULL | 50 | NULL | 0 |
| ... | (9 item lainnya) | | | | | | |

### Cluster NET-H-004410 — FTTH Open Area Rancamanyar RW 15

| Field | Nilai |
|-------|-------|
| cluster_id | NET-H-004410 |
| nama_cluster | FTTH Open Area Rancamanyar RW 15 |
| homepass_plan | 1.446 |
| no_tiket_release | UR11027 |
| action | create |
| boq_action | skip |
| boq_reason | Cluster NET-H-004410 incomplete (hanya BoQ Plan 1 kolom) — BOQ tidak dibuat |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 0 |
| Additional | 0 |
| MOS | 0 |
| Used | 0 |
| Remains (calc) | 0 |

Items: **0 akan dibuat**, 0 blocker, 0 dilewati

### Cluster MF-H-000141 — POP Rancamanyar Baleendah

| Field | Nilai |
|-------|-------|
| cluster_id | MF-H-000141 |
| nama_cluster | POP Rancamanyar Baleendah |
| homepass_plan | NULL |
| no_tiket_release | UR11027 |
| action | create |
| boq_action | create |

**Totals per cluster:**

| Angka | Total |
|-------|-------|
| BoQ Plan | 5.307 |
| Additional | 0 |
| MOS | 1.250 |
| Used | 0 |
| Remains (calc) | -4.057 |

Items: **25 akan dibuat**, 0 blocker, 0 dilewati

| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |
|-----|------|------|----------|-----|-----|------|----------------|
| 9 | [01-013-13103] | TIANG 7 METER - 3" OD.90 X 2.8 X 7000 | 36 | NULL | 36 | NULL | 0 |
| 11 | NWK-00468 | CLOSURE DACK 288 CORE FIBERTRON (LOGO) | 5 | NULL | NULL | NULL | -5 |
| 17 | CBL-00461 | KABEL FO 24/2T ZTT 2024 | 630 | NULL | NULL | NULL | -630 |
| 18 | CBL-00465 | KABEL FO 144C/12T ZTT 2024 | 1.926 | NULL | NULL | NULL | -1.926 |
| 19 | 10001296 | KABEL FO 96C/8T ZTT 2024 | 1.898 | NULL | NULL | NULL | -1.898 |
| 23 | CPT-00623 | BRACKET TIANG FLEXIBEL BEHEL PER (BRACKE | 82 | NULL | NULL | NULL | -82 |
| 24 | 29000001 | Strength Clamp Buaya 50/70 | 84 | NULL | NULL | NULL | -84 |
| 25 | 29000002 | Strength Clamp Buaya 70/95 | 70 | NULL | 112 | NULL | 42 |
| 35 | CPT-00630 | BRACKET COILAN X-FRAME (BESAR 4 PER) | 14 | NULL | 13 | NULL | -1 |
| 36 | 90000151 | BRACKET SALIB BARU | 20 | NULL | 25 | NULL | 5 |
| 37 | CPT-00718 | DUDUKAN CLOUSURE BRACKET COILAN X-FRAME  | 14 | NULL | 13 | NULL | -1 |
| 38 | CPT-00914 | MUR + BAUT STENLIS  M10 - 1.5 X 45 | 42 | NULL | 39 | NULL | -3 |
| 50 | [01-013-11630] | STAINLESS BELT NON MAGNET | NULL | NULL | 2 | NULL | 2 |
| 51 | [01-013-01157] | STOPPING BUCKLER | NULL | NULL | 1.010 | NULL | 1.010 |
| 53 | 01-013-00033 | ADAPTER LC/UPC DUPLEX AUTO SHUTTER | 147 | NULL | NULL | NULL | -147 |
| 54 | JTR-02154 | OTB RACK PAZ 48 core  LC/UPC | 6 | NULL | NULL | NULL | -6 |
| 55 | CPT-00671 | CABLE MANAGEMENT METAL 1U ( CCM-M1U-BLK  | 6 | NULL | NULL | NULL | -6 |
| 56 | 90000156 | KSS Spiral Wrapping Band KS-6BK Hitam 10 | 14 | NULL | NULL | NULL | -14 |
| 57 | CPT-00674 | CAGE NUT MUR + RING 6 | 12 | NULL | NULL | NULL | -12 |
| 58 | CPT-00753 | FLEXIBLE WP 1/2" INCH | 5 | NULL | NULL | NULL | -5 |
| ... | (5 item lainnya) | | | | | | |

## 4. BLOCKER (0)

Tidak ada BLOCKER. Import bisa dijalankan (--execute).

## 5. PERINGATAN (31)

- Row 48: Skipping non-material "null" (Precon 3m (Produksi in-House MSP))
- Cluster NET-H-004410 (FTTH Open Area Rancamanyar RW 15): 0 material rows
- Cluster NET-H-004396 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004396 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004397 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004397 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004938 row 11: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004938 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004938 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004399 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004399 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004400 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004400 row 60: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004400 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004401 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004401 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004402 row 11: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004402 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004402 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004404 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004404 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004405 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004405 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004406 row 15: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004406 row 16: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004406 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004406 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004409 row 49: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster NET-H-004409 row 64: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster MF-H-000141 row 50: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0
- Cluster MF-H-000141 row 51: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0

## 6. KHUSUS: NET-H-004410 (INCOMPLETE)

Cluster ini hanya memiliki kolom BoQ Plan di Excel. Additional/MOS/Used/Remains = NULL.
Items akan dibuat: 0

## 7. CHECKLIST VERIFIKASI SEBELUM --execute

- [ ] Semua 49 material code cocok di DB
- [ ] User ID 1 ada dan role admin/supervisor
- [ ] Backup file backup_before_boq_import_*.dump ada di D:\Project\digitak-warehouse, size > 0, < 24 jam
- [ ] Tidak ada BLOCKER di atas
- [ ] Field NOT NULL project (kota_kabupaten, kecamatan) sudah diisi
- [ ] Enum status BOQ "draft" valid di schema

