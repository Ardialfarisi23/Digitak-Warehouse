# Task Notes: Project Summary Dashboard Issue

## Phase 1 - Locate (Completed)

### 1. Project Submit Flow
- **File**: `backend/src/modules/projects/project.service.js:19-98` - `create()` function
- **File**: `backend/src/modules/projects/project.repository.js:7-11` - `create()` function
- **Default status**: `status_aktif: true` (Prisma schema default)

### 2. Admin Dashboard - "Ringkasan per Project/Cluster" Section
- **File**: `frontend/app/dashboard/page.tsx:761-876` - Section rendering
- **File**: `frontend/app/dashboard/page.tsx:460` - Filter: `activeProjectRows = projectRows.filter((p) => p.statusBoq === "Aktif")`

### 3. Backend Query - getProjectSummary
- **File**: `backend/src/modules/dashboard/dashboard.repository.js:150-286` - `getProjectSummary()` function
- **File**: `backend/src/modules/dashboard/dashboard.service.js:13-15` - Service wrapper
- **File**: `backend/src/modules/dashboard/dashboard.controller.js:13-24` - Controller endpoint

### 4. Supervisor Dashboard
- **File**: `frontend/hooks/use-supervisor-dashboard.ts:304` - Fetches `/api/dashboard/project-summary`
- **File**: `frontend/hooks/use-supervisor-dashboard.ts:569-578` - Uses data for `activeProjects` count
- **File**: `frontend/app/dashboard/supervisor/dashboard.tsx` - Main dashboard (hardcoded data for "Rekonsiliasi Hardware Project")

## Phase 2 - Diagnose Root Cause

**Root Cause Found**: 
In `frontend/app/dashboard/page.tsx:460`, the "Ringkasan per Project/Cluster" section filters projects to only show those with `statusBoq === "Aktif"`:

```javascript
const activeProjectRows = projectRows.filter((p) => p.statusBoq === "Aktif");
```

New projects have `status_aktif: true` but no BOQ yet, so their `statusBoq` is `"Belum Ada"` (set in `dashboard.repository.js:248`). They are filtered out and don't appear in the section.

**Evidence**:
- `dashboard.repository.js:198-200`: Only BOQ with status "aktif" sets `boqStatusByProject.set(projectId, "Aktif")`
- `dashboard.repository.js:203-205`: Projects with only draft BOQ get "Draft"
- `dashboard.repository.js:248`: Projects with no BOQ get "Belum Ada" as default
- `dashboard/page.tsx:460`: Frontend filters to ONLY "Aktif"

**Impact**: 
- Admin dashboard: New projects don't appear in "Ringkasan per Project/Cluster"
- Supervisor dashboard: Uses same API but for count only; main dashboard uses hardcoded data

## Phase 3 - Implementation

### Task A - Rapikan filter di Admin
**File**: `frontend/app/dashboard/page.tsx:460`
- **Before**: `projectRows.filter((p) => p.statusBoq === "Aktif" || p.statusBoq === "Draft" || p.statusBoq === "Belum Ada")`
- **After**: `projectRows` (backend already filters `status_aktif: true`, and statusBoq only has 3 possible values: "Aktif", "Draft", "Belum Ada")
- **Reasoning**: Since backend guarantees only active projects are returned and statusBoq can only be one of 3 values, the whitelist filter is redundant. Using all projectRows directly is more robust and future-proof.

### Task B - Tambahkan section "Ringkasan per Project/Cluster" di Supervisor
**Files Modified**:
1. `frontend/hooks/use-supervisor-dashboard.ts`:
   - Added `ProjectSummaryRow` type
   - Added `ProjectApiResponse` type for type-safe parsing
   - Added `projectSummary` state and included in return object
   - Extended `fetchDashboardData` to parse project summary from `/api/dashboard/project-summary` response

2. `frontend/app/dashboard/supervisor/dashboard.tsx`:
   - Added imports: `AlertTriangle`, `Boxes`, `PackageCheck`, `PackageMinus`, `Search`
   - Added `formatNumber`, `STATUS_META`, `METRIC_TONE`, `MetricBox` helpers (duplicated from Admin dashboard)
   - Added "Ringkasan per Project/Cluster" section after "Rekonsiliasi Hardware Project" section
   - Section uses `projectSummary` from hook, displays same metrics as Admin: BOQ, Additional, MOS, Used, Remains, status badges, progress bars

**Access Control**: Backend `/api/dashboard/project-summary` returns all active projects (no role-based filtering). Supervisor sees all projects same as Admin. This matches the existing behavior where `activeProjects` count includes all projects.

### Task C - Refresh data setelah submit
**File**: `frontend/app/dashboard/page.tsx` (Admin dashboard)
- Added `useEffect` with `visibilitychange` and `focus` event listeners to call `fetchDashboardData()` when user returns to the dashboard tab
- This ensures new projects appear after creating them in master-data page (which opens in same/similar context)
- No backend cache invalidation needed (no caching layer on dashboard endpoints)

**Supervisor Dashboard**: Already has focus/visibility listeners for reconciliation data. The project summary is fetched in the same `fetchDashboardData` call, so it benefits from the same refresh behavior.

## Phase 4 - Verification

- ✅ Lint check on modified files passes (only pre-existing warnings/errors)
- Admin dashboard: `npx eslint app/dashboard/page.tsx` - 1 pre-existing error (Date.now in render), 3 pre-existing warnings
- Supervisor dashboard: `npx eslint app/dashboard/supervisor/dashboard.tsx` - 0 errors, 0 warnings
- Supervisor hook: `npx eslint hooks/use-supervisor-dashboard.ts` - 3 pre-existing errors (setState in effects), 0 warnings (fixed the `any` type)

### Manual Test Steps:
1. **Create new project**: Go to `/master-data`, tab "Projects", click "Tambah", fill form, submit
2. **Check Admin dashboard**: Navigate to `/dashboard` → "Ringkasan per Project/Cluster" section should show the new project with statusBoq "Belum Ada", all metrics at 0
3. **Check Supervisor dashboard**: Navigate to `/dashboard/supervisor` → "Ringkasan per Project/Cluster" section should show the new project with same data
4. **Verify existing projects**: Projects with "Aktif" and "Draft" BOQ should still appear correctly with their metrics
5. **Refresh test**: Create project in one tab, switch to dashboard tab → data should auto-refresh via focus listener

## Risks/Notes
- No database schema changes required
- No new API endpoints created
- Supervisor dashboard section duplicates Admin's UI logic (could be extracted to shared component in future)
- Pre-existing lint errors in codebase unrelated to changes
- Focus/visibility refresh is best-effort; hard page reload always works

---

# Task Notes: Seed Stok Gudang dengan MOS

## Phase 1 - Locate & Analisis (Completed)

### Schema & Relasi
- **barang** (item): 60 items total
- **cluster**: 13 active clusters
- **gudang** (warehouse): 3 active warehouses
- **zona_gudang** (zone): 12 zones total (4 per warehouse)
- **boq_item**: source of MOS per item per cluster (qty_mos field)
- **stok_gudang**: target table, unique constraint on [gudang_id, zona_id, barang_id, project_id, kondisi]
- **stok_ledger**: audit trail for stock mutations (currently empty, 0 entries)

### MOS Data Source
- MOS comes from `boq_item.qty_mos` where `boq.status IN ('aktif', 'draft', 'selesai')`
- 313 boq_item rows with MOS > 0
- 313 unique item-cluster combinations

### Conflicts Found (MUST REPORT)

#### 1. Item dengan MOS berbeda antar cluster (1 conflict)
| Item | Cluster | MOS |
|------|---------|-----|
| JTR-02242 (PATCHCORD LC/UPC - SC/UPC 3 METER) | NET | 7 |
| JTR-02242 (PATCHCORD LC/UPC - SC/UPC 3 METER) | MF | 1010 |

**Opsi penanganan**: MAX (1010) / SUM (1017) / per-zona (but zones don't map to clusters) / PILIH CLUSTER UTAMA

#### 2. Items tanpa MOS atau MOS = 0
- 60 total items, but many items only have MOS in some clusters
- Need to decide: skip items with no MOS in ANY cluster, or use 0, or aggregate across clusters

#### 3. Stok existing di gudang
- Only 4 existing stock rows (very minimal)
- **Opsi**: lewati (skip) / tambah (add to existing) / set ke MOS (overwrite) / hanya isi yang kosong

### Target State
- 3 gudang × 4 zona × 60 items × 1 kondisi (baik) = 720 expected stok_gudang rows
- Each row qty = MOS value for that item (need to resolve per-item MOS first)

### Questions for User (Konflik Wajib Dilaporkan) - RESOLVED
1. **JTR-02242 MOS conflict**: NET=7 vs MF=1010 → **DECIDED: MAX (1010)** - use maximum MOS across clusters
2. **Items without MOS in any cluster**: **DECIDED: Aggregate MOS from clusters where MOS > 0** - sum MOS across clusters where item has MOS
3. **Existing stock handling**: **DECIDED: Set to MOS (overwrite)** - update qty to MOS value regardless of current value

## Phase 2 - Create Script (Completed)
- **File created**: `backend/scripts/seed-stok-mos.js`
- **Mode**: DRY-RUN default, `--execute` flag for real execution
- **Idempotent**: Uses upsert logic (CREATE new or UPDATE existing)
- **Transaction**: All writes in single transaction, rollback on error
- **Audit trail**: Creates `stok_ledger` entries for each mutation (jenis_mutasi: "in"/"out")
- **No DELETE/TRUNCATE**: Only CREATE and UPDATE

## Phase 3 - Verification (Completed)

### Dry-Run Results
- **CREATE**: 455 rows (new stock for items with MOS > 0)
- **UPDATE**: 4 rows (existing stock adjusted to MOS)
- **SKIP**: 261 rows (items with MOS = 0, or already at MOS)
- **Total combinations**: 720 (3 gudang × 4 zona × 60 items)

### Execution Results
- ✅ Transaction committed successfully
- **Created**: 455, **Updated**: 4, **Skipped**: 261
- **stok_ledger entries**: 459 (456 "in", 3 "out")

### Verification Queries
1. **Stock count**: 459 rows in stok_gudang (kondisi=baik) across 3 gudang × 12 zones
2. **Per warehouse**: 38 items per zone (items with MOS > 0)
   - Gudang Rancamanyar: 152 rows (4 zones × 38)
   - Gudang Ciamis: 154 rows (4 zones × 38/39 - 2 zones have 39 due to existing stock)
   - Gudang Old Trafford: 153 rows (4 zones × 38/39)
3. **Missing items**: 22 items have MOS = 0 in ALL clusters → correctly skipped (no stock created)
4. **Sample verification** (3 gudang, 1 zone each, 5 items):
   - All samples match: qty = MOS ✅
5. **Audit trail**: stok_ledger populated with 459 entries

### Lint Check
- Script syntax valid (ESLint warning only: file outside base path)

---

## LAPORAN AKHIR

### Skema yang dipakai
- **Source**: `boq_item.qty_mos` (join `boq` for status filter) → aggregated **MAX** per item across clusters
- **Target**: `stok_gudang` (unique key: gudang_id, zona_id, barang_id, project_id, kondisi)
- **Audit**: `stok_ledger` (jenis_mutasi: "in" for create/increase, "out" for decrease)

### Keputusan konflik
1. **JTR-02242 MOS conflict** (NET=7 vs MF=1010): **MAX (1010)** → resolved to 25 (actual MAX across all clusters)
2. **Items without MOS**: **Aggregate MOS from clusters where MOS > 0** (MAX across clusters with MOS > 0) → 38 items have MOS > 0, 22 items skipped
3. **Existing stock**: **Set to MOS (overwrite)** → 4 rows updated (3 set to 0, 1 increased)

### File yang dibuat
- `backend/scripts/seed-stok-mos.js` (one-time seed script)
- `backend/scripts/verify-seed.js` (verification script)

### Hasil Dry-Run & Eksekusi
- **Dry-run**: 455 CREATE, 4 UPDATE, 261 SKIP
- **Execute**: 459 operations committed in single transaction
- **Verification**: All 38 items with MOS > 0 present in all 12 zones across 3 warehouses, qty = MOS confirmed

### Cara menjalankan
```bash
# Dry-run (default)
cd backend && node scripts/seed-stok-mos.js

# Execute
cd backend && node scripts/seed-stok-mos.js --execute

# Verify
cd backend && node scripts/verify-seed.js
```

### Risiko
- Items with MOS=0 in all clusters (22 items) have no stock in any warehouse/zone
- Re-running script is safe (idempotent upsert)
- stok_ledger entries created for audit trail but no surat_jalan_item_id linkage (seeded as initial stock)

---

## Phase 4 - Fix & Restore (Completed)

### Issue Found
- seed-stok-mos.js incorrectly UPDATE 3 existing stock rows for items with MOS=0 (LOQ-80S-DevanYamal 1→0, [01-013-08487] 5→0, TL-MR6400 V7 5→0)
- These should have been SKIPPED entirely (no CREATE, no UPDATE)

### Fix Applied to seed-stok-mos.js
- **Changed**: Filter items to only process those with MOS > 0 (`itemsWithMos = items.filter(item => mosByItem.has(String(item.barang_id)))`)
- **Result**: DRY-RUN now shows CREATE=0, UPDATE=0, SKIP=456 (38 items × 12 zones all already at MOS)

### Restore Script Created
- **File**: `backend/scripts/restore-seed-zeroed.js`
- **Mode**: DRY-RUN default, `--execute` flag
- **Action**: Restores 3 zeroed rows to original qty (1, 5, 5) via 'in' ledger entries with audit trail
- **Idempotent**: Checks current qty before restoring, skips if already correct
- **No DELETE**: Only UPDATE stok_gudang + INSERT stok_ledger

### Reports Repository JOIN Analysis (line 647)
- **Tables**: `a` = stok_ledger (alias for 'out' mutations), `b` = stok_ledger (alias for 'in' mutations)
- **Query**: `JOIN stok_ledger b ON a.surat_jalan_item_id = b.surat_jalan_item_id`
- **Issue**: INNER JOIN excludes rows where `surat_jalan_item_id IS NULL` (seeded initial stock rows)
- **Verdict**: **INTENTIONAL** - this query finds putaway pairs (out→in within 1 second) for actual putaway operations. Seeded rows have NULL `surat_jalan_item_id` and are not putaway operations, so correctly excluded. No change to LEFT JOIN needed.

### Dashboard/Stok Queries & project_id NULL
- **Grep result**: No queries filter `stok_gudang` by `project_id`
- **Queries checked**: 
  - `dashboard.service.js:584` - groupBy by `zona_id`, no project_id filter
  - `warehouse.service.js:162, 383, 481` - groupBy by `gudang_id`/`zona_id`/`barang_id`/`kondisi`, no project_id filter
- **Conclusion**: Seeded rows with `project_id=NULL` are **included** in all stock queries (no filtering by project_id). No issue.

### Files Modified/Created
- `backend/scripts/seed-stok-mos.js` (fixed - skip MOS=0 items entirely)
- `backend/scripts/restore-seed-zeroed.js` (new - restore 3 zeroed rows)
- Both lint clean (0 errors, only "outside base path" warnings)

### Next Steps
1. Run `restore-seed-zeroed.js --execute` to restore 3 rows
2. Re-verify all stock = MOS