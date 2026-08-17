const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function executeRaw(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    // Ignore duplicate object errors for enums and tables
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`  (already exists, skipping)`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('Starting full schema migration...');
  
  try {
    // ============================================================
    // STEP 1: Create enums
    // ============================================================
    console.log('Creating enums...');
    await executeRaw(`CREATE TYPE user_role AS ENUM ('admin_general', 'supervisor', 'staf_gudang')`);
    await executeRaw(`CREATE TYPE personil_jenis AS ENUM ('teknisi', 'admin_gudang', 'pengantar_logistik')`);
    await executeRaw(`CREATE TYPE gudang_tipe AS ENUM ('tetap', 'dadakan')`);
    await executeRaw(`CREATE TYPE boq_status AS ENUM ('draft', 'aktif')`);
    await executeRaw(`CREATE TYPE permintaan_boq_status AS ENUM ('diajukan', 'ditinjau', 'disetujui', 'ditolak')`);
    await executeRaw(`CREATE TYPE surat_jalan_tipe AS ENUM ('inbound', 'outbound')`);
    await executeRaw(`CREATE TYPE surat_jalan_status AS ENUM ('draft_diajukan', 'disetujui', 'digenerate', 'diterima_didistribusikan')`);
    await executeRaw(`CREATE TYPE kondisi_barang AS ENUM ('baik', 'rusak_ringan', 'rusak_berat', 'tidak_sesuai_spek', 'doa')`);
    await executeRaw(`CREATE TYPE mutasi_jenis AS ENUM ('in', 'out')`);
    await executeRaw(`CREATE TYPE approval_entity_type AS ENUM ('boq', 'surat_jalan')`);
    await executeRaw(`CREATE TYPE approval_tahap AS ENUM ('aktivasi_boq', 'outbound_kritis', 'outbound_di_luar_boq', 'outbound_melebihi_remains')`);
    await executeRaw(`CREATE TYPE approval_status AS ENUM ('menunggu', 'disetujui', 'ditolak')`);
    await executeRaw(`CREATE TYPE audit_aksi AS ENUM ('create', 'update', 'delete', 'approve')`);
    console.log('Enums created');
    
    // ============================================================
    // STEP 2: Create new tables
    // ============================================================
    console.log('Creating new tables...');
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS user_account (
        user_id       BIGSERIAL PRIMARY KEY,
        nama          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          user_role NOT NULL DEFAULT 'staf_gudang',
        is_aktif      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS project (
        project_id    BIGSERIAL PRIMARY KEY,
        nama_project  TEXT NOT NULL,
        area          TEXT,
        klien         TEXT,
        status_aktif  BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by    BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by    BIGINT NOT NULL REFERENCES user_account(user_id)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS gudang (
        gudang_id   BIGSERIAL PRIMARY KEY,
        nama_gudang TEXT NOT NULL,
        tipe        gudang_tipe NOT NULL DEFAULT 'tetap',
        alamat      TEXT,
        project_id  BIGINT REFERENCES project(project_id),
        is_aktif    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by  BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by  BIGINT NOT NULL REFERENCES user_account(user_id),
        CONSTRAINT chk_gudang_dadakan_project CHECK (tipe = 'tetap' OR project_id IS NOT NULL)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS personil (
        personil_id BigSERIAL PRIMARY KEY,
        nama        TEXT NOT NULL,
        jenis       personil_jenis NOT NULL DEFAULT 'teknisi',
        no_hp       TEXT,
        user_id     BIGINT REFERENCES user_account(user_id) ON DELETE SET NULL,
        is_dummy    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by  BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by  BIGINT NOT NULL REFERENCES user_account(user_id)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS kendaraan (
        kendaraan_id     BIGSERIAL PRIMARY KEY,
        no_polisi        TEXT NOT NULL UNIQUE,
        jenis_kendaraan  TEXT NOT NULL,
        kapasitas_angkut NUMERIC(12,2),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by       BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by       BIGINT NOT NULL REFERENCES user_account(user_id)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS zona_gudang (
        zona_id    BIGSERIAL PRIMARY KEY,
        gudang_id  BIGINT NOT NULL REFERENCES gudang(gudang_id) ON DELETE CASCADE,
        kode_zona  TEXT NOT NULL,
        nama_zona  TEXT,
        UNIQUE (gudang_id, kode_zona)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS rak (
        rak_id         BIGSERIAL PRIMARY KEY,
        zona_id        BIGINT NOT NULL REFERENCES zona_gudang(zona_id) ON DELETE CASCADE,
        kode_rak       TEXT NOT NULL,
        kapasitas_unit NUMERIC(12,2),
        UNIQUE (zona_id, kode_rak)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS bin_lokasi (
        bin_id         BIGSERIAL PRIMARY KEY,
        rak_id         BIGINT NOT NULL REFERENCES rak(rak_id) ON DELETE CASCADE,
        kode_bin       TEXT NOT NULL,
        kapasitas_unit NUMERIC(12,2),
        UNIQUE (rak_id, kode_bin)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS kategori_barang (
        kategori_id   BIGSERIAL PRIMARY KEY,
        nama_kategori TEXT NOT NULL UNIQUE,
        is_kritis     BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS satuan (
        satuan_id   BIGSERIAL PRIMARY KEY,
        kode_satuan TEXT NOT NULL UNIQUE
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS barang (
        barang_id         BIGSERIAL PRIMARY KEY,
        kode_perangkat    TEXT NOT NULL UNIQUE,
        nama_barang       TEXT NOT NULL,
        kategori_id       BIGINT NOT NULL REFERENCES kategori_barang(kategori_id),
        satuan_default_id BIGINT NOT NULL REFERENCES satuan(satuan_id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by        BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by        BIGINT NOT NULL REFERENCES user_account(user_id)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS tiket_material (
        tiket_id   BIGSERIAL PRIMARY KEY,
        kode_tiket TEXT NOT NULL UNIQUE,
        project_id BIGINT NOT NULL REFERENCES project(project_id) ON DELETE RESTRICT,
        area       TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT NOT NULL REFERENCES user_account(user_id)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS boq (
        boq_id            BIGSERIAL PRIMARY KEY,
        tiket_id          BIGINT NOT NULL UNIQUE REFERENCES tiket_material(tiket_id),
        status            boq_status NOT NULL DEFAULT 'draft',
        tanggal_aktivasi  TIMESTAMPTZ,
        diaktifkan_oleh   BIGINT REFERENCES user_account(user_id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by        BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by        BIGINT NOT NULL REFERENCES user_account(user_id),
        CONSTRAINT chk_boq_aktivasi CHECK (status = 'draft' OR (tanggal_aktivasi IS NOT NULL AND diaktifkan_oleh IS NOT NULL))
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS boq_item (
        boq_item_id      BIGSERIAL PRIMARY KEY,
        boq_id           BIGINT NOT NULL REFERENCES boq(boq_id) ON DELETE CASCADE,
        barang_id        BIGINT NOT NULL REFERENCES barang(barang_id),
        qty_rencana      NUMERIC(14,2) NOT NULL CHECK (qty_rencana > 0),
        satuan_id        BIGINT NOT NULL REFERENCES satuan(satuan_id),
        gudang_tujuan_id BIGINT REFERENCES gudang(gudang_id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS permintaan_boq (
        permintaan_id  BIGSERIAL PRIMARY KEY,
        project_id     BIGINT NOT NULL REFERENCES project(project_id) ON DELETE RESTRICT,
        tiket_id       BIGINT REFERENCES tiket_material(tiket_id),
        barang_id      BIGINT NOT NULL REFERENCES barang(barang_id),
        qty_usulan     NUMERIC(14,2) NOT NULL CHECK (qty_usulan > 0),
        alasan         TEXT,
        status         permintaan_boq_status NOT NULL DEFAULT 'diajukan',
        diajukan_oleh  BIGINT NOT NULL REFERENCES personil(personil_id),
        ditinjau_oleh  BIGINT REFERENCES personil(personil_id),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS surat_jalan (
        surat_jalan_id        BIGSERIAL PRIMARY KEY,
        nomor_surat_jalan     TEXT NOT NULL UNIQUE,
        tipe                  surat_jalan_tipe NOT NULL,
        boq_id                BIGINT REFERENCES boq(boq_id),
        gudang_asal_id        BIGINT REFERENCES gudang(gudang_id),
        gudang_tujuan_id      BIGINT REFERENCES gudang(gudang_id),
        kendaraan_id          BIGINT REFERENCES kendaraan(kendaraan_id),
        personil_pengantar_id BIGINT REFERENCES personil(personil_id),
        status                surat_jalan_status NOT NULL DEFAULT 'draft_diajukan',
        kategori_approval     TEXT,
        tanggal               TIMESTAMPTZ NOT NULL DEFAULT now(),
        tanggal_disetujui     TIMESTAMPTZ,
        tanggal_digenerate    TIMESTAMPTZ,
        tanggal_diterima      TIMESTAMPTZ,
        project_id            BIGINT REFERENCES project(project_id),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by            BIGINT NOT NULL REFERENCES user_account(user_id),
        updated_by            BIGINT NOT NULL REFERENCES user_account(user_id),
        CONSTRAINT chk_surat_jalan_gudang CHECK (
          (tipe = 'inbound' AND gudang_tujuan_id IS NOT NULL) OR
          (tipe = 'outbound' AND gudang_asal_id IS NOT NULL)
        )
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS surat_jalan_item (
        item_id        BIGSERIAL PRIMARY KEY,
        surat_jalan_id BIGINT NOT NULL REFERENCES surat_jalan(surat_jalan_id) ON DELETE CASCADE,
        barang_id      BIGINT NOT NULL REFERENCES barang(barang_id),
        qty            NUMERIC(14,2) NOT NULL CHECK (qty > 0),
        satuan_id      BIGINT NOT NULL REFERENCES satuan(satuan_id),
        kondisi        kondisi_barang,
        serial_number  TEXT,
        foto_url       TEXT,
        is_kelebihan   BOOLEAN NOT NULL DEFAULT FALSE,
        catatan        TEXT,
        bin_lokasi_id  BIGINT REFERENCES bin_lokasi(bin_id),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS stok_gudang (
        stok_id       BIGSERIAL PRIMARY KEY,
        gudang_id     BIGINT NOT NULL REFERENCES gudang(gudang_id),
        bin_lokasi_id BIGINT REFERENCES bin_lokasi(bin_id),
        barang_id     BIGINT NOT NULL REFERENCES barang(barang_id),
        project_id    BIGINT REFERENCES project(project_id),
        kondisi       kondisi_barang NOT NULL DEFAULT 'baik',
        qty           NUMERIC(14,2) NOT NULL DEFAULT 0,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (gudang_id, bin_lokasi_id, barang_id, project_id, kondisi)
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS stok_ledger (
        ledger_id           BIGSERIAL PRIMARY KEY,
        surat_jalan_item_id BIGINT NOT NULL REFERENCES surat_jalan_item(item_id),
        barang_id           BIGINT NOT NULL REFERENCES barang(barang_id),
        jenis_mutasi        mutasi_jenis NOT NULL,
        qty                 NUMERIC(14,2) NOT NULL CHECK (qty > 0),
        saldo_setelah       NUMERIC(14,2) NOT NULL,
        waktu_mutasi        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS approval_log (
        approval_id  BIGSERIAL PRIMARY KEY,
        entity_type  approval_entity_type NOT NULL,
        entity_id    BIGINT NOT NULL,
        tahap        approval_tahap NOT NULL,
        status       approval_status NOT NULL DEFAULT 'menunggu',
        approver_id  BIGINT REFERENCES user_account(user_id),
        catatan      TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS audit_log (
        audit_id     BIGSERIAL PRIMARY KEY,
        entity_type  TEXT NOT NULL,
        entity_id    BIGINT NOT NULL,
        aksi         audit_aksi NOT NULL,
        actor_id     BIGINT NOT NULL REFERENCES user_account(user_id),
        data_sebelum JSONB,
        data_sesudah JSONB,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    console.log('New tables created');
    
    // ============================================================
    // STEP 3: Migrate data
    // ============================================================
    console.log('\nMigrating data...');
    
    // Check if Personnel has login data
    const personnelCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Personnel" WHERE username IS NOT NULL
    `;
    console.log(`Personnel with login data: ${personnelCount[0].count}`);
    
    if (personnelCount[0].count > 0) {
      // Migrate users
      await executeRaw(`
        INSERT INTO user_account (nama, email, password_hash, role, is_aktif, created_at, updated_at)
        SELECT 
            p.name,
            COALESCE(p.email, p.username || '@local'),
            p.password,
            CASE 
                WHEN p.role = 'ADMIN' THEN 'admin_general'::user_role
                WHEN p.role = 'SUPERVISOR' THEN 'supervisor'::user_role
                ELSE 'staf_gudang'::user_role
            END,
            p."isActive",
            p."createdAt",
            p."updatedAt"
        FROM "Personnel" p
        WHERE p.username IS NOT NULL
        ON CONFLICT (email) DO NOTHING
      `);
      console.log('Users migrated to user_account');
      
      // Migrate personil
      await executeRaw(`
        INSERT INTO personil (nama, jenis, no_hp, user_id, is_dummy, created_at, updated_at, created_by, updated_by)
        SELECT 
            p.name,
            CASE 
                WHEN p.position ILIKE '%supervisor%' THEN 'admin_gudang'::personil_jenis
                WHEN p.position ILIKE '%staff%' THEN 'teknisi'::personil_jenis
                ELSE 'teknisi'::personil_jenis
            END,
            p.phone,
            ua.user_id,
            false,
            p."createdAt",
            p."updatedAt",
            ua.user_id,
            ua.user_id
        FROM "Personnel" p
        JOIN user_account ua ON ua.email = COALESCE(p.email, p.username || '@local')
        WHERE p.username IS NOT NULL
      `);
      console.log('Personnel migrated');
    } else {
      console.log('No login data found in Personnel, creating default admin...');
      await executeRaw(`
        INSERT INTO user_account (nama, email, password_hash, role, is_aktif)
        VALUES ('Administrator', 'admin@local', 'hashed_password', 'admin_general'::user_role, true)
        ON CONFLICT (email) DO NOTHING
      `);
      await executeRaw(`
        INSERT INTO personil (nama, jenis, no_hp, user_id, is_dummy, created_by, updated_by)
        VALUES ('Administrator', 'admin_gudang'::personil_jenis, NULL, 1, false, 1, 1)
      `);
    }
    
    // Migrate projects
    await executeRaw(`
      INSERT INTO project (nama_project, area, klien, status_aktif, created_at, updated_at, created_by, updated_by)
      SELECT 
          p.title,
          NULL,
          p."clusterId",
          p."isActive",
          p."createdAt",
          p."updatedAt",
          1,
          1
      FROM "Project" p
    `);
    console.log('Projects migrated');
    
    // Migrate warehouses to gudang
    await executeRaw(`
      INSERT INTO gudang (nama_gudang, tipe, alamat, is_aktif, created_at, updated_at, created_by, updated_by)
      SELECT 
          w.name,
          CASE 
              WHEN w.status = 'Tetap' THEN 'tetap'::gudang_tipe
              WHEN w.status = 'Dadakan' THEN 'dadakan'::gudang_tipe
              ELSE 'tetap'::gudang_tipe
          END,
          w.address,
          true,
          now(),
          now(),
          1,
          1
      FROM "Warehouse" w
    `);
    console.log('Warehouses migrated to gudang');
    
    // Migrate vehicles
    await executeRaw(`
      INSERT INTO kendaraan (no_polisi, jenis_kendaraan, kapasitas_angkut, created_at, updated_at, created_by, updated_by)
      SELECT 
          v."plateNumber",
          v.type,
          NULL,
          v."createdAt",
          v."updatedAt",
          1,
          1
      FROM "Vehicle" v
    `);
    console.log('Vehicles migrated');
    
    // Create default kategori and satuan
    await executeRaw(`
      INSERT INTO kategori_barang (nama_kategori, is_kritis) VALUES ('Umum', false) ON CONFLICT (nama_kategori) DO NOTHING
    `);
    await executeRaw(`
      INSERT INTO satuan (kode_satuan) VALUES ('pcs') ON CONFLICT (kode_satuan) DO NOTHING
    `);
    
    // Migrate items to barang
    await executeRaw(`
      INSERT INTO barang (kode_perangkat, nama_barang, kategori_id, satuan_default_id, created_at, updated_at, created_by, updated_by)
      SELECT 
          i.code,
          i.name,
          (SELECT kategori_id FROM kategori_barang WHERE nama_kategori = 'Umum' LIMIT 1),
          (SELECT satuan_id FROM satuan WHERE kode_satuan = 'pcs' LIMIT 1),
          i."createdAt",
          i."updatedAt",
          1,
          1
      FROM "Item" i
    `);
    console.log('Items migrated to barang');
    
    // Create tiket_material for existing BOQs
    await executeRaw(`
      INSERT INTO tiket_material (kode_tiket, project_id, area, created_at, created_by)
      SELECT 
          b."ticketNumber",
          (SELECT project_id FROM project WHERE nama_project = (SELECT title FROM "Project" WHERE "projectId" = b."projectId") LIMIT 1),
          b.area,
          b."createdAt",
          1
      FROM "boqs" b
      ON CONFLICT (kode_tiket) DO NOTHING
    `);
    console.log('Tiket material created');
    
    // Migrate BOQs
    await executeRaw(`
      INSERT INTO boq (tiket_id, status, tanggal_aktivasi, diaktifkan_oleh, created_at, updated_at, created_by, updated_by)
      SELECT 
          tm.tiket_id,
          CASE b.status WHEN 'AKTIF' THEN 'aktif'::boq_status ELSE 'draft'::boq_status END,
          CASE WHEN b.status = 'AKTIF' THEN b."updatedAt" ELSE NULL END,
          CASE WHEN b.status = 'AKTIF' THEN 1 ELSE NULL END,
          b."createdAt",
          b."updatedAt",
          1,
          1
      FROM "boqs" b
      JOIN tiket_material tm ON tm.kode_tiket = b."ticketNumber"
    `);
    console.log('BOQs migrated');
    
    // Migrate BOQ items
    await executeRaw(`
      INSERT INTO boq_item (boq_id, barang_id, qty_rencana, satuan_id, gudang_tujuan_id, created_at, updated_at)
      SELECT 
          boq.boq_id,
          (SELECT barang_id FROM barang WHERE kode_perangkat = bi."itemCode" LIMIT 1),
          bi.quantity,
          (SELECT satuan_id FROM satuan WHERE kode_satuan = 'pcs' LIMIT 1),
          NULL,
          bi."createdAt",
          bi."updatedAt"
      FROM "boq_items" bi
      JOIN "boqs" b ON b.id = bi."boqId"
      JOIN tiket_material tm ON tm.kode_tiket = b."ticketNumber"
      JOIN boq ON boq.tiket_id = tm.tiket_id
    `);
    console.log('BOQ items migrated');
    
    // Migrate permintaan_boqs
    await executeRaw(`
      INSERT INTO permintaan_boq (project_id, tiket_id, barang_id, qty_usulan, alasan, status, diajukan_oleh, ditinjau_oleh, created_at, updated_at)
      SELECT 
          (SELECT project_id FROM project WHERE nama_project = (SELECT title FROM "Project" WHERE "projectId" = pb."projectId") LIMIT 1),
          NULL,
          (SELECT barang_id FROM barang WHERE kode_perangkat = pb."itemCode" LIMIT 1),
          pb.quantity,
          pb.reason,
          CASE pb.status 
              WHEN 'DIAJUKAN' THEN 'diajukan'::permintaan_boq_status
              WHEN 'DITINJAU' THEN 'ditinjau'::permintaan_boq_status
              WHEN 'DISETUJUI' THEN 'disetujui'::permintaan_boq_status
              WHEN 'DITOLAK' THEN 'ditolak'::permintaan_boq_status
              ELSE 'diajukan'::permintaan_boq_status
          END,
          1,
          NULL,
          pb."createdAt",
          pb."updatedAt"
      FROM "permintaan_boqs" pb
    `);
    console.log('Permintaan BOQs migrated');
    
    // ============================================================
    // STEP 4: Create indexes
    // ============================================================
    console.log('\nCreating indexes...');
    
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_tiket_material_project ON tiket_material(project_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_surat_jalan_project ON surat_jalan(project_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_stok_gudang_project ON stok_gudang(project_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_permintaan_boq_project ON permintaan_boq(project_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_surat_jalan_boq ON surat_jalan(boq_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_boq_item_boq ON boq_item(boq_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_boq_item_barang ON boq_item(barang_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_stok_gudang_gudang_barang ON stok_gudang(gudang_id, barang_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_bin_lokasi_rak ON bin_lokasi(rak_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_stok_ledger_barang_waktu ON stok_ledger(barang_id, waktu_mutasi)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_stok_ledger_item ON stok_ledger(surat_jalan_item_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_surat_jalan_status ON surat_jalan(status)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_boq_status ON boq(status)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_permintaan_boq_status ON permintaan_boq(status)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_approval_log_entity ON approval_log(entity_type, entity_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`);
    await executeRaw(`CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id)`);
    
    console.log('Indexes created');
    
    // ============================================================
    // STEP 5: Drop old tables
    // ============================================================
    console.log('\nDropping old tables...');
    
    await executeRaw(`DROP TABLE IF EXISTS "boq_items" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "permintaan_boqs" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "boqs" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "Item" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "Vehicle" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "Warehouse" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "Personnel" CASCADE`);
    await executeRaw(`DROP TABLE IF EXISTS "Project" CASCADE`);
    
    console.log('Old tables dropped');
    
    // ============================================================
    // STEP 6: Update Prisma migration history
    // ============================================================
    console.log('\nUpdating migration history...');
    
    const migrations = [
      ['20260804191207', 'init'],
      ['20260804193611', 'add_warehouse_relation'],
      ['20260805073910', 'create_warehouse'],
      ['20260807144213', 'add_personnel_table'],
      ['20260808123524', 'add_photo_to_personnel_vehicle'],
      ['20260808140002', 'add_category_to_item'],
      ['20260808145636', 'add_boq_models'],
      ['20260809071710', 'add_external_verification'],
      ['20260809092824', 'add_boq_reference_file'],
      ['20260810000000', 'merge-user-into-personnel'],
      ['20260810120000', 'full_schema_redesign']
    ];
    
    for (const [version, name] of migrations) {
      await executeRaw(`
        INSERT INTO _prisma_migrations (version, checksum, migration_name, started_at, finished_at, execution_steps, rolled_back_at)
        VALUES ('${version}', '${name}', '${name}', now(), now(), 1, NULL)
        ON CONFLICT (version) DO NOTHING
      `);
    }
    
    console.log('Migration history updated');
    
    console.log('\nSchema migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
