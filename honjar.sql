-- Clean schema for Neon/Vercel
-- This file removes pg_dump metadata and is safe to run directly in Neon SQL Editor.

DROP TABLE IF EXISTS kehadiran_mahasiswa CASCADE;
DROP TABLE IF EXISTS pertemuan CASCADE;
DROP TABLE IF EXISTS dosen_mata_kuliah CASCADE;
DROP TABLE IF EXISTS krs CASCADE;
DROP TABLE IF EXISTS mata_kuliah CASCADE;
DROP TABLE IF EXISTS dosen CASCADE;
DROP TABLE IF EXISTS mahasiswa CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP SEQUENCE IF EXISTS kehadiran_mahasiswa_id_seq CASCADE;
DROP SEQUENCE IF EXISTS pertemuan_id_seq CASCADE;
DROP SEQUENCE IF EXISTS mata_kuliah_id_seq CASCADE;
DROP SEQUENCE IF EXISTS dosen_id_seq CASCADE;
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;

CREATE TABLE public.dosen (
    id integer NOT NULL,
    nid character varying(20) NOT NULL,
    nama character varying(100) NOT NULL,
    status_dosen character varying(10) DEFAULT 'tetap'::character varying NOT NULL,
    CONSTRAINT dosen_status_dosen_check CHECK (((status_dosen)::text = ANY ((ARRAY['tetap'::character varying, 'luar'::character varying])::text[])))
);

CREATE SEQUENCE public.dosen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.dosen_id_seq OWNED BY public.dosen.id;

CREATE TABLE public.dosen_mata_kuliah (
    mata_kuliah_id integer NOT NULL,
    dosen_id integer NOT NULL
);

CREATE TABLE public.kehadiran_mahasiswa (
    id integer NOT NULL,
    pertemuan_id integer,
    mahasiswa_nim character varying(15),
    status character varying(10) NOT NULL,
    file_bukti character varying(255),
    file_nama_asli character varying(255),
    CONSTRAINT kehadiran_mahasiswa_status_check CHECK (((status)::text = ANY ((ARRAY['hadir'::character varying, 'sakit'::character varying, 'izin'::character varying, 'tanpa'::character varying])::text[])))
);

CREATE SEQUENCE public.kehadiran_mahasiswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.kehadiran_mahasiswa_id_seq OWNED BY public.kehadiran_mahasiswa.id;

CREATE TABLE public.krs (
    mahasiswa_nim character varying(15) NOT NULL,
    mata_kuliah_id integer NOT NULL
);

CREATE TABLE public.mahasiswa (
    nim character varying(15) NOT NULL,
    nama character varying(100) NOT NULL,
    angkatan character varying(10)
);

CREATE TABLE public.mata_kuliah (
    id integer NOT NULL,
    kode character varying(15) NOT NULL,
    nama character varying(100) NOT NULL,
    sks character varying(15) NOT NULL,
    kelas character varying(10) NOT NULL,
    semester integer NOT NULL,
    tipe character varying(15) NOT NULL,
    hari character varying(15) NOT NULL,
    jam_mulai time without time zone NOT NULL,
    jam_selesai time without time zone NOT NULL,
    ruangan character varying(50) NOT NULL,
    koordinator character varying(100) NOT NULL,
    pj_id integer,
    CONSTRAINT mata_kuliah_tipe_check CHECK (((tipe)::text = ANY ((ARRAY['Teori'::character varying, 'Praktikum'::character varying])::text[])))
);

CREATE SEQUENCE public.mata_kuliah_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mata_kuliah_id_seq OWNED BY public.mata_kuliah.id;

CREATE TABLE public.pertemuan (
    id integer NOT NULL,
    mata_kuliah_id integer,
    ke integer NOT NULL,
    tipe character varying(10) NOT NULL,
    tanggal date,
    jam_mulai time without time zone,
    jam_selesai time without time zone,
    durasi_menit integer,
    jumlah_jam integer,
    topik text,
    metode character varying(20),
    dosen_pengajar character varying(100),
    kehadiran_dosen character varying(20),
    jumlah_hadir_mhs integer DEFAULT 0,
    CONSTRAINT pertemuan_ke_check CHECK (((ke >= 1) AND (ke <= 16))),
    CONSTRAINT pertemuan_kehadiran_dosen_check CHECK (((kehadiran_dosen)::text = ANY ((ARRAY['hadir'::character varying, 'daring'::character varying, 'diganti'::character varying, 'batal'::character varying])::text[]))),
    CONSTRAINT pertemuan_metode_check CHECK (((metode)::text = ANY ((ARRAY['Teori'::character varying, 'Praktikum'::character varying, 'Lapangan'::character varying])::text[]))),
    CONSTRAINT pertemuan_tipe_check CHECK (((tipe)::text = ANY ((ARRAY['kuliah'::character varying, 'uts'::character varying, 'uas'::character varying])::text[])))
);

CREATE SEQUENCE public.pertemuan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pertemuan_id_seq OWNED BY public.pertemuan.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nama character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    nim character varying(15),
    angkatan character varying(10),
    no_hp character varying(20),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'pj'::character varying])::text[])))
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public.dosen ALTER COLUMN id SET DEFAULT nextval('public.dosen_id_seq'::regclass);
ALTER TABLE ONLY public.kehadiran_mahasiswa ALTER COLUMN id SET DEFAULT nextval('public.kehadiran_mahasiswa_id_seq'::regclass);
ALTER TABLE ONLY public.mata_kuliah ALTER COLUMN id SET DEFAULT nextval('public.mata_kuliah_id_seq'::regclass);
ALTER TABLE ONLY public.pertemuan ALTER COLUMN id SET DEFAULT nextval('public.pertemuan_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

-- Optional seed data can be inserted later from the app or a separate script.
-- Seed data for initial login and demo PJ user
-- Use this after running honjar_clean.sql

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
    ON public.users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_nim_unique
    ON public.users (LOWER(nim))
    WHERE nim IS NOT NULL;

INSERT INTO public.users (username, password_hash, nama, role, nim, angkatan, no_hp)
VALUES
  (
    'admin',
    'scrypt$c01bbc3af3591aa1185aa1c2e873e53c$9ad0197f7a5db9be8209e047fa82bf520980317ea863a153e7639124a6c2d0c804c9aee7b9bc391f560391af96d603d0bf3d5c6ed21d0a38c1bbb0015b8f06fb',
    'Administrator',
    'admin',
    NULL,
    NULL,
    NULL
  ),
  (
    '2350081070',
    'scrypt$a4377c06fdf3787be1d0774f71f4f46a$916901e18f6c57490b446a7ced901cdc9f4c1d8426872179849d7209bd307737f4f52f6d1c3696e204d98ea3f23c9696e3b5316199b2a8714d3c9ab3033253af',
    'Rifqi',
    'pj',
    '2350081070',
    '2021',
    '081234567890'
  )
ON CONFLICT (LOWER(username)) DO NOTHING;

-- Optional: quick check
SELECT id, username, nama, role, nim FROM public.users ORDER BY id;
