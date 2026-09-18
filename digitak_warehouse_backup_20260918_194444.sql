--
-- PostgreSQL database dump
--

\restrict QtnvdUgSKCQm0msoGmjdPRyjeDB6uLl3eCjt6ztbW7PHcO3C8KsqdHA8IAG46q2

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: approval_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_entity_type AS ENUM (
    'boq',
    'surat_jalan'
);


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'menunggu',
    'disetujui',
    'ditolak'
);


--
-- Name: approval_tahap; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_tahap AS ENUM (
    'aktivasi_boq',
    'outbound_kritis',
    'outbound_di_luar_boq',
    'outbound_melebihi_remains',
    'inbound_verifikasi',
    'inbound_putaway',
    'outbound_approval',
    'outbound_delivery'
);


--
-- Name: audit_aksi; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_aksi AS ENUM (
    'create',
    'update',
    'delete',
    'approve',
    'receive_inbound',
    'approve_inbound',
    'approve_outbound',
    'confirm_distributed',
    'reject_inbound',
    'reject_outbound',
    'putaway',
    'retrieve',
    'create_inbound',
    'create_outbound'
);


--
-- Name: boq_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.boq_source AS ENUM (
    'top_down',
    'bottom_up'
);


--
-- Name: boq_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.boq_status AS ENUM (
    'draft',
    'aktif',
    'ditolak',
    'selesai'
);


--
-- Name: external_verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.external_verification_status AS ENUM (
    'terverifikasi',
    'menunggu',
    'tidak_berlaku'
);


--
-- Name: gudang_tipe; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gudang_tipe AS ENUM (
    'tetap',
    'dadakan'
);


--
-- Name: jenis_laporan_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jenis_laporan_enum AS ENUM (
    'excel',
    'manual',
    'migrasi_sistem'
);


--
-- Name: kondisi_barang; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kondisi_barang AS ENUM (
    'baik',
    'rusak_ringan',
    'rusak_berat',
    'tidak_sesuai_spek',
    'doa'
);


--
-- Name: mutasi_jenis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mutasi_jenis AS ENUM (
    'in',
    'out'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'approval',
    'warning',
    'success',
    'error'
);


--
-- Name: permintaan_boq_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permintaan_boq_status AS ENUM (
    'diajukan',
    'ditinjau',
    'disetujui',
    'ditolak'
);


--
-- Name: personil_jenis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.personil_jenis AS ENUM (
    'teknisi',
    'admin_gudang',
    'pengantar_logistik'
);


--
-- Name: reconciliation_detail_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliation_detail_status AS ENUM (
    'berhasil',
    'gagal'
);


--
-- Name: status_kecukupan_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_kecukupan_source AS ENUM (
    'AUTO',
    'MANUAL'
);


--
-- Name: status_kecukupan_zona; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_kecukupan_zona AS ENUM (
    'CUKUP',
    'MENDEKATI_PENUH',
    'TIDAK_CUKUP'
);


--
-- Name: surat_jalan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.surat_jalan_status AS ENUM (
    'draft_diajukan',
    'disetujui',
    'digenerate',
    'diterima_didistribusikan',
    'menunggu_verifikasi',
    'ready_putaway',
    'ditolak',
    'sedang_dikirim'
);


--
-- Name: surat_jalan_tipe; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.surat_jalan_tipe AS ENUM (
    'inbound',
    'outbound'
);


--
-- Name: tipe_pengirim_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipe_pengirim_enum AS ENUM (
    'internal',
    'external'
);


--
-- Name: tujuan_tipe_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tujuan_tipe_enum AS ENUM (
    'lapangan',
    'gudang'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin_general',
    'supervisor',
    'staf_gudang'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: approval_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_log (
    approval_id bigint NOT NULL,
    entity_type public.approval_entity_type NOT NULL,
    entity_id bigint NOT NULL,
    tahap public.approval_tahap NOT NULL,
    status public.approval_status DEFAULT 'menunggu'::public.approval_status NOT NULL,
    approver_id bigint,
    catatan text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: approval_log_approval_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_log_approval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_log_approval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_log_approval_id_seq OWNED BY public.approval_log.approval_id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    audit_id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id bigint NOT NULL,
    aksi public.audit_aksi NOT NULL,
    actor_id bigint NOT NULL,
    data_sebelum jsonb,
    data_sesudah jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_audit_id_seq OWNED BY public.audit_log.audit_id;


--
-- Name: barang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barang (
    barang_id bigint NOT NULL,
    kode_perangkat text NOT NULL,
    nama_barang text NOT NULL,
    kategori_id bigint NOT NULL,
    satuan_default_id bigint NOT NULL,
    foto text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL
);


--
-- Name: barang_barang_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.barang_barang_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: barang_barang_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.barang_barang_id_seq OWNED BY public.barang.barang_id;


--
-- Name: boq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boq (
    boq_id bigint NOT NULL,
    tiket_id bigint NOT NULL,
    boq_number text,
    status public.boq_status DEFAULT 'draft'::public.boq_status NOT NULL,
    source public.boq_source DEFAULT 'top_down'::public.boq_source NOT NULL,
    external_verification_status public.external_verification_status DEFAULT 'menunggu'::public.external_verification_status NOT NULL,
    tanggal_aktivasi timestamp(3) without time zone,
    diaktifkan_oleh bigint,
    catatan text,
    reference_file text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL,
    email_reference text
);


--
-- Name: boq_boq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boq_boq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boq_boq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boq_boq_id_seq OWNED BY public.boq.boq_id;


--
-- Name: boq_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boq_item (
    boq_item_id bigint NOT NULL,
    boq_id bigint NOT NULL,
    barang_id bigint NOT NULL,
    qty_rencana numeric(14,2) NOT NULL,
    satuan_id bigint,
    gudang_tujuan_id bigint,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: boq_item_boq_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boq_item_boq_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boq_item_boq_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boq_item_boq_item_id_seq OWNED BY public.boq_item.boq_item_id;


--
-- Name: gudang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gudang (
    gudang_id bigint NOT NULL,
    nama_gudang text NOT NULL,
    tipe public.gudang_tipe DEFAULT 'tetap'::public.gudang_tipe NOT NULL,
    alamat text,
    project_id bigint,
    latitude text,
    longitude text,
    keterangan text,
    is_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL,
    pic_id bigint,
    kapasitas_maksimum integer,
    status_kecukupan_gudang public.status_kecukupan_zona,
    is_internal boolean DEFAULT true NOT NULL,
    CONSTRAINT gudang_kapasitas_maksimum_positive_chk CHECK (((kapasitas_maksimum IS NULL) OR (kapasitas_maksimum > 0)))
);


--
-- Name: gudang_gudang_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gudang_gudang_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gudang_gudang_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gudang_gudang_id_seq OWNED BY public.gudang.gudang_id;


--
-- Name: kategori_barang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kategori_barang (
    kategori_id bigint NOT NULL,
    nama_kategori text NOT NULL,
    is_kritis boolean DEFAULT false NOT NULL
);


--
-- Name: kategori_barang_kategori_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kategori_barang_kategori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kategori_barang_kategori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kategori_barang_kategori_id_seq OWNED BY public.kategori_barang.kategori_id;


--
-- Name: kendaraan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kendaraan (
    kendaraan_id bigint NOT NULL,
    no_polisi text NOT NULL,
    jenis_kendaraan text NOT NULL,
    merk text,
    kapasitas_angkut numeric(12,2),
    keterangan text,
    foto text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL,
    gudang_id bigint
);


--
-- Name: kendaraan_kendaraan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kendaraan_kendaraan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kendaraan_kendaraan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kendaraan_kendaraan_id_seq OWNED BY public.kendaraan.kendaraan_id;


--
-- Name: laporan_mitra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laporan_mitra (
    laporan_id bigint NOT NULL,
    tiket_id bigint NOT NULL,
    kode_tiket text NOT NULL,
    project_id bigint NOT NULL,
    jenis_laporan public.jenis_laporan_enum NOT NULL,
    tanggal_laporan date NOT NULL,
    pic_mitra text,
    nama_barang text,
    mos numeric(14,2) NOT NULL,
    used numeric(14,2) NOT NULL,
    catatan text,
    kondisi text,
    uploaded_by bigint NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_aktif boolean DEFAULT true NOT NULL
);


--
-- Name: laporan_mitra_laporan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.laporan_mitra_laporan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: laporan_mitra_laporan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.laporan_mitra_laporan_id_seq OWNED BY public.laporan_mitra.laporan_id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id bigint NOT NULL,
    user_id bigint,
    role public.user_role,
    type public.notification_type DEFAULT 'info'::public.notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_id_seq OWNED BY public.notification.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id text NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permintaan_boq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permintaan_boq (
    permintaan_id bigint NOT NULL,
    project_id bigint NOT NULL,
    tiket_id bigint,
    barang_id bigint NOT NULL,
    qty_usulan numeric(14,2) NOT NULL,
    alasan text,
    status public.permintaan_boq_status DEFAULT 'diajukan'::public.permintaan_boq_status NOT NULL,
    diajukan_oleh bigint NOT NULL,
    ditinjau_oleh bigint,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permintaan_boq_permintaan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permintaan_boq_permintaan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permintaan_boq_permintaan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permintaan_boq_permintaan_id_seq OWNED BY public.permintaan_boq.permintaan_id;


--
-- Name: personil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personil (
    personil_id bigint NOT NULL,
    nama text NOT NULL,
    jenis public.personil_jenis NOT NULL,
    no_hp text,
    nik text,
    email text,
    posisi text,
    bisa_menyetir boolean DEFAULT false,
    is_material_handler boolean DEFAULT false,
    foto text,
    user_id bigint,
    gudang_id bigint,
    is_dummy boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL,
    is_aktif boolean DEFAULT true NOT NULL
);


--
-- Name: personil_personil_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personil_personil_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personil_personil_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personil_personil_id_seq OWNED BY public.personil.personil_id;


--
-- Name: project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project (
    project_id bigint NOT NULL,
    nama_project text NOT NULL,
    title text,
    cluster_id text,
    area text,
    klien text,
    kecamatan text,
    desa_kelurahan text,
    kota_kabupaten text,
    provinsi text,
    status_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL
);


--
-- Name: project_project_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_project_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_project_id_seq OWNED BY public.project.project_id;


--
-- Name: reconciliation_upload_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_upload_detail (
    detail_id bigint NOT NULL,
    upload_id bigint NOT NULL,
    kode_tiket text NOT NULL,
    mos numeric(14,2) NOT NULL,
    used numeric(14,2) NOT NULL,
    status public.reconciliation_detail_status NOT NULL,
    reason text
);


--
-- Name: reconciliation_upload_detail_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_upload_detail_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_upload_detail_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reconciliation_upload_detail_detail_id_seq OWNED BY public.reconciliation_upload_detail.detail_id;


--
-- Name: reconciliation_upload_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_upload_log (
    upload_id bigint NOT NULL,
    filename text NOT NULL,
    file_url text,
    uploaded_by bigint NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_rows integer NOT NULL,
    success_rows integer NOT NULL,
    failed_rows integer NOT NULL
);


--
-- Name: reconciliation_upload_log_upload_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_upload_log_upload_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_upload_log_upload_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reconciliation_upload_log_upload_id_seq OWNED BY public.reconciliation_upload_log.upload_id;


--
-- Name: satuan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.satuan (
    satuan_id bigint NOT NULL,
    kode_satuan text NOT NULL
);


--
-- Name: satuan_satuan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.satuan_satuan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: satuan_satuan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.satuan_satuan_id_seq OWNED BY public.satuan.satuan_id;


--
-- Name: stok_gudang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stok_gudang (
    stok_id bigint NOT NULL,
    gudang_id bigint NOT NULL,
    barang_id bigint NOT NULL,
    project_id bigint,
    kondisi public.kondisi_barang DEFAULT 'baik'::public.kondisi_barang NOT NULL,
    qty numeric(14,2) DEFAULT 0 NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    zona_id bigint
);


--
-- Name: stok_gudang_stok_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stok_gudang_stok_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stok_gudang_stok_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stok_gudang_stok_id_seq OWNED BY public.stok_gudang.stok_id;


--
-- Name: stok_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stok_ledger (
    ledger_id bigint NOT NULL,
    surat_jalan_item_id bigint NOT NULL,
    barang_id bigint NOT NULL,
    jenis_mutasi public.mutasi_jenis NOT NULL,
    qty numeric(14,2) NOT NULL,
    saldo_setelah numeric(14,2) NOT NULL,
    waktu_mutasi timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stok_ledger_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stok_ledger_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stok_ledger_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stok_ledger_ledger_id_seq OWNED BY public.stok_ledger.ledger_id;


--
-- Name: supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier (
    supplier_id bigint NOT NULL,
    kode text NOT NULL,
    nama text NOT NULL,
    deskripsi text,
    is_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_supplier_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_supplier_id_seq OWNED BY public.supplier.supplier_id;


--
-- Name: surat_jalan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surat_jalan (
    surat_jalan_id bigint NOT NULL,
    nomor_surat_jalan text NOT NULL,
    tipe public.surat_jalan_tipe NOT NULL,
    boq_id bigint,
    gudang_asal_id bigint,
    gudang_tujuan_id bigint,
    kendaraan_id bigint,
    personil_pengantar_id bigint,
    status public.surat_jalan_status DEFAULT 'draft_diajukan'::public.surat_jalan_status NOT NULL,
    kategori_approval text,
    tanggal timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tanggal_disetujui timestamp(3) without time zone,
    tanggal_digenerate timestamp(3) without time zone,
    tanggal_diterima timestamp(3) without time zone,
    project_id bigint,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL,
    surat_jalan_url text,
    pic_pemohon_nama text,
    catatan text,
    pengirim_eksternal_nama text,
    tipe_pengirim public.tipe_pengirim_enum,
    titik_lapangan_id bigint,
    tujuan_tipe public.tujuan_tipe_enum,
    supplier_id bigint
);


--
-- Name: surat_jalan_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surat_jalan_item (
    item_id bigint NOT NULL,
    surat_jalan_id bigint NOT NULL,
    barang_id bigint NOT NULL,
    qty numeric(14,2) NOT NULL,
    satuan_id bigint NOT NULL,
    kondisi public.kondisi_barang,
    serial_number text,
    foto_url text,
    is_kelebihan boolean DEFAULT false NOT NULL,
    catatan text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    zona_id bigint,
    diperiksa_oleh bigint,
    diperiksa_pada timestamp(3) without time zone
);


--
-- Name: surat_jalan_item_foto_foto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surat_jalan_item_foto_foto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surat_jalan_item_foto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surat_jalan_item_foto (
    foto_id bigint DEFAULT nextval('public.surat_jalan_item_foto_foto_id_seq'::regclass) NOT NULL,
    item_id bigint NOT NULL,
    url text NOT NULL,
    filename text,
    mimetype text,
    ukuran_bytes bigint,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: surat_jalan_item_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surat_jalan_item_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surat_jalan_item_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surat_jalan_item_item_id_seq OWNED BY public.surat_jalan_item.item_id;


--
-- Name: surat_jalan_surat_jalan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surat_jalan_surat_jalan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surat_jalan_surat_jalan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surat_jalan_surat_jalan_id_seq OWNED BY public.surat_jalan.surat_jalan_id;


--
-- Name: tiket_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiket_material (
    tiket_id bigint NOT NULL,
    kode_tiket text NOT NULL,
    project_id bigint NOT NULL,
    area text,
    mos numeric(14,2),
    used numeric(14,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by bigint NOT NULL,
    used_terpasang numeric(14,2)
);


--
-- Name: tiket_material_tiket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tiket_material_tiket_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tiket_material_tiket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tiket_material_tiket_id_seq OWNED BY public.tiket_material.tiket_id;


--
-- Name: titik_lapangan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titik_lapangan (
    titik_lapangan_id bigint NOT NULL,
    project_id bigint NOT NULL,
    nama_lokasi text NOT NULL,
    latitude text,
    longitude text,
    alamat text,
    is_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by bigint NOT NULL,
    updated_by bigint NOT NULL
);


--
-- Name: titik_lapangan_titik_lapangan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titik_lapangan_titik_lapangan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titik_lapangan_titik_lapangan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titik_lapangan_titik_lapangan_id_seq OWNED BY public.titik_lapangan.titik_lapangan_id;


--
-- Name: user_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_account (
    user_id bigint NOT NULL,
    nama text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public.user_role NOT NULL,
    is_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL
);


--
-- Name: user_account_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_account_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_account_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_account_user_id_seq OWNED BY public.user_account.user_id;


--
-- Name: zona_gudang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zona_gudang (
    zona_id bigint NOT NULL,
    gudang_id bigint NOT NULL,
    kode_zona text NOT NULL,
    nama_zona text,
    tipe_zona text,
    status_kecukupan public.status_kecukupan_zona DEFAULT 'CUKUP'::public.status_kecukupan_zona,
    dinilai_oleh bigint,
    dinilai_pada timestamp(3) without time zone,
    kapasitas_maksimum integer,
    status_kecukupan_source public.status_kecukupan_source,
    CONSTRAINT zona_gudang_kapasitas_maksimum_positive_chk CHECK (((kapasitas_maksimum IS NULL) OR (kapasitas_maksimum > 0)))
);


--
-- Name: zona_gudang_zona_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zona_gudang_zona_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zona_gudang_zona_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zona_gudang_zona_id_seq OWNED BY public.zona_gudang.zona_id;


--
-- Name: zona_utilisasi_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zona_utilisasi_log (
    log_id bigint NOT NULL,
    zona_id bigint NOT NULL,
    status public.status_kecukupan_zona NOT NULL,
    diperbarui_oleh bigint NOT NULL,
    catatan text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: zona_utilisasi_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zona_utilisasi_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zona_utilisasi_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zona_utilisasi_log_log_id_seq OWNED BY public.zona_utilisasi_log.log_id;


--
-- Name: approval_log approval_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_log ALTER COLUMN approval_id SET DEFAULT nextval('public.approval_log_approval_id_seq'::regclass);


--
-- Name: audit_log audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_log_audit_id_seq'::regclass);


--
-- Name: barang barang_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang ALTER COLUMN barang_id SET DEFAULT nextval('public.barang_barang_id_seq'::regclass);


--
-- Name: boq boq_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq ALTER COLUMN boq_id SET DEFAULT nextval('public.boq_boq_id_seq'::regclass);


--
-- Name: boq_item boq_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item ALTER COLUMN boq_item_id SET DEFAULT nextval('public.boq_item_boq_item_id_seq'::regclass);


--
-- Name: gudang gudang_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang ALTER COLUMN gudang_id SET DEFAULT nextval('public.gudang_gudang_id_seq'::regclass);


--
-- Name: kategori_barang kategori_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori_barang ALTER COLUMN kategori_id SET DEFAULT nextval('public.kategori_barang_kategori_id_seq'::regclass);


--
-- Name: kendaraan kendaraan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kendaraan ALTER COLUMN kendaraan_id SET DEFAULT nextval('public.kendaraan_kendaraan_id_seq'::regclass);


--
-- Name: laporan_mitra laporan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan_mitra ALTER COLUMN laporan_id SET DEFAULT nextval('public.laporan_mitra_laporan_id_seq'::regclass);


--
-- Name: notification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification ALTER COLUMN id SET DEFAULT nextval('public.notification_id_seq'::regclass);


--
-- Name: permintaan_boq permintaan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq ALTER COLUMN permintaan_id SET DEFAULT nextval('public.permintaan_boq_permintaan_id_seq'::regclass);


--
-- Name: personil personil_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil ALTER COLUMN personil_id SET DEFAULT nextval('public.personil_personil_id_seq'::regclass);


--
-- Name: project project_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project ALTER COLUMN project_id SET DEFAULT nextval('public.project_project_id_seq'::regclass);


--
-- Name: reconciliation_upload_detail detail_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_detail ALTER COLUMN detail_id SET DEFAULT nextval('public.reconciliation_upload_detail_detail_id_seq'::regclass);


--
-- Name: reconciliation_upload_log upload_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_log ALTER COLUMN upload_id SET DEFAULT nextval('public.reconciliation_upload_log_upload_id_seq'::regclass);


--
-- Name: satuan satuan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satuan ALTER COLUMN satuan_id SET DEFAULT nextval('public.satuan_satuan_id_seq'::regclass);


--
-- Name: stok_gudang stok_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang ALTER COLUMN stok_id SET DEFAULT nextval('public.stok_gudang_stok_id_seq'::regclass);


--
-- Name: stok_ledger ledger_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_ledger ALTER COLUMN ledger_id SET DEFAULT nextval('public.stok_ledger_ledger_id_seq'::regclass);


--
-- Name: supplier supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier ALTER COLUMN supplier_id SET DEFAULT nextval('public.supplier_supplier_id_seq'::regclass);


--
-- Name: surat_jalan surat_jalan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan ALTER COLUMN surat_jalan_id SET DEFAULT nextval('public.surat_jalan_surat_jalan_id_seq'::regclass);


--
-- Name: surat_jalan_item item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item ALTER COLUMN item_id SET DEFAULT nextval('public.surat_jalan_item_item_id_seq'::regclass);


--
-- Name: tiket_material tiket_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiket_material ALTER COLUMN tiket_id SET DEFAULT nextval('public.tiket_material_tiket_id_seq'::regclass);


--
-- Name: titik_lapangan titik_lapangan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titik_lapangan ALTER COLUMN titik_lapangan_id SET DEFAULT nextval('public.titik_lapangan_titik_lapangan_id_seq'::regclass);


--
-- Name: user_account user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account ALTER COLUMN user_id SET DEFAULT nextval('public.user_account_user_id_seq'::regclass);


--
-- Name: zona_gudang zona_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_gudang ALTER COLUMN zona_id SET DEFAULT nextval('public.zona_gudang_zona_id_seq'::regclass);


--
-- Name: zona_utilisasi_log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_utilisasi_log ALTER COLUMN log_id SET DEFAULT nextval('public.zona_utilisasi_log_log_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
939eacc3-e301-4905-b263-dfbd6a8f9afc	520bf630b24bc56f5ee46f7b86716481105945f42ebeb804b4cec090f41481cb	2026-09-07 14:31:05.562341+07	20260814182706_init	\N	\N	2026-09-07 14:30:56.2503+07	1
0a879566-718b-403d-95bb-de14aff40ec6	bdc85ddb6d1b1a92eb01f889a5cd7986ad2382805145a6abd715d56227339a1b	2026-09-07 14:31:26.35277+07	20260831095000_add_missing_surat_jalan_status_variants	\N	\N	2026-09-07 14:31:26.299954+07	1
cbee4efb-e11d-4edf-a570-500f2cb6ef6e	4dc57876f68000456140074878ad39ef1f2171fd0f917739d835a70e2b828bca	2026-09-07 14:31:05.755549+07	20260815150455_make_satuan_id_nullable	\N	\N	2026-09-07 14:31:05.609626+07	1
c7aeb893-b4bc-477c-9ffd-cc47a87cb21d	9f4d5a25d72fd6cd93dbcf2c02a831ee544d718113cc858858ae6eee184f2b5f	2026-09-07 14:31:05.922044+07	20260828103840_	\N	\N	2026-09-07 14:31:05.804474+07	1
dd792071-fcde-4d50-9137-1dfe17916982	bbbb2e6fc8c13aa39ad7f5d981341f5e954cb56b6204118233f4ad4bbd1d3eff	2026-09-07 14:31:06.08438+07	20260829_add_putaway_retrieve_audit_aksi	\N	\N	2026-09-07 14:31:05.936061+07	1
4cb44268-4c08-4e96-b5bf-f9083723202b	8432c3586f4554dd1dc6414a73ed88f67967153df900aa5f9560b73c854e9d47	2026-09-07 14:31:27.268755+07	20260831100855_add_reconciliation_upload_log	\N	\N	2026-09-07 14:31:26.409716+07	1
045e5ae0-d6c2-4e0e-8387-fa7230c9e0ca	ec4ad4c25cbc5af6996ea04c39fb85281ae1129037d9eedd7f6324f35059a728	2026-09-07 14:31:06.111855+07	20260829_add_zona_id_to_stok_and_sj_item	\N	\N	2026-09-07 14:31:06.104748+07	1
45ff634e-e8c3-4200-bee6-d820df907b3d	3701a744ac9cb010a4af04c08cfd243c352e2ee018728965094bb75412a983a0	2026-09-07 14:31:06.263967+07	20260829_drop_bin_lokasi_id_columns	\N	\N	2026-09-07 14:31:06.114814+07	1
18501ced-0c9f-4dea-8d56-728101fd935a	e607d3745f759e2028f731b137b1b37635ded01901af66d698e81df52ce02291	2026-09-09 17:11:35.05796+07	20260909101134_add_used_terpasang_to_tiket_material	\N	\N	2026-09-09 17:11:35.039963+07	1
fe9b73d4-0a4d-4630-82b3-100872b85f31	b3e2a8de00148a10ff8e8097f50ddcf3d5f5fb02b427bc5b7603153143ae92e8	2026-09-07 14:31:06.511957+07	20260829_drop_rak_bin_tables	\N	\N	2026-09-07 14:31:06.315492+07	1
357cd797-f69f-43fc-a79a-cf1b35da40e4	f5267bf18f892baeaf35bd8517fcd215f48526305d8f17b86ff972f90c105e28	2026-09-07 14:31:27.336773+07	20260901222822_add_pic_pemohon_nama_to_surat_jalan	\N	\N	2026-09-07 14:31:27.292552+07	1
a0355015-4462-4914-8eb0-91fa6754cdb1	ec4ad4c25cbc5af6996ea04c39fb85281ae1129037d9eedd7f6324f35059a728	2026-09-07 14:31:06.666368+07	20260829_replace_utilisasi_with_manual_status	\N	\N	2026-09-07 14:31:06.569829+07	1
c342dcb7-2928-48d2-9257-9d5da0c7b657	ee0fbaf241bed25efa3711feb5840344aaa1a9a7b0c1b3bf92d61f7c88fe042c	2026-09-07 14:31:06.917065+07	20260830182933_add_selesai_to_boq_status	\N	\N	2026-09-07 14:31:06.71463+07	1
36320e97-fca7-49e5-beff-010f50f20665	efea807200b1a5e28f682df2663a15cc23b609d1d8b8f366bd497f68472ef2ff	2026-09-07 14:31:07.126867+07	20260830184426_sync_zona_gudang_kecukupan_area	\N	\N	2026-09-07 14:31:06.973834+07	1
cb7c54b6-0e9b-45dc-a9ee-e58c5f95a105	c1292c37255ae3092f6130f61fa7e48964286a679a765b6317c614c9416461ff	2026-09-07 14:31:27.540406+07	20260901230730_add_create_inbound_outbound_to_audit_aksi	\N	\N	2026-09-07 14:31:27.359224+07	1
7a801f51-4bcd-4c18-ae32-8426552afde8	a77003b4a828b41309c805eba733eb1ee416ff42a6d771da104c3dd7bcbc843f	2026-09-07 14:31:25.917779+07	20260830184530_sync_zona_gudang_kecukupan_area	\N	\N	2026-09-07 14:31:07.178199+07	1
f27093b1-b0ed-4c60-b8e2-39605740ae3b	1303d3cad873ac7cee06eff012d4cc2c9502bc02f82418c2879344fa4d84bf13	2026-09-07 14:31:26.144155+07	20260830190000_add_surat_jalan_item_foto_and_verification	\N	\N	2026-09-07 14:31:25.951215+07	1
9e6db9a0-77d6-4951-ba3e-927e9dc602e5	9784d3c47d27212b7599841c2c61fa2a4df633336616743a9ad7448ed21d05aa	2026-09-13 20:20:44.357413+07	20260913132044_add_default_gudang_tipe	\N	\N	2026-09-13 20:20:44.32713+07	1
75646ac1-5d72-455f-9cd9-546e12596701	47d7f736412c0032a63760bac52ee82d43ca789311243b470e3f926347291709	2026-09-07 14:31:26.289557+07	20260831094000_add_sedang_dikirim_enum	\N	\N	2026-09-07 14:31:26.147083+07	1
1962807e-2c6a-481e-9e53-4fbaf1d2c7d9	9eba217b77c580ee1c7da09f569f9532191ae869083682b5a3a70e3fa3a9b382	2026-09-07 14:31:27.614142+07	20260904194043_add_catatan_to_surat_jalan	\N	\N	2026-09-07 14:31:27.565407+07	1
f2ffdd2b-e205-4fb3-87bf-9a4608296c27	c37c772378c1375910d6aa0a5c1c766a6d3269da6ead778d0b59b40507b85b63	2026-09-10 14:46:13.206099+07	20260910074613_add_gudang_id_to_kendaraan	\N	\N	2026-09-10 14:46:13.101026+07	1
128b341b-0ab2-4074-b605-85a78efa5993	8dc99bbabd2f0b637dab787881d05d3b16cc1cff0c28fe1784fd188d14ebf070	2026-09-07 14:31:27.703099+07	20260905170000_capacity_monitoring	\N	\N	2026-09-07 14:31:27.636673+07	1
382fc0cb-259b-444b-abe5-c8e531ba49a7	b15b5bae99594d2f0128cfb7253da2d416cb2b411b8c7ea03496b67f5e1b897b	2026-09-07 14:43:20.538637+07	20260907074319_add_notification_table	\N	\N	2026-09-07 14:43:20.031674+07	1
c43fc379-08ac-4f1e-ae28-37ea040f27da	5eeb8eeef27e355d47c1229e300ff2fa3bd05068de4e81646210c7c2e42f605c	2026-09-08 15:49:20.429535+07	20260908084920_add_titik_lapangan_and_pengirim_fields	\N	\N	2026-09-08 15:49:20.260936+07	1
4ef35c74-23f8-4b88-ad97-d6806e9e851d	8ba1d99d26d5b0d2f92fb8aa13dc1f08a4080be7c5b013db56e5cfb437ae4fcb	2026-09-12 00:32:48.565916+07	20260911173248_add_email_reference_to_boq	\N	\N	2026-09-12 00:32:48.550746+07	1
4efe634a-a4bb-4ca0-9c4f-b36ca8cbe308	66f280653d8a3c782ebd0cbe2abcb60e76a09ff26e744fa7b4404853e4f24807	2026-09-12 21:03:57.708585+07	20260912140357_add_must_change_password	\N	\N	2026-09-12 21:03:57.651328+07	1
6caa1d37-af08-4430-9169-c6ed88e9985e	9ac25334ce9841439157ca1edcda8b1b65e655c0781b0586a758fe419ef2a646	2026-09-15 15:51:09.169014+07	20260915085109_add_supplier_model	\N	\N	2026-09-15 15:51:09.061841+07	1
c350fb1e-4484-405d-a7c3-8b5d086e03d8	4d62ad543c33610d7a30ecf1cedd8a359cf3eb11a85cb3d98713199a57f97e40	2026-09-13 00:14:29.120627+07	20260912171428_add_laporan_mitra	\N	\N	2026-09-13 00:14:28.950053+07	1
8022c53f-5be8-4e64-8a20-98726ab0f1ff	2dd624fa62cea2ef2f1ce164391347e479cbe3a647e3a300cf86aa25d5dd5ae8	2026-09-15 16:52:33.441741+07	20260915095233_add_supplier_id_to_surat_jalan	\N	\N	2026-09-15 16:52:33.384128+07	1
\.


--
-- Data for Name: approval_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approval_log (approval_id, entity_type, entity_id, tahap, status, approver_id, catatan, created_at) FROM stdin;
1	surat_jalan	8	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-08 05:35:14.105
2	surat_jalan	8	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-08 05:36:09.384
3	surat_jalan	8	inbound_verifikasi	disetujui	5	\N	2026-09-08 05:39:08.069
4	surat_jalan	8	inbound_putaway	disetujui	8	\N	2026-09-08 05:41:59.037
5	surat_jalan	9	outbound_approval	disetujui	5	\N	2026-09-08 05:55:00.085
6	surat_jalan	21	inbound_verifikasi	disetujui	5	\N	2026-09-10 08:09:51.917
7	surat_jalan	21	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-10 08:12:04.666
8	surat_jalan	21	inbound_putaway	disetujui	8	\N	2026-09-10 08:13:24.842
9	surat_jalan	23	outbound_approval	disetujui	5	\N	2026-09-10 08:44:06.38
10	surat_jalan	24	inbound_verifikasi	disetujui	5	\N	2026-09-11 07:36:39.119
11	surat_jalan	24	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-11 07:47:37.703
12	surat_jalan	24	inbound_putaway	disetujui	8	\N	2026-09-11 07:47:54.193
13	surat_jalan	25	outbound_approval	disetujui	5	\N	2026-09-11 08:18:49.656
14	surat_jalan	25	outbound_approval	disetujui	8	\N	2026-09-11 08:20:16.764
15	surat_jalan	26	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-11 14:23:33.004
16	surat_jalan	26	inbound_verifikasi	disetujui	5	\N	2026-09-11 14:32:54.615
17	surat_jalan	20	inbound_verifikasi	ditolak	5	Kurang cocok sih	2026-09-11 14:33:06.553
18	surat_jalan	26	inbound_putaway	disetujui	8	\N	2026-09-11 14:37:43.477
19	surat_jalan	27	outbound_approval	disetujui	5	\N	2026-09-11 14:49:56.132
20	surat_jalan	7	inbound_verifikasi	disetujui	5	\N	2026-09-18 12:32:52.468
21	surat_jalan	7	inbound_putaway	menunggu	8	Penerimaan dicatat staf.	2026-09-18 12:32:55.915
22	surat_jalan	7	inbound_putaway	disetujui	8	\N	2026-09-18 12:33:26.081
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (audit_id, entity_type, entity_id, aksi, actor_id, data_sebelum, data_sesudah, created_at) FROM stdin;
1	surat_jalan	7	create_inbound	8	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "7", "gudang_tujuan_id": "2", "nomor_surat_jalan": "23-sj"}	2026-09-07 07:49:52.942
2	boq	6	create	4	null	{"status": "draft", "tiket_id": "10", "boq_number": "BOQ-2026-0001", "item_count": 10}	2026-09-08 05:23:03.838
3	surat_jalan	8	create_inbound	8	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "8", "gudang_tujuan_id": "2", "nomor_surat_jalan": "SJ-IN-0268"}	2026-09-08 05:31:57.385
4	surat_jalan	8	receive_inbound	8	{"status": "menunggu_verifikasi"}	{"status": "draft_diajukan", "items_updated": 7, "surat_jalan_id": "8"}	2026-09-08 05:35:14.11
5	surat_jalan	8	receive_inbound	8	{"status": "menunggu_verifikasi"}	{"status": "draft_diajukan", "items_updated": 7, "surat_jalan_id": "8"}	2026-09-08 05:36:09.387
6	surat_jalan	8	approve_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ready_putaway", "surat_jalan_id": "8"}	2026-09-08 05:39:08.073
7	surat_jalan	8	putaway	8	{"status": "ready_putaway"}	{"status": "diterima_didistribusikan", "surat_jalan_id": "8"}	2026-09-08 05:41:59.041
8	boq	6	update	4	{"status": "draft"}	{"boq_id": 6, "status": "aktif"}	2026-09-08 05:51:17.62
9	surat_jalan	9	create_outbound	8	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "2", "surat_jalan_id": "9", "gudang_tujuan_id": "1", "nomor_surat_jalan": "800601/SJ/OUT/DIGITAK/IX/2026"}	2026-09-08 05:53:20.659
10	surat_jalan	9	approve_outbound	5	{"status": "draft_diajukan"}	{"status": "disetujui", "surat_jalan_id": "9"}	2026-09-08 05:55:00.088
11	surat_jalan	10	create_outbound	1	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "1", "surat_jalan_id": "10", "gudang_tujuan_id": "2", "nomor_surat_jalan": "TEST-SJ-ACTIVE-BOQ"}	2026-09-08 06:59:31.735
12	surat_jalan	12	create_outbound	1	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "1", "surat_jalan_id": "12", "gudang_tujuan_id": "2", "nomor_surat_jalan": "E2E-TEST-OUT-GUDANG-INT"}	2026-09-08 19:31:01.758
13	surat_jalan	14	create_outbound	1	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": null, "surat_jalan_id": "14", "gudang_tujuan_id": null, "nomor_surat_jalan": "E2E-TEST-OUT-LAPANGAN-EXT"}	2026-09-08 19:32:39.096
14	surat_jalan	20	create_inbound	1	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "20", "gudang_tujuan_id": null, "nomor_surat_jalan": "E2E-TEST-IN-LAPANGAN"}	2026-09-08 19:32:39.187
15	boq	7	create	4	null	{"status": "draft", "tiket_id": "11", "boq_number": "BOQ-2026-0002", "item_count": 10}	2026-09-10 07:18:53.007
16	boq	7	update	4	{"status": "draft"}	{"boq_id": 7, "status": "aktif"}	2026-09-10 07:19:24.682
17	surat_jalan	21	create_inbound	8	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "21", "gudang_tujuan_id": "1", "nomor_surat_jalan": "SJ-IN-0275"}	2026-09-10 08:01:03.99
18	surat_jalan	21	approve_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ready_putaway", "surat_jalan_id": "21"}	2026-09-10 08:09:51.924
19	surat_jalan	21	receive_inbound	8	{"status": "ready_putaway"}	{"status": "draft_diajukan", "items_updated": 6, "surat_jalan_id": "21"}	2026-09-10 08:12:04.67
20	surat_jalan	21	putaway	8	{"status": "ready_putaway"}	{"status": "diterima_didistribusikan", "surat_jalan_id": "21"}	2026-09-10 08:13:24.843
21	surat_jalan	22	create_outbound	8	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "1", "surat_jalan_id": "22", "gudang_tujuan_id": "2", "nomor_surat_jalan": "751909/SJ/OUT/DIGITAK/IX/2026"}	2026-09-10 08:25:51.934
22	surat_jalan	23	create_outbound	8	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "1", "surat_jalan_id": "23", "gudang_tujuan_id": "2", "nomor_surat_jalan": "826609/SJ/OUT/DIGITAK/IX/2026"}	2026-09-10 08:43:46.634
23	surat_jalan	23	approve_outbound	5	{"status": "draft_diajukan"}	{"status": "disetujui", "surat_jalan_id": "23"}	2026-09-10 08:44:06.383
24	boq	8	create	4	null	{"status": "draft", "tiket_id": "12", "boq_number": "BOQ-2026-0003", "item_count": 10}	2026-09-11 07:32:47.92
25	boq	8	update	4	{"status": "draft"}	{"boq_id": 8, "status": "aktif"}	2026-09-11 07:33:05.016
26	surat_jalan	24	create_inbound	8	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "24", "gudang_tujuan_id": "2", "nomor_surat_jalan": "SJ-IN/2026/09-0156"}	2026-09-11 07:35:36.336
27	surat_jalan	24	approve_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ready_putaway", "surat_jalan_id": "24"}	2026-09-11 07:36:39.122
28	surat_jalan	24	receive_inbound	8	{"status": "ready_putaway"}	{"status": "draft_diajukan", "items_updated": 5, "surat_jalan_id": "24"}	2026-09-11 07:47:37.707
29	surat_jalan	24	putaway	8	{"status": "ready_putaway"}	{"status": "diterima_didistribusikan", "surat_jalan_id": "24"}	2026-09-11 07:47:54.194
30	surat_jalan	25	create_outbound	8	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "2", "surat_jalan_id": "25", "gudang_tujuan_id": "1", "nomor_surat_jalan": "692783/SJ/OUT/DIGITAK/IX/2026"}	2026-09-11 08:18:12.812
31	surat_jalan	25	approve_outbound	5	{"status": "draft_diajukan"}	{"status": "disetujui", "surat_jalan_id": "25"}	2026-09-11 08:18:49.659
32	surat_jalan	25	retrieve	8	{"status": "disetujui"}	{"status": "disetujui", "surat_jalan_id": "25"}	2026-09-11 08:20:16.767
33	boq	9	create	4	null	{"status": "draft", "tiket_id": "13", "boq_number": "BOQ-2026-0004", "item_count": 8}	2026-09-11 10:40:01.486
34	boq	9	update	4	{"status": "draft"}	{"boq_id": 9, "status": "aktif"}	2026-09-11 10:42:17.064
35	surat_jalan	26	create_inbound	8	null	{"tipe": "inbound", "status": "menunggu_verifikasi", "surat_jalan_id": "26", "gudang_tujuan_id": "2", "nomor_surat_jalan": "SJ-IN/2026/09-0157"}	2026-09-11 14:18:20.481
36	surat_jalan	26	receive_inbound	8	{"status": "menunggu_verifikasi"}	{"status": "draft_diajukan", "items_updated": 5, "surat_jalan_id": "26"}	2026-09-11 14:23:33.008
37	surat_jalan	26	approve_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ready_putaway", "surat_jalan_id": "26"}	2026-09-11 14:32:54.618
38	surat_jalan	20	reject_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ditolak", "catatan": "Kurang cocok sih", "surat_jalan_id": "20"}	2026-09-11 14:33:06.556
39	surat_jalan	26	putaway	8	{"status": "ready_putaway"}	{"status": "diterima_didistribusikan", "surat_jalan_id": "26"}	2026-09-11 14:37:43.48
40	surat_jalan	27	create_outbound	8	null	{"tipe": "outbound", "status": "draft_diajukan", "gudang_asal_id": "2", "surat_jalan_id": "27", "gudang_tujuan_id": "1", "nomor_surat_jalan": "062353/SJ/OUT/DIGITAK/IX/2026"}	2026-09-11 14:47:42.375
41	surat_jalan	27	approve_outbound	5	{"status": "draft_diajukan"}	{"status": "disetujui", "surat_jalan_id": "27"}	2026-09-11 14:49:56.134
42	boq	10	create	4	null	{"status": "draft", "tiket_id": "14", "boq_number": "BOQ-2026-0005", "item_count": 1}	2026-09-11 17:40:48.975
43	boq	10	update	4	{"status": "draft"}	{"boq_id": 10, "status": "aktif"}	2026-09-11 20:05:38.504
44	boq	10	update	4	{"status": "aktif"}	{"boq_id": 10, "status": "selesai"}	2026-09-11 20:07:03.114
45	surat_jalan	7	approve_inbound	5	{"status": "menunggu_verifikasi"}	{"status": "ready_putaway", "surat_jalan_id": "7"}	2026-09-18 12:32:52.476
46	surat_jalan	7	receive_inbound	8	{"status": "ready_putaway"}	{"status": "draft_diajukan", "items_updated": 1, "surat_jalan_id": "7"}	2026-09-18 12:32:55.917
47	surat_jalan	7	putaway	8	{"status": "ready_putaway"}	{"status": "diterima_didistribusikan", "surat_jalan_id": "7"}	2026-09-18 12:33:26.083
\.


--
-- Data for Name: barang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.barang (barang_id, kode_perangkat, nama_barang, kategori_id, satuan_default_id, foto, created_at, updated_at, created_by, updated_by) FROM stdin;
5	[01-013-00010]	24 CORE 4 FRP MICRO CABLE	1	3	\N	2026-09-07 07:31:36.666	2026-09-07 07:31:36.666	1	1
14	CPT-00620	BRACKET TIANG DROP WIRE	1	1	\N	2026-09-07 07:31:36.809	2026-09-07 07:31:36.809	1	1
15	CPT-00623	BRACKET TIANG FLEXIBEL BEHEL PER (BRACKET C)	1	1	\N	2026-09-07 07:31:36.824	2026-09-07 07:31:36.824	1	1
16	29000001	Strength Clamp Buaya 50/70	1	1	\N	2026-09-07 07:31:36.841	2026-09-07 07:31:36.841	1	1
17	29000002	Strength Clamp Buaya 70/95	1	1	\N	2026-09-07 07:31:36.856	2026-09-07 07:31:36.856	1	1
23	CBL-00229	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 250 METER	1	3	\N	2026-09-07 07:31:36.937	2026-09-07 07:31:36.937	1	1
24	CBL-00231	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 300 METER	1	3	\N	2026-09-07 07:31:36.953	2026-09-07 07:31:36.953	1	1
26	CPT-00655	BRACKET X-FRAME BEHEL 12X65X65	1	4	\N	2026-09-07 07:31:36.984	2026-09-07 07:31:36.984	1	1
27	CPT-00630	BRACKET COILAN X-FRAME (BESAR 4 PER)	1	4	\N	2026-09-07 07:31:37	2026-09-07 07:31:37	1	1
29	CPT-00718	DUDUKAN CLOUSURE BRACKET COILAN X-FRAME (MODEL BARU)	1	1	\N	2026-09-07 07:31:37.019	2026-09-07 07:31:37.019	1	1
30	CPT-00914	MUR + BAUT STENLIS M10 - 1.5 X 45	1	1	\N	2026-09-07 07:31:37.032	2026-09-07 07:31:37.032	1	1
40	In MSP	Precon 3m (Produksi in-House MSP)	1	4	\N	2026-09-07 07:31:37.175	2026-09-07 07:31:37.175	1	1
44	[01-013-08487]	CLAMP DROP WIRE ( S CLAMP )	1	1	http://localhost:5000/uploads/file-1788844125949-380895650.jpg	2026-09-07 07:31:37.223	2026-09-07 07:31:37.223	1	4
43	[01-013-01157]	STOPPING BUCKLER	1	1	http://localhost:5000/uploads/file-1788844151170-783798313.jpg	2026-09-07 07:31:37.207	2026-09-07 07:31:37.207	1	4
1	[01-013-13103]	TIANG 7 METER - 3" OD.90 X 2.8 X 7000	1	4	\N	2026-09-07 07:31:36.549	2026-09-07 07:31:36.549	1	1
2	[01-013-13104]	TIANG 6 METER - 2" OD.57 X 1.5 X 6000	1	4	\N	2026-09-07 07:31:36.565	2026-09-07 07:31:36.565	1	1
57	230204	Laptop MSI Modern 14 B5M	6	4	http://localhost:5000/uploads/file-1788844247321-717302376.jpg	2026-09-08 05:10:47.386	2026-09-08 05:10:47.386	4	4
52	01-013-13101	TIANG 9 METER - 3" OD.90 X 2.8 X 9000	1	4	http://localhost:5000/uploads/file-1788843804509-804282286.jpg	2026-09-07 07:31:37.318	2026-09-07 07:31:37.318	1	4
3	NWK-00468	CLOSURE DACK 288 CORE FIBERTRON (LOGO)	2	4	\N	2026-09-07 07:31:36.582	2026-09-07 07:31:36.582	1	1
4	NWK-00466	CLOSURE DACK 144 CORE FIBERTRON (LOGO)	2	4	\N	2026-09-07 07:31:36.637	2026-09-07 07:31:36.637	1	1
6	CBL-00043	KABEL FO 48 CORE ZTT 2024	1	3	\N	2026-09-07 07:31:36.678	2026-09-07 07:31:36.678	1	1
7	[01-013-00406]	KABEL FO 48 CORE- 8 T 2023	1	3	\N	2026-09-07 07:31:36.693	2026-09-07 07:31:36.693	1	1
8	[01-013-00344]	KABEL FO 48 CORE- 4 T 2023	1	3	\N	2026-09-07 07:31:36.714	2026-09-07 07:31:36.714	1	1
9	CBL-00461	KABEL FO 24/2T ZTT 2024	1	3	\N	2026-09-07 07:31:36.73	2026-09-07 07:31:36.73	1	1
10	CBL-00465	KABEL FO 144C/12T ZTT 2024	1	3	\N	2026-09-07 07:31:36.745	2026-09-07 07:31:36.745	1	1
11	10001296	KABEL FO 96C/8T ZTT 2024	1	3	\N	2026-09-07 07:31:36.761	2026-09-07 07:31:36.761	1	1
12	01-013-01273	KABEL FO 96/8T ZTT 2022	1	3	\N	2026-09-07 07:31:36.777	2026-09-07 07:31:36.777	1	1
13	01-013-06350	KABEL FO 96C/8T Stralight 2025	1	3	\N	2026-09-07 07:31:36.793	2026-09-07 07:31:36.793	1	1
18	CBL-00215	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 50 METER	1	3	\N	2026-09-07 07:31:36.861	2026-09-07 07:31:36.861	1	1
19	CBL-00225	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 75 METER	1	3	\N	2026-09-07 07:31:36.872	2026-09-07 07:31:36.872	1	1
20	CBL-00220	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 100 METER	1	3	\N	2026-09-07 07:31:36.889	2026-09-07 07:31:36.889	1	1
21	CBL-00223	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 150 METER	1	3	\N	2026-09-07 07:31:36.905	2026-09-07 07:31:36.905	1	1
22	CBL-00226	KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 200 METER	1	3	\N	2026-09-07 07:31:36.921	2026-09-07 07:31:36.921	1	1
25	SPP-00100	BRACKET X-FRAME BEHEL MINI 12X40X40 (HITAM-MERAH)	1	4	\N	2026-09-07 07:31:36.968	2026-09-07 07:31:36.968	1	1
28	90000151	BRACKET SALIB BARU	1	4	\N	2026-09-07 07:31:37.016	2026-09-07 07:31:37.016	1	1
31	01-013-03083	MUR + BAUT STENLIS M08 - 1.25 X 80	1	1	\N	2026-09-07 07:31:37.048	2026-09-07 07:31:37.048	1	1
32	GT0000100	ODP Boxes 16 port with 1:8 PLC Splitter including accessories but without connector and adapter	2	4	\N	2026-09-07 07:31:37.052	2026-09-07 07:31:37.052	1	1
33	GT0000201M	Outdoor Connector with SC/UPC adapter, magenta color	2	1	\N	2026-09-07 07:31:37.064	2026-09-07 07:31:37.064	1	1
34	GT0000201S	Outdoor Connector with SC/UPC adapter, silver color	2	1	\N	2026-09-07 07:31:37.079	2026-09-07 07:31:37.079	1	1
35	NWK-00964	ODP 10 PORT WITH 8PCS SC UPC ADAPTER AND OUTDOOR CONNECTOR	2	4	\N	2026-09-07 07:31:37.096	2026-09-07 07:31:37.096	1	1
36	01-013-00225	1:8 balanced PLC Splitter SC/UPC,G657A2,0.9mm,0.6m	2	4	\N	2026-09-07 07:31:37.111	2026-09-07 07:31:37.111	1	1
37	01-013-00004	1*8 PLC SPLITTER 1:8	2	4	\N	2026-09-07 07:31:37.128	2026-09-07 07:31:37.128	1	1
38	00-013-13404	1:8 balanced PLC Splitter SC/UPC,G657A2,0.9mm,0.6m WITH CONNECTOR INPUT	2	4	\N	2026-09-07 07:31:37.144	2026-09-07 07:31:37.144	1	1
39	JTR-02242	PATCHCORD LC/UPC - SC/UPC 3 METER ( Simplex )	2	4	\N	2026-09-07 07:31:37.159	2026-09-07 07:31:37.159	1	1
41	01-013-00587	Outdoor Connector With SC/UPC Adapter, green color	2	1	\N	2026-09-07 07:31:37.179	2026-09-07 07:31:37.179	1	1
42	[01-013-11630]	STAINLESS BELT NON MAGNET	1	2	http://localhost:5000/uploads/file-1788844224093-50490099.jpg	2026-09-07 07:31:37.192	2026-09-07 07:31:37.192	1	4
45	01-013-00033	ADAPTER LC/UPC DUPLEX AUTO SHUTTER	2	1	http://localhost:5000/uploads/file-1788844077716-391208023.jpg	2026-09-07 07:31:37.239	2026-09-07 07:31:37.239	1	4
46	JTR-02154	OTB RACK PAZ 48 core LC/UPC	2	4	http://localhost:5000/uploads/file-1788844058261-285888910.jpg	2026-09-07 07:31:37.243	2026-09-07 07:31:37.243	1	4
47	CPT-00671	CABLE MANAGEMENT METAL 1U ( CCM-M1U-BLK )	1	4	http://localhost:5000/uploads/file-1788844037871-922104510.jpg	2026-09-07 07:31:37.255	2026-09-07 07:31:37.255	1	4
48	90000156	KSS Spiral Wrapping Band KS-6BK Hitam 10m	1	2	http://localhost:5000/uploads/file-1788843967392-351894461.jpg	2026-09-07 07:31:37.27	2026-09-07 07:31:37.27	1	4
49	CPT-00674	CAGE NUT MUR + RING 6	1	1	http://localhost:5000/uploads/file-1788843884957-950898897.jpg	2026-09-07 07:31:37.286	2026-09-07 07:31:37.286	1	4
50	CPT-00753	FLEXIBLE WP 1/2" INCH	1	2	http://localhost:5000/uploads/file-1788843857218-101557630.jpg	2026-09-07 07:31:37.302	2026-09-07 07:31:37.302	1	4
51	JTR-02401	PIGTAIL LC/UPC	2	4	http://localhost:5000/uploads/file-1788843832131-948593403.jpg	2026-09-07 07:31:37.307	2026-09-07 07:31:37.307	1	4
53	29000006	HOSE CLAMP/KLEM SELANG 1 1/2 INCH [25-38mm]	1	1	http://localhost:5000/uploads/file-1788843783197-39623804.jpg	2026-09-07 07:31:37.334	2026-09-07 07:31:37.334	1	4
54	90000163	Nylon Cable Tie 3.6x300mm Hitam	1	5	http://localhost:5000/uploads/file-1788843751940-88216189.jpg	2026-09-07 07:31:37.35	2026-09-07 07:31:37.35	1	4
55	CPT-00533	Pipa Pralon 1,5inch	1	3	http://localhost:5000/uploads/file-1788843669661-578042481.jpg	2026-09-07 07:31:37.366	2026-09-07 07:31:37.366	1	4
56	[01-013-03725]	PLC SPLITTER 1X8 SC/UPC	2	4	http://localhost:5000/uploads/file-1788843648110-511473193.jpg	2026-09-07 07:31:37.37	2026-09-07 07:31:37.37	1	4
58	 PRK-SVR-001	Server Rack 2U	3	4	http://localhost:5000/uploads/file-1789730872794-476802109.webp	2026-09-18 11:27:52.818	2026-09-18 11:27:52.818	4	4
59	PRK-SVR-001	Server Rack 3u	3	4	http://localhost:5000/uploads/file-1789730918492-605949166.png	2026-09-18 11:28:38.635	2026-09-18 11:28:38.635	4	4
\.


--
-- Data for Name: boq; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.boq (boq_id, tiket_id, boq_number, status, source, external_verification_status, tanggal_aktivasi, diaktifkan_oleh, catatan, reference_file, created_at, updated_at, created_by, updated_by, email_reference) FROM stdin;
1	1	\N	draft	top_down	menunggu	\N	\N	\N	\N	2026-09-07 07:31:37.548	2026-09-07 07:31:37.548	1	1	\N
2	2	\N	aktif	top_down	menunggu	2026-09-07 07:31:37.724	1	\N	\N	2026-09-07 07:31:37.726	2026-09-07 07:31:37.726	1	1	\N
3	3	\N	draft	top_down	menunggu	\N	\N	\N	\N	2026-09-07 07:31:37.757	2026-09-07 07:31:37.757	1	1	\N
4	4	\N	aktif	top_down	menunggu	2026-09-07 07:31:37.787	1	\N	\N	2026-09-07 07:31:37.789	2026-09-07 07:31:37.789	1	1	\N
5	5	\N	aktif	top_down	menunggu	2026-09-07 07:31:37.807	1	\N	\N	2026-09-07 07:31:37.81	2026-09-07 07:31:37.81	1	1	\N
6	10	BOQ-2026-0001	aktif	top_down	terverifikasi	2026-09-08 05:51:17.59	4	Tidak ada	http://localhost:5000/uploads/file-1788844783970-373322695.pdf	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81	4	4	\N
7	11	BOQ-2026-0002	aktif	top_down	terverifikasi	2026-09-10 07:19:24.656	4	Project Baru	http://localhost:5000/uploads/file-1789024516741-604299851.pdf	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904	4	4	\N
8	12	BOQ-2026-0003	aktif	top_down	terverifikasi	2026-09-11 07:33:04.991	4	\N	http://localhost:5000/uploads/file-1789111801460-420457077.pdf	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84	4	4	\N
9	13	BOQ-2026-0004	aktif	top_down	terverifikasi	2026-09-11 10:42:17.049	4	Om Telolet Om	http://localhost:5000/uploads/file-1789123102027-907912760.pdf	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458	4	4	\N
10	14	BOQ-2026-0005	selesai	top_down	terverifikasi	2026-09-11 20:05:38.468	4	Bagus	http://localhost:5000/uploads/file-1789153725529-209578029.pdf	2026-09-11 17:40:48.933	2026-09-11 17:40:48.933	4	4	Ardikece@digitak.com
\.


--
-- Data for Name: boq_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.boq_item (boq_item_id, boq_id, barang_id, qty_rencana, satuan_id, gudang_tujuan_id, created_at, updated_at) FROM stdin;
1	1	6	20.00	2	1	2026-09-07 07:31:37.548	2026-09-07 07:31:37.548
2	1	4	10.00	1	1	2026-09-07 07:31:37.548	2026-09-07 07:31:37.548
3	1	25	50.00	3	1	2026-09-07 07:31:37.548	2026-09-07 07:31:37.548
4	2	9	30.00	2	2	2026-09-07 07:31:37.726	2026-09-07 07:31:37.726
5	2	39	100.00	1	2	2026-09-07 07:31:37.726	2026-09-07 07:31:37.726
6	3	39	5.00	3	1	2026-09-07 07:31:37.757	2026-09-07 07:31:37.757
7	4	35	25.00	3	1	2026-09-07 07:31:37.789	2026-09-07 07:31:37.789
8	4	6	15.00	4	1	2026-09-07 07:31:37.789	2026-09-07 07:31:37.789
9	5	4	10.00	1	1	2026-09-07 07:31:37.81	2026-09-07 07:31:37.81
10	6	7	550.00	2	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
11	6	8	480.00	2	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
12	6	27	60.00	4	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
13	6	4	40.00	1	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
14	6	31	250.00	2	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
15	6	41	100.00	4	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
16	6	24	35.00	3	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
17	6	47	10.00	2	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
18	6	49	300.00	4	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
19	6	53	80.00	3	\N	2026-09-08 05:23:03.81	2026-09-08 05:23:03.81
20	7	1	200.00	1	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
21	7	9	700.00	2	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
22	7	19	20.00	4	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
23	7	23	12.00	3	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
24	7	3	8.00	1	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
25	7	32	10.00	2	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
26	7	36	10.00	3	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
27	7	39	40.00	1	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
28	7	51	50.00	1	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
29	7	54	15.00	3	\N	2026-09-10 07:18:52.904	2026-09-10 07:18:52.904
30	8	52	80.00	4	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
31	8	12	900.00	3	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
32	8	4	10.00	1	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
33	8	26	120.00	4	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
34	8	17	60.00	1	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
35	8	35	18.00	3	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
36	8	33	100.00	2	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
37	8	37	18.00	3	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
38	8	48	20.00	4	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
39	8	42	150.00	1	\N	2026-09-11 07:32:47.84	2026-09-11 07:32:47.84
40	9	1	15.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
41	9	6	600.00	3	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
42	9	4	4.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
43	9	26	45.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
44	9	35	6.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
45	9	37	6.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
46	9	39	20.00	4	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
47	9	45	12.00	1	\N	2026-09-11 10:40:01.458	2026-09-11 10:40:01.458
59	10	57	1.00	4	\N	2026-09-11 20:05:35.175	2026-09-11 20:05:35.175
\.


--
-- Data for Name: gudang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gudang (gudang_id, nama_gudang, tipe, alamat, project_id, latitude, longitude, keterangan, is_aktif, created_at, updated_at, created_by, updated_by, pic_id, kapasitas_maksimum, status_kecukupan_gudang, is_internal) FROM stdin;
2	Gudang Ciamis	tetap	Jl. Jenderal Sudirman No. 88, Ciamis, Kabupaten Ciamis	\N	-73.266	1083538	Gudang cabang untuk distribusi	t	2026-09-07 07:31:30.812	2026-09-07 07:31:30.812	1	1	15	\N	\N	t
1	Gudang Rancamanyar	tetap	Jl. Rancamanyar Utama No. 15, Rancamanyar, Baleendah, Kabupaten Bandung	\N	-69.987	1076248	Gudang utama untuk penyimpanan	t	2026-09-07 07:31:30.791	2026-09-07 07:31:30.791	1	1	5	\N	\N	t
3	Gudang Pasirkaliki	tetap	Jl. Gunung Batu Cidamar, Kec. Cimahi Utara, Kota Cimahi (Kode Pos 40514)	\N	-6.887736	107.567290	Gudang anyar bos	f	2026-09-11 13:27:14.186	2026-09-11 13:27:14.186	4	4	\N	\N	\N	t
4	Gudang Test Auto Zone Aja	tetap	Jl. Test No. 1	\N	\N	\N	\N	f	2026-09-12 11:23:23.826	2026-09-12 11:23:23.826	4	4	\N	\N	\N	t
5	Test Dadakan	tetap	\N	\N	\N	\N	\N	f	2026-09-13 13:41:27.067	2026-09-13 13:41:27.067	1	1	\N	\N	\N	t
6	Gudang Ardi	dadakan	Pantai Pangandaran	8	230204	040223	Gudang sementara untuk transit selama proyek berlangsung	f	2026-09-13 18:00:18.924	2026-09-13 18:00:18.924	4	4	\N	\N	\N	t
7	Gudang Old Trafford	tetap	Old Trafford, Stretford, Manchester M16 0RA, Inggris.	\N	53.4631	-2.2914	tsunami trophy akan datang	t	2026-09-18 12:06:49.192	2026-09-18 12:06:49.192	4	4	\N	\N	\N	t
\.


--
-- Data for Name: kategori_barang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kategori_barang (kategori_id, nama_kategori, is_kritis) FROM stdin;
1	Kabel & Aksesoris	f
2	Networking	t
3	Server	t
4	Storage	t
5	Power/UPS	t
6	Endpoint/Laptop	f
\.


--
-- Data for Name: kendaraan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kendaraan (kendaraan_id, no_polisi, jenis_kendaraan, merk, kapasitas_angkut, keterangan, foto, created_at, updated_at, created_by, updated_by, gudang_id) FROM stdin;
1	Z 8123 AB	Truk Box	Mitsubishi Canter	5000.00	Kendaraan distribusi barang ke pelanggan	\N	2026-09-07 07:31:35.816	2026-09-07 07:31:35.816	1	1	\N
2	D 8345 CD	Pickup	Suzuki Carry	1000.00	Kendaraan operasional pengiriman dalam kota	\N	2026-09-07 07:31:35.924	2026-09-07 07:31:35.924	1	1	\N
3	FL-001	Forklift	Toyota	3000.00	Digunakan untuk bongkar muat dan pemindahan pallet di gudang	\N	2026-09-07 07:31:35.963	2026-09-07 07:31:35.963	1	1	\N
4	Z 8567 EF	Truk Engkel	Hino Dutro	4000.00	Distribusi barang antargudang dan antarkota	\N	2026-09-07 07:31:36.036	2026-09-07 07:31:36.036	1	1	\N
5	D 1234 GH	Mobil Operasional	Toyota Avanza	500.00	Kendaraan supervisor untuk inspeksi gudang dan operasional	\N	2026-09-07 07:31:36.053	2026-09-07 07:31:36.053	1	1	\N
6	D 2302 AA	Mobil Bos	Porsche	0.00	Mobil Antik Bos	http://localhost:5000/uploads/file-1789134632074-422592308.jpg	2026-09-11 13:40:26.649	2026-09-11 13:40:26.649	4	4	\N
7	D 1709 AA	Formula 1	Mclaren	0.00	Mobil Balap	http://localhost:5000/uploads/file-1789732452675-95010627.jpg	2026-09-18 11:54:12.687	2026-09-18 11:54:12.687	4	4	\N
\.


--
-- Data for Name: laporan_mitra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.laporan_mitra (laporan_id, tiket_id, kode_tiket, project_id, jenis_laporan, tanggal_laporan, pic_mitra, nama_barang, mos, used, catatan, kondisi, uploaded_by, uploaded_at, is_aktif) FROM stdin;
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification (id, user_id, role, type, title, message, link, is_read, read_at, created_at) FROM stdin;
275	4	\N	info	Pengguna Diperbarui	Akun Biladi Mil Urahmah (Biladi@mail.com) telah diperbarui.	/dashboard/users	t	2026-09-14 12:50:13.399	2026-09-13 11:58:53.263
274	1	\N	info	Pengguna Diperbarui	Akun Biladi Mil Urahmah (Biladi@mail.com) telah diperbarui.	/dashboard/users	f	\N	2026-09-13 11:58:53.263
276	\N	admin_general	info	Gudang Baru Ditambahkan	Gudang baru: Test Dadakan (ID: 5) telah ditambahkan oleh Admin General.	/dashboard/master-data	f	\N	2026-09-13 13:41:27.087
277	\N	supervisor	info	Gudang Baru Ditambahkan	Gudang baru: Test Dadakan (ID: 5) telah ditambahkan oleh Admin General.	/dashboard/master-data	f	\N	2026-09-13 13:41:27.092
278	2	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.725
279	5	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.733
280	6	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.735
281	7	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.737
282	15	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.739
283	18	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:37:37.741
284	2	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.848
285	5	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.857
286	6	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.859
287	7	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.861
288	15	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.862
289	18	\N	info	Gudang Diperbarui	Gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 14:38:13.864
290	2	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.824
291	5	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.845
292	6	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.847
293	7	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.85
294	15	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.852
295	18	\N	info	Zona Diperbarui	Zona DEFAULT di gudang Test Dadakan telah diperbarui.	/dashboard/master-data	f	\N	2026-09-13 15:21:39.854
296	\N	admin_general	info	Gudang Baru Ditambahkan	Gudang baru: Gudang Ardi (ID: 6) telah ditambahkan oleh Ahmad Fauzi.	/dashboard/master-data	f	\N	2026-09-13 18:00:18.946
297	\N	supervisor	info	Gudang Baru Ditambahkan	Gudang baru: Gudang Ardi (ID: 6) telah ditambahkan oleh Ahmad Fauzi.	/dashboard/master-data	f	\N	2026-09-13 18:00:18.95
298	\N	admin_general	info	Gudang Dikaitkan dengan Project	Gudang Gudang Ardi telah dikaitkan dengan Project FTTH Open Area Pangandaran RW 01.	/dashboard/master-data	f	\N	2026-09-13 18:00:18.954
299	\N	supervisor	info	Gudang Dikaitkan dengan Project	Gudang Gudang Ardi telah dikaitkan dengan Project FTTH Open Area Pangandaran RW 01.	/dashboard/master-data	f	\N	2026-09-13 18:00:18.956
300	1	\N	info	Pengguna Diperbarui	Akun Andi Pratama (andi.pratama@digitakgudang.com) telah diperbarui.	/dashboard/users	f	\N	2026-09-18 10:23:10.906
301	4	\N	info	Pengguna Diperbarui	Akun Andi Pratama (andi.pratama@digitakgudang.com) telah diperbarui.	/dashboard/users	f	\N	2026-09-18 10:23:10.906
302	4	\N	info	Pengguna Diperbarui	Akun Andi Pratama (andi.pratama@digitakgudang.com) telah diperbarui.	/dashboard/users	f	\N	2026-09-18 10:23:35.35
303	1	\N	info	Pengguna Diperbarui	Akun Andi Pratama (andi.pratama@digitakgudang.com) telah diperbarui.	/dashboard/users	f	\N	2026-09-18 10:23:35.35
304	1	\N	info	Pengguna Baru Ditambahkan	Akun Arvinna Siti Meilani Taufik (Arvin@digitakgudang.com) telah dibuat dengan role supervisor.	/dashboard/users	f	\N	2026-09-18 10:32:22.681
305	4	\N	info	Pengguna Baru Ditambahkan	Akun Arvinna Siti Meilani Taufik (Arvin@digitakgudang.com) telah dibuat dengan role supervisor.	/dashboard/users	f	\N	2026-09-18 10:32:22.681
306	\N	admin_general	info	Barang Baru Ditambahkan	Barang baru: Server Rack 2U (Kode:  PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:27:52.847
307	\N	supervisor	info	Barang Baru Ditambahkan	Barang baru: Server Rack 2U (Kode:  PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:27:52.857
308	\N	staf_gudang	info	Barang Baru Ditambahkan	Barang baru: Server Rack 2U (Kode:  PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:27:52.859
309	\N	admin_general	info	Barang Baru Ditambahkan	Barang baru: Server Rack 3u (Kode: PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:28:38.658
310	\N	supervisor	info	Barang Baru Ditambahkan	Barang baru: Server Rack 3u (Kode: PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:28:38.66
311	\N	staf_gudang	info	Barang Baru Ditambahkan	Barang baru: Server Rack 3u (Kode: PRK-SVR-001) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:28:38.661
312	\N	admin_general	info	Kendaraan Baru Ditambahkan	Kendaraan baru ditambahkan: Formula 1 (Plat: D 1709 AA) oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:54:12.703
313	\N	supervisor	info	Kendaraan Baru Ditambahkan	Kendaraan baru ditambahkan: Formula 1 (Plat: D 1709 AA) oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 11:54:12.705
314	\N	admin_general	info	Gudang Baru Ditambahkan	Gudang baru: Gudang Old Trafford (ID: 7) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 12:06:49.222
315	\N	supervisor	info	Gudang Baru Ditambahkan	Gudang baru: Gudang Old Trafford (ID: 7) telah ditambahkan oleh Biladi Mil Urahmah.	/dashboard/master-data	f	\N	2026-09-18 12:06:49.223
316	8	\N	success	Inbound Disetujui	Pengajuan inbound 23-sj telah disetujui oleh Budi Santoso.	/staff/inbound/7	f	\N	2026-09-18 12:32:52.505
317	1	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
318	2	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
319	5	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
320	21	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
321	15	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
322	18	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
323	7	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
324	6	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
325	4	\N	success	Putaway Selesai	Putaway untuk surat jalan 23-sj telah selesai diproses.	/staff/inbound/7	f	\N	2026-09-18 12:33:26.091
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_resets (id, email, token, expires, "createdAt") FROM stdin;
\.


--
-- Data for Name: permintaan_boq; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permintaan_boq (permintaan_id, project_id, tiket_id, barang_id, qty_usulan, alasan, status, diajukan_oleh, ditinjau_oleh, created_at, updated_at) FROM stdin;
1	1	6	35	5.00	Kebutuhan tambahan untuk proyek pengembangan jaringan	diajukan	2	\N	2026-09-07 07:31:37.837	2026-09-07 07:31:37.837
2	2	7	35	2.00	Pengganti perangkat yang rusak di site klien	disetujui	2	1	2026-09-07 07:31:37.885	2026-09-07 07:31:37.885
\.


--
-- Data for Name: personil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personil (personil_id, nama, jenis, no_hp, nik, email, posisi, bisa_menyetir, is_material_handler, foto, user_id, gudang_id, is_dummy, created_at, updated_at, created_by, updated_by, is_aktif) FROM stdin;
2	Budi Santoso	teknisi	081234567802	3201010101010002	budi.santoso@digitakgudang.com	Supervisor	t	f	\N	5	\N	f	2026-09-07 07:31:29.489	2026-09-07 07:31:29.489	5	5	t
3	Rina Kartika	teknisi	081234567803	3201010101010003	rina.kartika@digitakgudang.com	Supervisor	t	f	\N	6	\N	f	2026-09-07 07:31:29.586	2026-09-07 07:31:29.586	6	6	t
4	Dedi Kurniawan	teknisi	081234567804	3201010101010004	dedi.kurniawan@digitakgudang.com	Supervisor	t	t	\N	7	\N	f	2026-09-07 07:31:29.689	2026-09-07 07:31:29.689	7	7	t
6	Fajar Hidayat	teknisi	081234567806	3201010101010006	fajar.hidayat@digitakgudang.com	Staff Gudang	t	t	\N	9	\N	f	2026-09-07 07:31:29.884	2026-09-07 07:31:29.884	9	9	t
7	Siti Nurhaliza	teknisi	081234567807	3201010101010007	siti.nurhaliza@digitakgudang.com	Staff Gudang	f	t	\N	10	\N	f	2026-09-07 07:31:29.985	2026-09-07 07:31:29.985	10	10	t
8	Rizky Maulana	teknisi	081234567808	3201010101010008	rizky.maulana@digitakgudang.com	Staff Gudang	t	t	\N	11	\N	f	2026-09-07 07:31:30.082	2026-09-07 07:31:30.082	11	11	t
9	Yoga Saputra	teknisi	081234567809	3201010101010009	yoga.saputra@digitakgudang.com	Staff Gudang	t	t	\N	12	\N	f	2026-09-07 07:31:30.178	2026-09-07 07:31:30.178	12	12	t
10	Taufik Hidayat	teknisi	081234567810	3201010101010010	taufik.hidayat@digitakgudang.com	Staff Gudang	f	t	\N	13	\N	f	2026-09-07 07:31:30.274	2026-09-07 07:31:30.274	13	13	t
11	Indra Gunawan	teknisi	081234567811	3201010101010011	indra.gunawan@digitakgudang.com	Staff Gudang	t	t	\N	14	\N	f	2026-09-07 07:31:30.381	2026-09-07 07:31:30.381	14	14	t
13	Eko Prasetyo	teknisi	081234567813	3201010101010013	eko.prasetyo@digitakgudang.com	Staff Gudang	t	t	\N	16	\N	f	2026-09-07 07:31:30.587	2026-09-07 07:31:30.587	16	16	t
14	Wahyu Firmansyah	teknisi	081234567814	3201010101010014	wahyu.firmansyah@digitakgudang.com	Staff Gudang	t	t	\N	17	\N	f	2026-09-07 07:31:30.668	2026-09-07 07:31:30.668	17	17	t
12	Putri Maharani	teknisi	081234567812	3201010101010012	putri.maharani@digitakgudang.com	Staff Gudang	f	f	\N	15	1	f	2026-09-07 07:31:30.474	2026-09-07 07:31:30.474	15	15	t
1	Ardi Alfarisi	admin_gudang	083148312321	3201010101010001	admin@digitakgudang.com	Admin	t	f	/uploads/avatars/4-1789733371483-853868920.jpg	4	\N	f	2026-09-07 07:31:29.399	2026-09-07 07:31:29.399	4	4	t
15	Nanda Permata	teknisi	081234567815	3201010101010015	nanda.permata@digitakgudang.com	Staf Gudang	f	f	\N	18	2	f	2026-09-07 07:31:30.763	2026-09-07 07:31:30.763	18	4	t
5	Andi Pratama	teknisi	081234567805	3201010101010005	andi.pratama@digitakgudang.com	Staff Gudang	t	t	\N	8	1	f	2026-09-07 07:31:29.788	2026-09-07 07:31:29.788	8	8	t
18	Arvinna Siti Meilani Taufik	teknisi	083148170905	\N	Arvin@digitakgudang.com	Supervisor	f	f	\N	21	\N	f	2026-09-18 10:32:22.628	2026-09-18 10:32:22.628	21	21	t
\.


--
-- Data for Name: project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project (project_id, nama_project, title, cluster_id, area, klien, kecamatan, desa_kelurahan, kota_kabupaten, provinsi, status_aktif, created_at, updated_at, created_by, updated_by) FROM stdin;
1	FTTH Rancamanyar Tahap 1	Pembangunan Jaringan FTTH Rancamanyar	CL001	Bandung	Rancamanyar	Baleendah	Rancamanyar	Kabupaten Bandung	Jawa Barat	t	2026-09-07 07:31:33.123	2026-09-07 07:31:33.123	1	1
2	FTTH Ciamis Area Utara	Pengembangan Jaringan Fiber Optik Ciamis	CL002	Ciamis	Ciamis	Ciamis	Ciamis	Kabupaten Ciamis	Jawa Barat	t	2026-09-07 07:31:35.675	2026-09-07 07:31:35.675	1	1
3	Backbone Garut Selatan	Modernisasi Infrastruktur Telekomunikasi Garut	CL003	Garut	Garut	Tarogong Kidul	Haurpanggung	Kabupaten Garut	Jawa Barat	t	2026-09-07 07:31:35.691	2026-09-07 07:31:35.691	1	1
4	FTTH Sumedang Kota	Instalasi Fiber Optik Sumedang	CL004	Sumedang	Sumedang	Sumedang Utara	Kotakulon	Kabupaten Sumedang	Jawa Barat	t	2026-09-07 07:31:35.724	2026-09-07 07:31:35.724	1	1
5	FTTH Tasikmalaya Timur	Perluasan Jaringan Internet Tasikmalaya	CL005	Tasikmalaya	Tasikmalaya	Cibeureum	Setiajaya	Kota Tasikmalaya	Jawa Barat	t	2026-09-07 07:31:35.767	2026-09-07 07:31:35.767	1	1
6	FTTH Open Area Bojongsoang RW 04	Pembangunan FTTH Open Area Bojongsoang RW 04	NET-H-005502	Bandung Timur	PT Telko Nusantara Utama	Bojongsoang	Tegalluar	Kabupaten Bandung	Jawa Barat	t	2026-09-08 05:17:19.418	2026-09-08 05:17:19.418	4	4
7	FTTH Open Area Baleendah RW 06	Pembangunan FTTH Open Area Baleendah RW 06	NET-H-005634	Bandung Selatan	PT Telko Nusantara Utama	Baleendah	Jelekong	Kabupaten Bandung	Jawa Barat	t	2026-09-10 07:09:40.355	2026-09-10 07:09:40.355	4	4
8	FTTH Open Area Pangandaran RW 01	Pembangunan FTTH Open Area Pangandaran RW 01	NET-H-005712	Pangandaran	PT Nusantara Broadband Indonesia	Pangandaran	Pananjung	Kabupaten Pangandaran	Jawa Barat	t	2026-09-11 07:25:14.947	2026-09-11 07:25:14.947	4	4
9	FTTH Backbone Jl. Gatot Subroto	Pembangunan FTTH Backbone Jl. Gatot Subroto	NET-J-003318	Gatot Subroto	PT Nusantara Broadband Indonesia	Setiabudi	Karet Semanggi	Kota Jakarta Selatan	DKI Jakarta	t	2026-09-11 10:37:23.608	2026-09-11 10:37:23.608	4	4
\.


--
-- Data for Name: reconciliation_upload_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reconciliation_upload_detail (detail_id, upload_id, kode_tiket, mos, used, status, reason) FROM stdin;
\.


--
-- Data for Name: reconciliation_upload_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reconciliation_upload_log (upload_id, filename, file_url, uploaded_by, uploaded_at, total_rows, success_rows, failed_rows) FROM stdin;
\.


--
-- Data for Name: satuan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.satuan (satuan_id, kode_satuan) FROM stdin;
1	pcs
2	roll
3	meter
4	unit
5	box
\.


--
-- Data for Name: stok_gudang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stok_gudang (stok_id, gudang_id, barang_id, project_id, kondisi, qty, updated_at, zona_id) FROM stdin;
8	2	8	6	baik	550.00	2026-09-08 05:41:58.954	6
11	2	4	6	baik	40.00	2026-09-08 05:41:58.995	5
12	2	31	6	baik	250.00	2026-09-08 05:41:59.006	6
9	2	7	6	baik	80.00	2026-09-08 05:55:00.043	5
10	2	27	6	baik	2.00	2026-09-08 05:55:00.05	6
13	2	41	6	baik	0.00	2026-09-08 05:55:00.054	5
14	2	47	6	baik	0.00	2026-09-08 05:55:00.058	5
21	1	1	7	baik	205.00	2026-09-10 08:13:24.769	3
25	1	36	7	baik	9.00	2026-09-10 08:13:24.822	2
26	1	39	7	baik	40.00	2026-09-10 08:13:24.832	1
23	1	9	7	baik	0.00	2026-09-10 08:44:06.36	2
22	1	19	7	baik	630.00	2026-09-10 08:44:06.367	1
24	1	3	7	baik	0.00	2026-09-10 08:44:06.372	2
33	2	12	8	baik	300.00	2026-09-11 07:47:54.152	6
34	2	4	8	baik	3.00	2026-09-11 07:47:54.161	5
35	2	35	8	baik	5.00	2026-09-11 07:47:54.171	5
36	2	37	8	baik	5.00	2026-09-11 07:47:54.181	6
44	2	4	9	baik	2.00	2026-09-11 14:37:43.439	6
45	2	35	9	baik	3.00	2026-09-11 14:37:43.451	5
46	2	37	9	baik	3.00	2026-09-11 14:37:43.463	5
42	2	1	9	baik	3.00	2026-09-11 14:49:56.113	8
43	2	6	9	baik	100.00	2026-09-11 14:49:56.12	6
48	2	53	3	baik	4.00	2026-09-18 12:33:26.073	6
\.


--
-- Data for Name: stok_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stok_ledger (ledger_id, surat_jalan_item_id, barang_id, jenis_mutasi, qty, saldo_setelah, waktu_mutasi) FROM stdin;
1	11	8	in	550.00	550.00	2026-09-08 05:39:08.031
2	12	7	in	480.00	480.00	2026-09-08 05:39:08.042
3	13	27	in	58.00	58.00	2026-09-08 05:39:08.046
4	14	4	in	40.00	40.00	2026-09-08 05:39:08.052
5	15	31	in	250.00	250.00	2026-09-08 05:39:08.056
6	16	41	in	95.00	95.00	2026-09-08 05:39:08.06
7	17	47	in	10.00	10.00	2026-09-08 05:39:08.064
8	11	8	out	550.00	0.00	2026-09-08 05:41:58.948
9	11	8	in	550.00	550.00	2026-09-08 05:41:58.96
10	12	7	out	480.00	0.00	2026-09-08 05:41:58.969
11	12	7	in	480.00	480.00	2026-09-08 05:41:58.974
12	13	27	out	58.00	0.00	2026-09-08 05:41:58.981
13	13	27	in	58.00	58.00	2026-09-08 05:41:58.986
14	14	4	out	40.00	0.00	2026-09-08 05:41:58.992
15	14	4	in	40.00	40.00	2026-09-08 05:41:58.996
16	15	31	out	250.00	0.00	2026-09-08 05:41:59.003
17	15	31	in	250.00	250.00	2026-09-08 05:41:59.008
18	16	41	out	95.00	0.00	2026-09-08 05:41:59.015
19	16	41	in	95.00	95.00	2026-09-08 05:41:59.021
20	17	47	out	10.00	0.00	2026-09-08 05:41:59.028
21	17	47	in	10.00	10.00	2026-09-08 05:41:59.031
22	18	7	out	400.00	80.00	2026-09-08 05:55:00.047
23	19	27	out	56.00	2.00	2026-09-08 05:55:00.053
24	20	41	out	95.00	0.00	2026-09-08 05:55:00.056
25	21	47	out	10.00	0.00	2026-09-08 05:55:00.061
26	26	1	in	205.00	205.00	2026-09-10 08:09:51.882
27	27	19	in	650.00	650.00	2026-09-10 08:09:51.895
28	28	9	in	20.00	20.00	2026-09-10 08:09:51.899
29	29	3	in	8.00	8.00	2026-09-10 08:09:51.903
30	30	36	in	9.00	9.00	2026-09-10 08:09:51.906
31	31	39	in	40.00	40.00	2026-09-10 08:09:51.91
32	26	1	out	205.00	0.00	2026-09-10 08:13:24.764
33	26	1	in	205.00	205.00	2026-09-10 08:13:24.773
34	27	19	out	650.00	0.00	2026-09-10 08:13:24.784
35	27	19	in	650.00	650.00	2026-09-10 08:13:24.788
36	28	9	out	20.00	0.00	2026-09-10 08:13:24.797
37	28	9	in	20.00	20.00	2026-09-10 08:13:24.801
38	29	3	out	8.00	0.00	2026-09-10 08:13:24.81
39	29	3	in	8.00	8.00	2026-09-10 08:13:24.814
40	30	36	out	9.00	0.00	2026-09-10 08:13:24.82
41	30	36	in	9.00	9.00	2026-09-10 08:13:24.824
42	31	39	out	40.00	0.00	2026-09-10 08:13:24.83
43	31	39	in	40.00	40.00	2026-09-10 08:13:24.834
47	38	9	out	20.00	0.00	2026-09-10 08:44:06.364
48	39	19	out	20.00	630.00	2026-09-10 08:44:06.369
49	40	3	out	8.00	0.00	2026-09-10 08:44:06.374
50	41	52	in	20.00	20.00	2026-09-11 07:36:39.098
51	42	12	in	300.00	300.00	2026-09-11 07:36:39.104
52	43	4	in	3.00	3.00	2026-09-11 07:36:39.107
53	44	35	in	5.00	5.00	2026-09-11 07:36:39.111
54	45	37	in	5.00	5.00	2026-09-11 07:36:39.115
55	41	52	out	20.00	0.00	2026-09-11 07:47:54.132
56	41	52	in	20.00	20.00	2026-09-11 07:47:54.139
57	42	12	out	300.00	0.00	2026-09-11 07:47:54.149
58	42	12	in	300.00	300.00	2026-09-11 07:47:54.153
59	43	4	out	3.00	0.00	2026-09-11 07:47:54.159
60	43	4	in	3.00	3.00	2026-09-11 07:47:54.162
61	44	35	out	5.00	0.00	2026-09-11 07:47:54.168
62	44	35	in	5.00	5.00	2026-09-11 07:47:54.173
63	45	37	out	5.00	0.00	2026-09-11 07:47:54.179
64	45	37	in	5.00	5.00	2026-09-11 07:47:54.183
65	46	52	out	10.00	10.00	2026-09-11 08:18:49.644
66	46	52	out	10.00	0.00	2026-09-11 08:20:16.755
67	47	1	in	8.00	8.00	2026-09-11 14:32:54.582
68	48	6	in	300.00	300.00	2026-09-11 14:32:54.59
69	49	4	in	2.00	2.00	2026-09-11 14:32:54.594
70	50	35	in	3.00	3.00	2026-09-11 14:32:54.598
71	51	37	in	3.00	3.00	2026-09-11 14:32:54.602
72	47	1	out	8.00	0.00	2026-09-11 14:37:43.409
73	47	1	in	8.00	8.00	2026-09-11 14:37:43.418
74	48	6	out	300.00	0.00	2026-09-11 14:37:43.425
75	48	6	in	300.00	300.00	2026-09-11 14:37:43.429
76	49	4	out	2.00	0.00	2026-09-11 14:37:43.437
77	49	4	in	2.00	2.00	2026-09-11 14:37:43.441
78	50	35	out	3.00	0.00	2026-09-11 14:37:43.449
79	50	35	in	3.00	3.00	2026-09-11 14:37:43.453
80	51	37	out	3.00	0.00	2026-09-11 14:37:43.46
81	51	37	in	3.00	3.00	2026-09-11 14:37:43.464
82	52	1	out	5.00	3.00	2026-09-11 14:49:56.115
83	53	6	out	200.00	100.00	2026-09-11 14:49:56.122
84	10	53	in	4.00	4.00	2026-09-18 12:32:52.452
85	10	53	out	4.00	0.00	2026-09-18 12:33:26.07
86	10	53	in	4.00	4.00	2026-09-18 12:33:26.075
\.


--
-- Data for Name: supplier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier (supplier_id, kode, nama, deskripsi, is_aktif, created_at, updated_at) FROM stdin;
1	170905	Gudang Pusat Jakarta	Gudang Supplier dari jakarta	t	2026-09-15 09:11:06.539	2026-09-15 09:11:06.539
\.


--
-- Data for Name: surat_jalan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surat_jalan (surat_jalan_id, nomor_surat_jalan, tipe, boq_id, gudang_asal_id, gudang_tujuan_id, kendaraan_id, personil_pengantar_id, status, kategori_approval, tanggal, tanggal_disetujui, tanggal_digenerate, tanggal_diterima, project_id, created_at, updated_at, created_by, updated_by, surat_jalan_url, pic_pemohon_nama, catatan, pengirim_eksternal_nama, tipe_pengirim, titik_lapangan_id, tujuan_tipe, supplier_id) FROM stdin;
1	SJ-OUT-2026-001	outbound	1	1	\N	2	5	draft_diajukan	\N	2026-08-14 01:00:00	\N	\N	\N	1	2026-09-07 07:31:37.99	2026-09-07 07:31:37.99	1	1	\N	\N	\N	\N	\N	\N	\N	\N
2	SJ-IN-2026-001	inbound	2	\N	2	1	2	draft_diajukan	\N	2026-08-14 03:00:00	\N	\N	\N	2	2026-09-07 07:31:38.015	2026-09-07 07:31:38.015	1	1	\N	\N	\N	\N	\N	\N	\N	\N
3	SJ-OUT-2026-002	outbound	4	1	\N	2	3	disetujui	\N	2026-08-12 02:00:00	\N	\N	\N	1	2026-09-07 07:31:38.031	2026-09-07 07:31:38.031	1	1	\N	\N	\N	\N	\N	\N	\N	\N
4	SJ-OUT-2026-003	outbound	2	2	\N	4	4	diterima_didistribusikan	\N	2026-08-10 00:30:00	\N	\N	\N	2	2026-09-07 07:31:38.048	2026-09-07 07:31:38.048	1	1	\N	\N	\N	\N	\N	\N	\N	\N
5	SJ-IN-2026-002	inbound	3	\N	1	1	5	digenerate	\N	2026-08-11 04:00:00	\N	\N	\N	3	2026-09-07 07:31:38.063	2026-09-07 07:31:38.063	1	1	\N	\N	\N	\N	\N	\N	\N	\N
6	SJ-OUT-2026-004	outbound	5	1	\N	2	6	draft_diajukan	\N	2026-08-09 06:00:00	\N	\N	\N	4	2026-09-07 07:31:38.083	2026-09-07 07:31:38.083	1	1	\N	\N	\N	\N	\N	\N	\N	\N
8	SJ-IN-0268	inbound	\N	\N	2	4	7	diterima_didistribusikan	manual_override	2026-09-08 00:00:00	\N	\N	2026-09-08 05:41:59.033	6	2026-09-08 05:31:57.354	2026-09-08 05:31:57.354	8	8	http://localhost:5000/uploads/file-1788845326728-162157672.pdf	Aldi Taher	\N	\N	\N	\N	\N	\N
9	800601/SJ/OUT/DIGITAK/IX/2026	outbound	\N	2	1	1	9	disetujui	manual_override	2026-09-08 05:53:20.613	2026-09-08 05:55:00.061	\N	\N	6	2026-09-08 05:53:20.615	2026-09-08 05:53:20.615	8	8	\N	Aldi taher	\N	\N	\N	\N	\N	\N
10	TEST-SJ-ACTIVE-BOQ	outbound	2	1	2	\N	\N	draft_diajukan	\N	2026-09-08 06:59:31.717	\N	\N	\N	2	2026-09-08 06:59:31.719	2026-09-08 06:59:31.719	1	1	\N	\N	\N	\N	\N	\N	\N	\N
12	E2E-TEST-OUT-GUDANG-INT	outbound	\N	1	2	\N	1	draft_diajukan	manual_override	2026-09-08 19:31:01.697	\N	\N	\N	1	2026-09-08 19:31:01.7	2026-09-08 19:31:01.7	1	1	\N	Test User	\N	\N	internal	\N	gudang	\N
14	E2E-TEST-OUT-LAPANGAN-EXT	outbound	\N	\N	\N	\N	1	draft_diajukan	manual_override	2026-09-08 19:32:39.083	\N	\N	\N	1	2026-09-08 19:32:39.085	2026-09-08 19:32:39.085	1	1	\N	Test User	\N	PT Test Distributor	external	1	lapangan	\N
21	SJ-IN-0275	inbound	\N	\N	1	4	10	diterima_didistribusikan	manual_override	2026-09-10 00:00:00	\N	\N	2026-09-10 08:13:24.835	7	2026-09-10 08:01:03.867	2026-09-10 08:01:03.867	8	8	http://localhost:5000/uploads/file-1789026713984-205371486.pdf	Rina Wulandari	\N	\N	\N	\N	gudang	\N
23	826609/SJ/OUT/DIGITAK/IX/2026	outbound	\N	1	2	5	13	disetujui	manual_override	2026-09-10 08:43:46.616	2026-09-10 08:44:06.374	\N	\N	7	2026-09-10 08:43:46.618	2026-09-10 08:43:46.618	8	8	\N	Rudy Kapur	\N	\N	internal	\N	gudang	\N
24	SJ-IN/2026/09-0156	inbound	\N	\N	2	3	12	diterima_didistribusikan	manual_override	2026-09-11 00:00:00	\N	\N	2026-09-11 07:47:54.186	8	2026-09-11 07:35:36.313	2026-09-11 07:35:36.313	8	8	http://localhost:5000/uploads/file-1789112069650-349011285.pdf	Rudi Tabuti	\N	\N	\N	\N	gudang	\N
25	692783/SJ/OUT/DIGITAK/IX/2026	outbound	\N	2	1	2	14	draft_diajukan	manual_override	2026-09-11 08:18:12.794	2026-09-11 08:20:16.758	\N	\N	8	2026-09-11 08:18:12.796	2026-09-11 08:18:12.796	8	8	\N	Rudi Tabuti	\N	\N	internal	\N	gudang	\N
20	E2E-TEST-IN-LAPANGAN	inbound	\N	\N	\N	\N	1	ditolak	manual_override	2026-09-08 00:00:00	\N	\N	\N	1	2026-09-08 19:32:39.175	2026-09-08 19:32:39.175	1	1	\N	Test User	Kurang cocok sih	\N	\N	1	lapangan	\N
26	SJ-IN/2026/09-0157	inbound	9	\N	2	6	7	diterima_didistribusikan	manual_override	2026-09-11 00:00:00	\N	\N	2026-09-11 14:37:43.467	9	2026-09-11 14:18:20.429	2026-09-11 14:18:20.429	8	8	http://localhost:5000/uploads/file-1789136239049-974299310.pdf	Gatot Kaca	\N	\N	\N	\N	gudang	\N
27	062353/SJ/OUT/DIGITAK/IX/2026	outbound	\N	2	1	6	13	disetujui	manual_override	2026-09-11 14:47:42.358	2026-09-11 14:49:56.123	\N	\N	9	2026-09-11 14:47:42.36	2026-09-11 14:47:42.36	8	8	\N	Pak Ustad	\N	\N	internal	\N	gudang	\N
7	23-sj	inbound	\N	\N	2	4	7	diterima_didistribusikan	manual_override	2026-09-07 00:00:00	\N	\N	2026-09-18 12:33:26.077	3	2026-09-07 07:49:52.931	2026-09-07 07:49:52.931	8	8	\N	Gloo	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: surat_jalan_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surat_jalan_item (item_id, surat_jalan_id, barang_id, qty, satuan_id, kondisi, serial_number, foto_url, is_kelebihan, catatan, created_at, zona_id, diperiksa_oleh, diperiksa_pada) FROM stdin;
1	1	6	10.00	2	baik	\N	\N	f	\N	2026-09-07 07:31:37.99	\N	\N	\N
2	1	4	20.00	1	baik	\N	\N	f	\N	2026-09-07 07:31:37.99	\N	\N	\N
3	2	35	15.00	1	baik	\N	\N	f	\N	2026-09-07 07:31:38.015	\N	\N	\N
4	2	9	5.00	2	baik	\N	\N	f	\N	2026-09-07 07:31:38.015	\N	\N	\N
5	3	39	50.00	1	baik	\N	\N	f	\N	2026-09-07 07:31:38.031	\N	\N	\N
6	4	25	100.00	1	baik	\N	\N	f	\N	2026-09-07 07:31:38.048	\N	\N	\N
7	4	6	3.00	2	baik	\N	\N	f	\N	2026-09-07 07:31:38.048	\N	\N	\N
8	5	35	8.00	4	baik	\N	\N	f	\N	2026-09-07 07:31:38.063	\N	\N	\N
9	6	4	5.00	1	rusak_ringan	\N	\N	f	\N	2026-09-07 07:31:38.083	\N	\N	\N
38	23	9	20.00	2	baik	\N	http://localhost:5000/uploads/file-1789029808434-777517885.png	f	\N	2026-09-10 08:43:46.618	\N	\N	\N
39	23	19	20.00	4	baik	\N	http://localhost:5000/uploads/file-1789029816900-86590728.jpeg	f	\N	2026-09-10 08:43:46.618	\N	\N	\N
40	23	3	8.00	1	baik	\N	http://localhost:5000/uploads/file-1789029822092-915901363.jpg	f	\N	2026-09-10 08:43:46.618	\N	\N	\N
47	26	1	8.00	4	baik	\N	\N	f	\N	2026-09-11 14:18:20.429	\N	8	2026-09-11 14:21:53.337
48	26	6	300.00	3	baik	\N	\N	f	\N	2026-09-11 14:18:20.429	\N	8	2026-09-11 14:22:04.362
49	26	4	2.00	4	baik	\N	\N	f	\N	2026-09-11 14:18:20.429	\N	8	2026-09-11 14:22:11.355
50	26	35	3.00	4	baik	\N	\N	f	\N	2026-09-11 14:18:20.429	\N	8	2026-09-11 14:22:19.743
41	24	52	20.00	3	baik	\N	\N	f	\N	2026-09-11 07:35:36.313	\N	8	2026-09-11 07:47:12.28
11	8	8	550.00	2	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:32:36.5
12	8	7	480.00	2	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:32:54.433
13	8	27	58.00	4	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:33:12.198
14	8	4	40.00	1	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:33:30.694
15	8	31	250.00	2	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:34:03.201
16	8	41	95.00	4	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:34:37.149
17	8	47	10.00	2	baik	\N	\N	f	\N	2026-09-08 05:31:57.354	\N	8	2026-09-08 05:35:11.539
18	9	7	400.00	2	baik	\N	http://localhost:5000/uploads/file-1788846580423-658308371.jpeg	f	\N	2026-09-08 05:53:20.615	\N	\N	\N
19	9	27	56.00	4	baik	\N	http://localhost:5000/uploads/file-1788846595623-66663454.jpg	f	\N	2026-09-08 05:53:20.615	\N	\N	\N
20	9	41	95.00	4	baik	\N	http://localhost:5000/uploads/file-1788846601117-418661693.jpg	f	\N	2026-09-08 05:53:20.615	\N	\N	\N
21	9	47	10.00	2	baik	\N	http://localhost:5000/uploads/file-1788846609453-940616792.jpg	f	\N	2026-09-08 05:53:20.615	\N	\N	\N
22	10	1	1.00	1	baik	\N	\N	f	\N	2026-09-08 06:59:31.719	\N	\N	\N
23	12	1	1.00	1	baik	\N	\N	f	\N	2026-09-08 19:31:01.7	\N	\N	\N
24	14	1	1.00	1	baik	\N	\N	f	\N	2026-09-08 19:32:39.085	\N	\N	\N
25	20	1	2.00	1	baik	\N	\N	f	\N	2026-09-08 19:32:39.175	\N	\N	\N
42	24	12	300.00	2	baik	\N	\N	f	\N	2026-09-11 07:35:36.313	\N	8	2026-09-11 07:47:18.598
43	24	4	3.00	1	baik	\N	\N	f	\N	2026-09-11 07:35:36.313	\N	8	2026-09-11 07:47:25.24
44	24	35	5.00	3	baik	\N	\N	f	\N	2026-09-11 07:35:36.313	\N	8	2026-09-11 07:47:31.412
45	24	37	5.00	3	baik	\N	\N	f	\N	2026-09-11 07:35:36.313	\N	8	2026-09-11 07:47:35.775
46	25	52	10.00	4	baik	\N	http://localhost:5000/uploads/file-1789114653185-175469016.jpg	f	\N	2026-09-11 08:18:12.796	\N	\N	\N
26	21	1	205.00	1	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:11:47.682
27	21	19	650.00	4	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:11:51.016
28	21	9	20.00	2	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:11:53.754
29	21	3	8.00	1	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:11:56.803
30	21	36	9.00	3	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:11:59.636
31	21	39	40.00	1	baik	\N	\N	f	\N	2026-09-10 08:01:03.867	\N	8	2026-09-10 08:12:03.003
51	26	37	3.00	4	baik	\N	\N	f	\N	2026-09-11 14:18:20.429	\N	8	2026-09-11 14:22:26.151
52	27	1	5.00	4	baik	\N	http://localhost:5000/uploads/file-1789138012796-766675987.jpg	f	\N	2026-09-11 14:47:42.36	\N	\N	\N
53	27	6	200.00	3	baik	\N	http://localhost:5000/uploads/file-1789138007733-738834625.jpeg	f	\N	2026-09-11 14:47:42.36	\N	\N	\N
10	7	53	4.00	3	baik	\N	\N	f	\N	2026-09-07 07:49:52.931	\N	8	2026-09-18 12:32:00.917
\.


--
-- Data for Name: surat_jalan_item_foto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surat_jalan_item_foto (foto_id, item_id, url, filename, mimetype, ukuran_bytes, created_at) FROM stdin;
1	11	http://localhost:5000/uploads/file-1788845556462-255422143.jpeg	17c7b96f579e4f74a2dcfa1de718e8c3~tplv-aphluv4xwc-white-pad-v1_250_250.jpeg	image/jpeg	14610	2026-09-08 05:32:36.498
2	12	http://localhost:5000/uploads/file-1788845574382-484814296.jpg	images (9).jpg	image/jpeg	41542	2026-09-08 05:32:54.431
3	13	http://localhost:5000/uploads/file-1788845592175-988557667.jpg	id-11134207-7r98w-lqua8sbj360k02.jpg	image/jpeg	67915	2026-09-08 05:33:12.197
4	14	http://localhost:5000/uploads/file-1788845610616-438347690.jpg	39986657-cf61-45bf-a446-a66bf2e545a4.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	6522	2026-09-08 05:33:30.681
5	15	http://localhost:5000/uploads/file-1788845643156-419164169.jpg	images (10).jpg	image/jpeg	59381	2026-09-08 05:34:03.199
6	16	http://localhost:5000/uploads/file-1788845677126-350420268.jpg	6b13b7d18b1dccd88d895824c14aecd5.jpg	image/jpeg	193858	2026-09-08 05:34:37.148
7	17	http://localhost:5000/uploads/file-1788845711507-187258972.jpg	id-11134207-7r98r-lziqtwpwud3vf4.jpg	image/jpeg	642153	2026-09-08 05:35:11.539
8	26	http://localhost:5000/uploads/file-1789027907649-913201040.jpg	39986657-cf61-45bf-a446-a66bf2e545a4.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	6522	2026-09-10 08:11:47.676
9	27	http://localhost:5000/uploads/file-1789027910959-532521168.jpg	id-11134207-7r98w-lqua8sbj360k02.jpg	image/jpeg	67915	2026-09-10 08:11:51.016
10	28	http://localhost:5000/uploads/file-1789027913732-304855369.jpg	bf963a72-2ad1-4da9-8395-0b83db498905.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	13100	2026-09-10 08:11:53.753
11	29	http://localhost:5000/uploads/file-1789027916780-523259671.jpg	20ec6893f3952a8bea5268e123fb4ca2.jpg_720x720q80.jpg	image/jpeg	37956	2026-09-10 08:11:56.802
12	30	http://localhost:5000/uploads/file-1789027919616-206927776.jpg	bf963a72-2ad1-4da9-8395-0b83db498905.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	13100	2026-09-10 08:11:59.635
13	31	http://localhost:5000/uploads/file-1789027922973-699315191.jpg	id-11134207-822wk-mmqsf43nndoid9.jpg	image/jpeg	431293	2026-09-10 08:12:03.002
14	41	http://localhost:5000/uploads/file-1789112832245-753124498.jpg	images (5).jpg	image/jpeg	48549	2026-09-11 07:47:12.279
15	42	http://localhost:5000/uploads/file-1789112838573-374026703.jpg	images (9).jpg	image/jpeg	41542	2026-09-11 07:47:18.6
16	43	http://localhost:5000/uploads/file-1789112845218-608399989.jpg	39986657-cf61-45bf-a446-a66bf2e545a4.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	6522	2026-09-11 07:47:25.243
17	44	http://localhost:5000/uploads/file-1789112851248-159870377.jpg	id-11134207-822wk-mmqsf43nndoid9.jpg	image/jpeg	431293	2026-09-11 07:47:31.415
18	45	http://localhost:5000/uploads/file-1789112855750-187764229.jpg	images (1).jpg	image/jpeg	10687	2026-09-11 07:47:35.778
19	47	http://localhost:5000/uploads/file-1789136513306-595253234.jpg	images (5).jpg	image/jpeg	48549	2026-09-11 14:21:53.334
20	48	http://localhost:5000/uploads/file-1789136524267-724172097.jpeg	17c7b96f579e4f74a2dcfa1de718e8c3~tplv-aphluv4xwc-white-pad-v1_250_250.jpeg	image/jpeg	14610	2026-09-11 14:22:04.36
21	49	http://localhost:5000/uploads/file-1789136531320-313600951.jpg	id-11134207-7r98r-lziqtwpwud3vf4.jpg	image/jpeg	642153	2026-09-11 14:22:11.355
22	50	http://localhost:5000/uploads/file-1789136539721-618661817.jpg	39986657-cf61-45bf-a446-a66bf2e545a4.jpg~tplv-aphluv4xwc-white-pad-v1_250_250.jpg	image/jpeg	6522	2026-09-11 14:22:19.742
23	51	http://localhost:5000/uploads/file-1789136546120-159713614.jpg	20ec6893f3952a8bea5268e123fb4ca2.jpg_720x720q80.jpg	image/jpeg	37956	2026-09-11 14:22:26.151
24	10	http://localhost:5000/uploads/file-1789734720888-786049848.jpg	Silly goofy cat.jpg	image/jpeg	4968	2026-09-18 12:32:00.912
\.


--
-- Data for Name: tiket_material; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tiket_material (tiket_id, kode_tiket, project_id, area, mos, used, created_at, created_by, used_terpasang) FROM stdin;
1	TKT-2026-001	1	Bandung	0.00	0.00	2026-09-07 07:31:37.526	1	\N
2	TKT-2026-002	2	Ciamis	0.00	103.00	2026-09-07 07:31:37.705	1	\N
3	TKT-2026-003	3	Garut	0.00	0.00	2026-09-07 07:31:37.741	1	\N
4	TKT-2026-004	1	Bandung	0.00	0.00	2026-09-07 07:31:37.773	1	\N
5	TKT-2026-009	4	Sumedang	0.00	0.00	2026-09-07 07:31:37.805	1	\N
6	TKT-2026-005	1	Bandung	0.00	0.00	2026-09-07 07:31:37.821	1	\N
7	TKT-2026-006	2	Bandung	0.00	103.00	2026-09-07 07:31:37.869	1	\N
8	TKT-2026-007	1	Bandung	0.00	0.00	2026-09-07 07:31:37.901	1	\N
9	TKT-2026-008	3	Garut	0.00	0.00	2026-09-07 07:31:37.918	1	\N
10	TKT-SI-2026-0134	6	Bandung Timur	1483.00	0.00	2026-09-08 05:23:03.782	4	\N
11	TKT-SI-2026-0149 	7	Bandung Selatan	\N	\N	2026-09-10 07:18:52.863	4	\N
12	TKT-SI-2026-0156 	8	Pangandaran	\N	\N	2026-09-11 07:32:47.806	4	\N
13	TKT-SI-2026-0157	9	Gatot Subroto	316.00	\N	2026-09-11 10:40:01.446	4	\N
14	TKT-0876	9	Gatot Subroto	\N	\N	2026-09-11 17:40:48.914	4	\N
\.


--
-- Data for Name: titik_lapangan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.titik_lapangan (titik_lapangan_id, project_id, nama_lokasi, latitude, longitude, alamat, is_aktif, created_at, updated_at, created_by, updated_by) FROM stdin;
1	1	Test Lapangan 1	-6.9175	107.6191	Jl. Test No. 1	t	2026-09-08 19:31:50.067	2026-09-08 19:31:50.067	1	1
2	1	Test Lapangan 1	-6.9175	107.6191	Jl. Test No. 1	t	2026-09-08 19:32:15.14	2026-09-08 19:32:15.14	1	1
\.


--
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_account (user_id, nama, email, password_hash, role, is_aktif, created_at, updated_at, must_change_password) FROM stdin;
1	Admin General	admin@gmail.com	123456	admin_general	t	2026-09-07 07:31:29.256	2026-09-07 07:31:29.256	f
2	Supervisor Gudang	supervisor@gmail.com	123456	supervisor	t	2026-09-07 07:31:29.279	2026-09-07 07:31:29.279	f
3	Staff Gudang	staff@gmail.com	123456	staf_gudang	t	2026-09-07 07:31:29.295	2026-09-07 07:31:29.295	f
5	Budi Santoso	budi.santoso@digitakgudang.com	$2b$10$dz7NHjpn1mVoixn6jiHp9OHl/kSWYYdab/rTrAfh5PvV3zkLdeXXi	supervisor	t	2026-09-07 07:31:29.486	2026-09-07 07:31:29.486	f
6	Rina Kartika	rina.kartika@digitakgudang.com	$2b$10$zHW6IlONdH8B/t1fmqZmcu9FzWftUbS9AJAysLacoz/PecNQGdufe	supervisor	t	2026-09-07 07:31:29.571	2026-09-07 07:31:29.571	f
7	Dedi Kurniawan	dedi.kurniawan@digitakgudang.com	$2b$10$v0uSujMi1.CG0lNDzpZ67.NmJ0CpLW.wBBzdLwXHUyn8dFsoB7Z4S	supervisor	t	2026-09-07 07:31:29.68	2026-09-07 07:31:29.68	f
9	Fajar Hidayat	fajar.hidayat@digitakgudang.com	$2b$10$lIN7g1VKDXzKqm.IMyRxcuhNuACMvL0LK.WklXkaPVEBnbJjSQNdy	staf_gudang	t	2026-09-07 07:31:29.876	2026-09-07 07:31:29.876	f
10	Siti Nurhaliza	siti.nurhaliza@digitakgudang.com	$2b$10$0c38ultgE8Dp.32BGVNMKeasT.1IR4wyr7IDJvZ94l8orQxg.EAj6	staf_gudang	t	2026-09-07 07:31:29.968	2026-09-07 07:31:29.968	f
11	Rizky Maulana	rizky.maulana@digitakgudang.com	$2b$10$ZQKcc7T9rDv9NrJ595l4HO2/qbt6kcz..aoQ9OWdZxfC5lPJDEqPy	staf_gudang	t	2026-09-07 07:31:30.077	2026-09-07 07:31:30.077	f
12	Yoga Saputra	yoga.saputra@digitakgudang.com	$2b$10$NHYQUT/D4WWDjiWNG.477ejwcWAlsgmeGOsgtqAySfvZp2WMu921y	staf_gudang	t	2026-09-07 07:31:30.171	2026-09-07 07:31:30.171	f
13	Taufik Hidayat	taufik.hidayat@digitakgudang.com	$2b$10$603/ig/kaorQZsO5J2hIz.RGCxYHB96bxNKklGPiTUkTu8Qmk0gEq	staf_gudang	t	2026-09-07 07:31:30.267	2026-09-07 07:31:30.267	f
14	Indra Gunawan	indra.gunawan@digitakgudang.com	$2b$10$eOZcgDF1i4hU/iTN.ud3EOtVbwHquu0s0O2COf5KAONTJXsXKM1O6	staf_gudang	t	2026-09-07 07:31:30.379	2026-09-07 07:31:30.379	f
16	Eko Prasetyo	eko.prasetyo@digitakgudang.com	$2b$10$d5p0d5QE7hzXsburWQhGYOMsJSaLMuS.Mt/vSqUT2Lm3A/k1id6E6	staf_gudang	t	2026-09-07 07:31:30.558	2026-09-07 07:31:30.558	f
17	Wahyu Firmansyah	wahyu.firmansyah@digitakgudang.com	$2b$10$PEkiozFeI88XEdFrGUOac.dVZY8QnIcli2eyQxxwHCZL3/VFRnI/i	staf_gudang	t	2026-09-07 07:31:30.654	2026-09-07 07:31:30.654	f
15	Putri Maharani	putri.maharani@digitakgudang.com	$2b$10$nNMA1nSQUgj.i28DB9yxxOsDvk31wkYF.1nNFD7CTlluodxDOqDzC	supervisor	t	2026-09-07 07:31:30.461	2026-09-07 07:31:30.461	f
18	Nanda Permata	nanda.permata@digitakgudang.com	$2b$10$Y3dyZbG0i9AEpeyGicAH7.kDv7TQWoJbTFS4aO23QefCXJhYcn3be	supervisor	t	2026-09-07 07:31:30.749	2026-09-07 07:31:30.749	f
19	Biladi Mil Urahmah	Biladi@mail.com	$2b$10$UStjo/ZI9BEDdr0./BGvee.Gj7tOWF4ImtsK6q6vnssSjXnDvN.G2	supervisor	f	2026-09-12 14:37:15.716	2026-09-12 14:37:15.716	f
8	Andi Pratama	andi.pratama@digitakgudang.com	$2b$10$fUMTMZSnySAQjdYXWHg8peIh1Opnhc/wl5cQxtSuZc1fJR5erg7iu	staf_gudang	t	2026-09-07 07:31:29.772	2026-09-07 07:31:29.772	f
21	Arvinna Siti Meilani Taufik	Arvin@digitakgudang.com	$2b$10$yndR8ily4gXxKCv/SL4XEemNifDkRT4CJpwOB55.jCuRkVovu/8S6	supervisor	t	2026-09-18 10:32:22.614	2026-09-18 10:32:22.614	t
4	Ardi Alfarisi	admin@digitakgudang.com	$2b$10$1uCtIJ./DX.Oz8mIkM/9aejZDk4eBZ0MV1ooqH3mpubW.MROfX/Qm	admin_general	t	2026-09-07 07:31:29.389	2026-09-07 07:31:29.389	f
\.


--
-- Data for Name: zona_gudang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zona_gudang (zona_id, gudang_id, kode_zona, nama_zona, tipe_zona, status_kecukupan, dinilai_oleh, dinilai_pada, kapasitas_maksimum, status_kecukupan_source) FROM stdin;
7	2	C	Zona C	Outdoor	CUKUP	\N	\N	\N	\N
3	1	C	Zona C	Outdoor	CUKUP	\N	\N	\N	AUTO
1	1	A	Zona A	Indoor	CUKUP	\N	\N	\N	AUTO
2	1	B	Zona B	Indoor	CUKUP	\N	\N	\N	AUTO
8	2	D	Zona D	Outdoor	CUKUP	\N	\N	\N	AUTO
6	2	B	Zona B	Indoor	MENDEKATI_PENUH	5	2026-09-11 14:58:03.309	\N	MANUAL
9	4	A	Zona A	Indoor	CUKUP	\N	\N	\N	\N
10	4	B	Zona B	Indoor	CUKUP	\N	\N	\N	\N
11	4	C	Zona C	Outdoor	CUKUP	\N	\N	\N	\N
15	1	D	Zona D	\N	CUKUP	\N	\N	\N	\N
17	1	E	Zona E Di Gudang 1	\N	CUKUP	\N	\N	\N	\N
22	4	D	Zona D	Outdoor	CUKUP	\N	\N	\N	\N
23	5	Biladi	Area Utama	Indoor	CUKUP	\N	\N	\N	\N
24	6	DEFAULT	Area Utama	Indoor	CUKUP	\N	\N	\N	\N
26	7	B	Zona B	Indoor	CUKUP	\N	\N	\N	\N
27	7	C	Zona C	Outdoor	CUKUP	\N	\N	\N	\N
28	7	D	Zona D	Outdoor	CUKUP	\N	\N	\N	\N
25	7	A	Zona A	Indoor	TIDAK_CUKUP	4	2026-09-18 12:07:52.326	\N	MANUAL
5	2	A	Zona A	Indoor	CUKUP	4	2026-09-18 12:08:31.233	200	MANUAL
\.


--
-- Data for Name: zona_utilisasi_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zona_utilisasi_log (log_id, zona_id, status, diperbarui_oleh, catatan, created_at) FROM stdin;
1	6	MENDEKATI_PENUH	5	Status kecukupan diperbarui menjadi MENDEKATI_PENUH	2026-09-11 14:58:03.317
2	5	MENDEKATI_PENUH	19	Status kecukupan diperbarui menjadi MENDEKATI_PENUH	2026-09-12 14:44:25.021
3	5	CUKUP	4	Status kecukupan diperbarui menjadi CUKUP	2026-09-14 13:32:49.354
4	25	TIDAK_CUKUP	4	Status kecukupan diperbarui menjadi TIDAK_CUKUP	2026-09-18 12:07:52.332
5	5	CUKUP	4	Status kecukupan diperbarui menjadi CUKUP	2026-09-18 12:08:31.236
\.


--
-- Name: approval_log_approval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.approval_log_approval_id_seq', 22, true);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_audit_id_seq', 47, true);


--
-- Name: barang_barang_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.barang_barang_id_seq', 59, true);


--
-- Name: boq_boq_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.boq_boq_id_seq', 10, true);


--
-- Name: boq_item_boq_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.boq_item_boq_item_id_seq', 59, true);


--
-- Name: gudang_gudang_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gudang_gudang_id_seq', 7, true);


--
-- Name: kategori_barang_kategori_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kategori_barang_kategori_id_seq', 6, true);


--
-- Name: kendaraan_kendaraan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kendaraan_kendaraan_id_seq', 7, true);


--
-- Name: laporan_mitra_laporan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.laporan_mitra_laporan_id_seq', 1, false);


--
-- Name: notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_id_seq', 325, true);


--
-- Name: permintaan_boq_permintaan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permintaan_boq_permintaan_id_seq', 2, true);


--
-- Name: personil_personil_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personil_personil_id_seq', 18, true);


--
-- Name: project_project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_project_id_seq', 9, true);


--
-- Name: reconciliation_upload_detail_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reconciliation_upload_detail_detail_id_seq', 1, false);


--
-- Name: reconciliation_upload_log_upload_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reconciliation_upload_log_upload_id_seq', 1, false);


--
-- Name: satuan_satuan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.satuan_satuan_id_seq', 5, true);


--
-- Name: stok_gudang_stok_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stok_gudang_stok_id_seq', 48, true);


--
-- Name: stok_ledger_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stok_ledger_ledger_id_seq', 86, true);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_supplier_id_seq', 1, true);


--
-- Name: surat_jalan_item_foto_foto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.surat_jalan_item_foto_foto_id_seq', 24, true);


--
-- Name: surat_jalan_item_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.surat_jalan_item_item_id_seq', 53, true);


--
-- Name: surat_jalan_surat_jalan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.surat_jalan_surat_jalan_id_seq', 27, true);


--
-- Name: tiket_material_tiket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tiket_material_tiket_id_seq', 14, true);


--
-- Name: titik_lapangan_titik_lapangan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.titik_lapangan_titik_lapangan_id_seq', 2, true);


--
-- Name: user_account_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_account_user_id_seq', 21, true);


--
-- Name: zona_gudang_zona_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zona_gudang_zona_id_seq', 28, true);


--
-- Name: zona_utilisasi_log_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zona_utilisasi_log_log_id_seq', 5, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: approval_log approval_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_log
    ADD CONSTRAINT approval_log_pkey PRIMARY KEY (approval_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: barang barang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang
    ADD CONSTRAINT barang_pkey PRIMARY KEY (barang_id);


--
-- Name: boq_item boq_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item
    ADD CONSTRAINT boq_item_pkey PRIMARY KEY (boq_item_id);


--
-- Name: boq boq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_pkey PRIMARY KEY (boq_id);


--
-- Name: gudang gudang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang
    ADD CONSTRAINT gudang_pkey PRIMARY KEY (gudang_id);


--
-- Name: kategori_barang kategori_barang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori_barang
    ADD CONSTRAINT kategori_barang_pkey PRIMARY KEY (kategori_id);


--
-- Name: kendaraan kendaraan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kendaraan
    ADD CONSTRAINT kendaraan_pkey PRIMARY KEY (kendaraan_id);


--
-- Name: laporan_mitra laporan_mitra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan_mitra
    ADD CONSTRAINT laporan_mitra_pkey PRIMARY KEY (laporan_id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: permintaan_boq permintaan_boq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_pkey PRIMARY KEY (permintaan_id);


--
-- Name: personil personil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil
    ADD CONSTRAINT personil_pkey PRIMARY KEY (personil_id);


--
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_pkey PRIMARY KEY (project_id);


--
-- Name: reconciliation_upload_detail reconciliation_upload_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_detail
    ADD CONSTRAINT reconciliation_upload_detail_pkey PRIMARY KEY (detail_id);


--
-- Name: reconciliation_upload_log reconciliation_upload_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_log
    ADD CONSTRAINT reconciliation_upload_log_pkey PRIMARY KEY (upload_id);


--
-- Name: satuan satuan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satuan
    ADD CONSTRAINT satuan_pkey PRIMARY KEY (satuan_id);


--
-- Name: stok_gudang stok_gudang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang
    ADD CONSTRAINT stok_gudang_pkey PRIMARY KEY (stok_id);


--
-- Name: stok_ledger stok_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_ledger
    ADD CONSTRAINT stok_ledger_pkey PRIMARY KEY (ledger_id);


--
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id);


--
-- Name: surat_jalan_item_foto surat_jalan_item_foto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item_foto
    ADD CONSTRAINT surat_jalan_item_foto_pkey PRIMARY KEY (foto_id);


--
-- Name: surat_jalan_item surat_jalan_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_pkey PRIMARY KEY (item_id);


--
-- Name: surat_jalan surat_jalan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_pkey PRIMARY KEY (surat_jalan_id);


--
-- Name: tiket_material tiket_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiket_material
    ADD CONSTRAINT tiket_material_pkey PRIMARY KEY (tiket_id);


--
-- Name: titik_lapangan titik_lapangan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titik_lapangan
    ADD CONSTRAINT titik_lapangan_pkey PRIMARY KEY (titik_lapangan_id);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (user_id);


--
-- Name: zona_gudang zona_gudang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_gudang
    ADD CONSTRAINT zona_gudang_pkey PRIMARY KEY (zona_id);


--
-- Name: zona_utilisasi_log zona_utilisasi_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_utilisasi_log
    ADD CONSTRAINT zona_utilisasi_log_pkey PRIMARY KEY (log_id);


--
-- Name: approval_log_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_log_entity_type_entity_id_idx ON public.approval_log USING btree (entity_type, entity_id);


--
-- Name: audit_log_actor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_actor_id_idx ON public.audit_log USING btree (actor_id);


--
-- Name: audit_log_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_entity_type_entity_id_idx ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: barang_kategori_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX barang_kategori_id_idx ON public.barang USING btree (kategori_id);


--
-- Name: barang_kode_perangkat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX barang_kode_perangkat_idx ON public.barang USING btree (kode_perangkat);


--
-- Name: barang_kode_perangkat_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX barang_kode_perangkat_key ON public.barang USING btree (kode_perangkat);


--
-- Name: boq_boq_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boq_boq_number_idx ON public.boq USING btree (boq_number);


--
-- Name: boq_boq_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX boq_boq_number_key ON public.boq USING btree (boq_number);


--
-- Name: boq_item_barang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boq_item_barang_id_idx ON public.boq_item USING btree (barang_id);


--
-- Name: boq_item_boq_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boq_item_boq_id_idx ON public.boq_item USING btree (boq_id);


--
-- Name: boq_item_satuan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boq_item_satuan_id_idx ON public.boq_item USING btree (satuan_id);


--
-- Name: boq_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boq_status_idx ON public.boq USING btree (status);


--
-- Name: boq_tiket_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX boq_tiket_id_key ON public.boq USING btree (tiket_id);


--
-- Name: gudang_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gudang_project_id_idx ON public.gudang USING btree (project_id);


--
-- Name: gudang_status_kecukupan_gudang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gudang_status_kecukupan_gudang_idx ON public.gudang USING btree (status_kecukupan_gudang) WHERE (status_kecukupan_gudang IS NOT NULL);


--
-- Name: gudang_tipe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gudang_tipe_idx ON public.gudang USING btree (tipe);


--
-- Name: kategori_barang_nama_kategori_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kategori_barang_nama_kategori_idx ON public.kategori_barang USING btree (nama_kategori);


--
-- Name: kategori_barang_nama_kategori_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kategori_barang_nama_kategori_key ON public.kategori_barang USING btree (nama_kategori);


--
-- Name: kendaraan_gudang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kendaraan_gudang_id_idx ON public.kendaraan USING btree (gudang_id);


--
-- Name: kendaraan_no_polisi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kendaraan_no_polisi_idx ON public.kendaraan USING btree (no_polisi);


--
-- Name: kendaraan_no_polisi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kendaraan_no_polisi_key ON public.kendaraan USING btree (no_polisi);


--
-- Name: laporan_mitra_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laporan_mitra_project_id_idx ON public.laporan_mitra USING btree (project_id);


--
-- Name: laporan_mitra_tanggal_laporan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laporan_mitra_tanggal_laporan_idx ON public.laporan_mitra USING btree (tanggal_laporan);


--
-- Name: laporan_mitra_tiket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laporan_mitra_tiket_id_idx ON public.laporan_mitra USING btree (tiket_id);


--
-- Name: laporan_mitra_uploaded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laporan_mitra_uploaded_at_idx ON public.laporan_mitra USING btree (uploaded_at);


--
-- Name: notification_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_created_at_idx ON public.notification USING btree (created_at);


--
-- Name: notification_role_is_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_role_is_read_idx ON public.notification USING btree (role, is_read);


--
-- Name: notification_user_id_is_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_user_id_is_read_idx ON public.notification USING btree (user_id, is_read);


--
-- Name: password_resets_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_resets_token_key ON public.password_resets USING btree (token);


--
-- Name: permintaan_boq_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permintaan_boq_project_id_idx ON public.permintaan_boq USING btree (project_id);


--
-- Name: permintaan_boq_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permintaan_boq_status_idx ON public.permintaan_boq USING btree (status);


--
-- Name: personil_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personil_email_key ON public.personil USING btree (email);


--
-- Name: personil_gudang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personil_gudang_id_idx ON public.personil USING btree (gudang_id);


--
-- Name: personil_nik_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personil_nik_idx ON public.personil USING btree (nik);


--
-- Name: personil_nik_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personil_nik_key ON public.personil USING btree (nik);


--
-- Name: personil_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personil_user_id_idx ON public.personil USING btree (user_id);


--
-- Name: personil_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personil_user_id_key ON public.personil USING btree (user_id);


--
-- Name: project_area_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_area_idx ON public.project USING btree (area);


--
-- Name: reconciliation_upload_detail_upload_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reconciliation_upload_detail_upload_id_idx ON public.reconciliation_upload_detail USING btree (upload_id);


--
-- Name: reconciliation_upload_log_uploaded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reconciliation_upload_log_uploaded_at_idx ON public.reconciliation_upload_log USING btree (uploaded_at);


--
-- Name: satuan_kode_satuan_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX satuan_kode_satuan_key ON public.satuan USING btree (kode_satuan);


--
-- Name: stok_gudang_gudang_id_barang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stok_gudang_gudang_id_barang_id_idx ON public.stok_gudang USING btree (gudang_id, barang_id);


--
-- Name: stok_gudang_gudang_id_zona_id_barang_id_project_id_kondisi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stok_gudang_gudang_id_zona_id_barang_id_project_id_kondisi_key ON public.stok_gudang USING btree (gudang_id, zona_id, barang_id, project_id, kondisi);


--
-- Name: stok_gudang_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stok_gudang_project_id_idx ON public.stok_gudang USING btree (project_id);


--
-- Name: stok_ledger_barang_id_waktu_mutasi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stok_ledger_barang_id_waktu_mutasi_idx ON public.stok_ledger USING btree (barang_id, waktu_mutasi);


--
-- Name: stok_ledger_surat_jalan_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stok_ledger_surat_jalan_item_id_idx ON public.stok_ledger USING btree (surat_jalan_item_id);


--
-- Name: supplier_kode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_kode_key ON public.supplier USING btree (kode);


--
-- Name: surat_jalan_item_foto_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX surat_jalan_item_foto_item_id_idx ON public.surat_jalan_item_foto USING btree (item_id);


--
-- Name: surat_jalan_item_surat_jalan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX surat_jalan_item_surat_jalan_id_idx ON public.surat_jalan_item USING btree (surat_jalan_id);


--
-- Name: surat_jalan_nomor_surat_jalan_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX surat_jalan_nomor_surat_jalan_key ON public.surat_jalan USING btree (nomor_surat_jalan);


--
-- Name: surat_jalan_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX surat_jalan_project_id_idx ON public.surat_jalan USING btree (project_id);


--
-- Name: surat_jalan_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX surat_jalan_status_idx ON public.surat_jalan USING btree (status);


--
-- Name: tiket_material_kode_tiket_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tiket_material_kode_tiket_key ON public.tiket_material USING btree (kode_tiket);


--
-- Name: tiket_material_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tiket_material_project_id_idx ON public.tiket_material USING btree (project_id);


--
-- Name: titik_lapangan_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX titik_lapangan_project_id_idx ON public.titik_lapangan USING btree (project_id);


--
-- Name: user_account_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_account_email_idx ON public.user_account USING btree (email);


--
-- Name: user_account_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_account_email_key ON public.user_account USING btree (email);


--
-- Name: zona_gudang_gudang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zona_gudang_gudang_id_idx ON public.zona_gudang USING btree (gudang_id);


--
-- Name: zona_gudang_gudang_id_kode_zona_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX zona_gudang_gudang_id_kode_zona_key ON public.zona_gudang USING btree (gudang_id, kode_zona);


--
-- Name: zona_utilisasi_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zona_utilisasi_log_created_at_idx ON public.zona_utilisasi_log USING btree (created_at);


--
-- Name: zona_utilisasi_log_zona_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zona_utilisasi_log_zona_id_idx ON public.zona_utilisasi_log USING btree (zona_id);


--
-- Name: approval_log approval_log_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_log
    ADD CONSTRAINT approval_log_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: barang barang_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang
    ADD CONSTRAINT barang_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: barang barang_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang
    ADD CONSTRAINT barang_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori_barang(kategori_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: barang barang_satuan_default_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang
    ADD CONSTRAINT barang_satuan_default_id_fkey FOREIGN KEY (satuan_default_id) REFERENCES public.satuan(satuan_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: barang barang_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barang
    ADD CONSTRAINT barang_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: boq boq_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: boq boq_diaktifkan_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_diaktifkan_oleh_fkey FOREIGN KEY (diaktifkan_oleh) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: boq_item boq_item_barang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item
    ADD CONSTRAINT boq_item_barang_id_fkey FOREIGN KEY (barang_id) REFERENCES public.barang(barang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: boq_item boq_item_boq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item
    ADD CONSTRAINT boq_item_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boq(boq_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: boq_item boq_item_gudang_tujuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item
    ADD CONSTRAINT boq_item_gudang_tujuan_id_fkey FOREIGN KEY (gudang_tujuan_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: boq_item boq_item_satuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq_item
    ADD CONSTRAINT boq_item_satuan_id_fkey FOREIGN KEY (satuan_id) REFERENCES public.satuan(satuan_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: boq boq_tiket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_tiket_id_fkey FOREIGN KEY (tiket_id) REFERENCES public.tiket_material(tiket_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: boq boq_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gudang gudang_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang
    ADD CONSTRAINT gudang_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gudang gudang_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang
    ADD CONSTRAINT gudang_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.personil(personil_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gudang gudang_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang
    ADD CONSTRAINT gudang_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gudang gudang_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang
    ADD CONSTRAINT gudang_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kendaraan kendaraan_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kendaraan
    ADD CONSTRAINT kendaraan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kendaraan kendaraan_gudang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kendaraan
    ADD CONSTRAINT kendaraan_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kendaraan kendaraan_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kendaraan
    ADD CONSTRAINT kendaraan_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_mitra laporan_mitra_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan_mitra
    ADD CONSTRAINT laporan_mitra_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_mitra laporan_mitra_tiket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan_mitra
    ADD CONSTRAINT laporan_mitra_tiket_id_fkey FOREIGN KEY (tiket_id) REFERENCES public.tiket_material(tiket_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_mitra laporan_mitra_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan_mitra
    ADD CONSTRAINT laporan_mitra_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notification notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: permintaan_boq permintaan_boq_barang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_barang_id_fkey FOREIGN KEY (barang_id) REFERENCES public.barang(barang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: permintaan_boq permintaan_boq_diajukan_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_diajukan_oleh_fkey FOREIGN KEY (diajukan_oleh) REFERENCES public.personil(personil_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: permintaan_boq permintaan_boq_ditinjau_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_ditinjau_oleh_fkey FOREIGN KEY (ditinjau_oleh) REFERENCES public.personil(personil_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: permintaan_boq permintaan_boq_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: permintaan_boq permintaan_boq_tiket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permintaan_boq
    ADD CONSTRAINT permintaan_boq_tiket_id_fkey FOREIGN KEY (tiket_id) REFERENCES public.tiket_material(tiket_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personil personil_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil
    ADD CONSTRAINT personil_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personil personil_gudang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil
    ADD CONSTRAINT personil_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personil personil_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil
    ADD CONSTRAINT personil_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personil personil_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personil
    ADD CONSTRAINT personil_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project project_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project project_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_upload_detail reconciliation_upload_detail_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_detail
    ADD CONSTRAINT reconciliation_upload_detail_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.reconciliation_upload_log(upload_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_upload_log reconciliation_upload_log_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_upload_log
    ADD CONSTRAINT reconciliation_upload_log_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stok_gudang stok_gudang_barang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang
    ADD CONSTRAINT stok_gudang_barang_id_fkey FOREIGN KEY (barang_id) REFERENCES public.barang(barang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stok_gudang stok_gudang_gudang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang
    ADD CONSTRAINT stok_gudang_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stok_gudang stok_gudang_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang
    ADD CONSTRAINT stok_gudang_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stok_gudang stok_gudang_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_gudang
    ADD CONSTRAINT stok_gudang_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zona_gudang(zona_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stok_ledger stok_ledger_barang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_ledger
    ADD CONSTRAINT stok_ledger_barang_id_fkey FOREIGN KEY (barang_id) REFERENCES public.barang(barang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stok_ledger stok_ledger_surat_jalan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_ledger
    ADD CONSTRAINT stok_ledger_surat_jalan_item_id_fkey FOREIGN KEY (surat_jalan_item_id) REFERENCES public.surat_jalan_item(item_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: surat_jalan surat_jalan_boq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boq(boq_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: surat_jalan surat_jalan_gudang_asal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_gudang_asal_id_fkey FOREIGN KEY (gudang_asal_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_gudang_tujuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_gudang_tujuan_id_fkey FOREIGN KEY (gudang_tujuan_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan_item surat_jalan_item_barang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_barang_id_fkey FOREIGN KEY (barang_id) REFERENCES public.barang(barang_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: surat_jalan_item surat_jalan_item_diperiksa_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_diperiksa_oleh_fkey FOREIGN KEY (diperiksa_oleh) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan_item_foto surat_jalan_item_foto_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item_foto
    ADD CONSTRAINT surat_jalan_item_foto_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.surat_jalan_item(item_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: surat_jalan_item surat_jalan_item_satuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_satuan_id_fkey FOREIGN KEY (satuan_id) REFERENCES public.satuan(satuan_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: surat_jalan_item surat_jalan_item_surat_jalan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_surat_jalan_id_fkey FOREIGN KEY (surat_jalan_id) REFERENCES public.surat_jalan(surat_jalan_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: surat_jalan_item surat_jalan_item_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan_item
    ADD CONSTRAINT surat_jalan_item_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zona_gudang(zona_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_kendaraan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_kendaraan_id_fkey FOREIGN KEY (kendaraan_id) REFERENCES public.kendaraan(kendaraan_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_personil_pengantar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_personil_pengantar_id_fkey FOREIGN KEY (personil_pengantar_id) REFERENCES public.personil(personil_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_titik_lapangan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_titik_lapangan_id_fkey FOREIGN KEY (titik_lapangan_id) REFERENCES public.titik_lapangan(titik_lapangan_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: surat_jalan surat_jalan_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_jalan
    ADD CONSTRAINT surat_jalan_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tiket_material tiket_material_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiket_material
    ADD CONSTRAINT tiket_material_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tiket_material tiket_material_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiket_material
    ADD CONSTRAINT tiket_material_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: titik_lapangan titik_lapangan_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titik_lapangan
    ADD CONSTRAINT titik_lapangan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: titik_lapangan titik_lapangan_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titik_lapangan
    ADD CONSTRAINT titik_lapangan_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: titik_lapangan titik_lapangan_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titik_lapangan
    ADD CONSTRAINT titik_lapangan_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: zona_gudang zona_gudang_dinilai_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_gudang
    ADD CONSTRAINT zona_gudang_dinilai_oleh_fkey FOREIGN KEY (dinilai_oleh) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: zona_gudang zona_gudang_gudang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_gudang
    ADD CONSTRAINT zona_gudang_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES public.gudang(gudang_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: zona_utilisasi_log zona_utilisasi_log_diperbarui_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_utilisasi_log
    ADD CONSTRAINT zona_utilisasi_log_diperbarui_oleh_fkey FOREIGN KEY (diperbarui_oleh) REFERENCES public.user_account(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: zona_utilisasi_log zona_utilisasi_log_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona_utilisasi_log
    ADD CONSTRAINT zona_utilisasi_log_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zona_gudang(zona_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QtnvdUgSKCQm0msoGmjdPRyjeDB6uLl3eCjt6ztbW7PHcO3C8KsqdHA8IAG46q2

