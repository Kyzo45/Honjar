--
-- PostgreSQL database dump
--

\restrict u3DtQvDUWKvge0uGRwLxX4Ip1fV13t61PildH1KwX6Zc3iSOPYXXt3puq7UaPPZ

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-09-10 21:30:30

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 16972)
-- Name: dosen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dosen (
    id integer NOT NULL,
    nid character varying(20) NOT NULL,
    nama character varying(100) NOT NULL,
    status_dosen character varying(10) DEFAULT 'tetap'::character varying NOT NULL,
    CONSTRAINT dosen_status_dosen_check CHECK (((status_dosen)::text = ANY ((ARRAY['tetap'::character varying, 'luar'::character varying])::text[])))
);


ALTER TABLE public.dosen OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16971)
-- Name: dosen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dosen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dosen_id_seq OWNER TO postgres;

--
-- TOC entry 5104 (class 0 OID 0)
-- Dependencies: 222
-- Name: dosen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dosen_id_seq OWNED BY public.dosen.id;


--
-- TOC entry 227 (class 1259 OID 17030)
-- Name: dosen_mata_kuliah; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dosen_mata_kuliah (
    mata_kuliah_id integer NOT NULL,
    dosen_id integer NOT NULL
);


ALTER TABLE public.dosen_mata_kuliah OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17072)
-- Name: kehadiran_mahasiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kehadiran_mahasiswa (
    id integer NOT NULL,
    pertemuan_id integer,
    mahasiswa_nim character varying(15),
    status character varying(10) NOT NULL,
    file_bukti character varying(255),
    file_nama_asli character varying(255),
    CONSTRAINT kehadiran_mahasiswa_status_check CHECK (((status)::text = ANY ((ARRAY['hadir'::character varying, 'sakit'::character varying, 'izin'::character varying, 'tanpa'::character varying])::text[])))
);


ALTER TABLE public.kehadiran_mahasiswa OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17071)
-- Name: kehadiran_mahasiswa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kehadiran_mahasiswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kehadiran_mahasiswa_id_seq OWNER TO postgres;

--
-- TOC entry 5105 (class 0 OID 0)
-- Dependencies: 230
-- Name: kehadiran_mahasiswa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kehadiran_mahasiswa_id_seq OWNED BY public.kehadiran_mahasiswa.id;


--
-- TOC entry 226 (class 1259 OID 17013)
-- Name: krs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.krs (
    mahasiswa_nim character varying(15) NOT NULL,
    mata_kuliah_id integer NOT NULL
);


ALTER TABLE public.krs OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16947)
-- Name: mahasiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mahasiswa (
    nim character varying(15) NOT NULL,
    nama character varying(100) NOT NULL,
    angkatan character varying(10)
);


ALTER TABLE public.mahasiswa OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16989)
-- Name: mata_kuliah; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.mata_kuliah OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16988)
-- Name: mata_kuliah_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mata_kuliah_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mata_kuliah_id_seq OWNER TO postgres;

--
-- TOC entry 5106 (class 0 OID 0)
-- Dependencies: 224
-- Name: mata_kuliah_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mata_kuliah_id_seq OWNED BY public.mata_kuliah.id;


--
-- TOC entry 229 (class 1259 OID 17048)
-- Name: pertemuan; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.pertemuan OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17047)
-- Name: pertemuan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pertemuan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pertemuan_id_seq OWNER TO postgres;

--
-- TOC entry 5107 (class 0 OID 0)
-- Dependencies: 228
-- Name: pertemuan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pertemuan_id_seq OWNED BY public.pertemuan.id;


--
-- TOC entry 221 (class 1259 OID 16955)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16954)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5108 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4889 (class 2604 OID 16975)
-- Name: dosen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen ALTER COLUMN id SET DEFAULT nextval('public.dosen_id_seq'::regclass);


--
-- TOC entry 4894 (class 2604 OID 17075)
-- Name: kehadiran_mahasiswa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kehadiran_mahasiswa ALTER COLUMN id SET DEFAULT nextval('public.kehadiran_mahasiswa_id_seq'::regclass);


--
-- TOC entry 4891 (class 2604 OID 16992)
-- Name: mata_kuliah id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mata_kuliah ALTER COLUMN id SET DEFAULT nextval('public.mata_kuliah_id_seq'::regclass);


--
-- TOC entry 4892 (class 2604 OID 17051)
-- Name: pertemuan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pertemuan ALTER COLUMN id SET DEFAULT nextval('public.pertemuan_id_seq'::regclass);


--
-- TOC entry 4888 (class 2604 OID 16958)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5090 (class 0 OID 16972)
-- Dependencies: 223
-- Data for Name: dosen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dosen (id, nid, nama, status_dosen) FROM stdin;
1	DSN0001	Dr. Arina Novilla, M.Kes.	tetap
2	DSN0002	M. Ratna Ningrum, M.Si.	tetap
3	DSN0003	Taufik Gunawan, S.Tr.Kes.	tetap
4	DSN0004	Bayu Dwi Rianto, M.Biomed.	tetap
5	DSN0005	Dr. Erick Khristian, M.Si.	tetap
6	DSN0006	Anggi Sandika, S.Tr.Kes., MM.	luar
\.


--
-- TOC entry 5094 (class 0 OID 17030)
-- Dependencies: 227
-- Data for Name: dosen_mata_kuliah; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dosen_mata_kuliah (mata_kuliah_id, dosen_id) FROM stdin;
1	2
1	3
2	4
3	5
4	6
\.


--
-- TOC entry 5098 (class 0 OID 17072)
-- Dependencies: 231
-- Data for Name: kehadiran_mahasiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kehadiran_mahasiswa (id, pertemuan_id, mahasiswa_nim, status, file_bukti, file_nama_asli) FROM stdin;
1	1	4211005	sakit	surat_dokter.pdf	\N
2	3	4211010	izin	surat_tugas.pdf	\N
\.


--
-- TOC entry 5093 (class 0 OID 17013)
-- Dependencies: 226
-- Data for Name: krs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.krs (mahasiswa_nim, mata_kuliah_id) FROM stdin;
4211001	1
4211001	2
4211001	3
4211001	4
4211002	1
4211002	2
4211002	3
4211002	4
4211003	1
4211003	2
4211003	3
4211003	4
4211004	1
4211004	2
4211004	3
4211004	4
4211005	1
4211005	2
4211005	3
4211005	4
4211006	1
4211006	2
4211006	3
4211006	4
4211007	1
4211007	2
4211007	3
4211007	4
4211008	1
4211008	2
4211008	3
4211008	4
4211009	1
4211009	2
4211009	3
4211009	4
4211010	1
4211010	2
4211010	3
4211010	4
4211011	1
4211011	2
4211011	3
4211011	4
4211012	1
4211012	2
4211012	3
4211012	4
\.


--
-- TOC entry 5086 (class 0 OID 16947)
-- Dependencies: 219
-- Data for Name: mahasiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mahasiswa (nim, nama, angkatan) FROM stdin;
4211002	Bagas Nurwahid	2021
4211003	Citra Halimah	2021
4211004	Dwi Anggara	2021
4211005	Elsa Nurhaliza	2021
4211006	Fajar Sidiq	2021
4211007	Gita Maharani	2021
4211008	Hilman Rizky	2021
4211009	Intan Permata	2021
4211010	Joko Prasetyo	2021
4211011	Karina Ayu	2021
4211012	Lukman Hakim	2021
4211001	Adinda Pramesti	2022
\.


--
-- TOC entry 5092 (class 0 OID 16989)
-- Dependencies: 225
-- Data for Name: mata_kuliah; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mata_kuliah (id, kode, nama, sks, kelas, semester, tipe, hari, jam_mulai, jam_selesai, ruangan, koordinator, pj_id) FROM stdin;
1	TLM2104	Hematologi Rutin dan Lengkap	2 (1T/1P)	1C	2	Teori	Senin	07:00:00	08:40:00	R.301	Dr. Arina Novilla, M.Kes.	3
2	TLM2108	Flebotomi dan Pengelolaan Spesimen	3 (1T/2P)	1C	2	Praktikum	Selasa	13:00:00	15:30:00	Lab. Hematologi	Dr. Arina Novilla, M.Kes.	3
3	TLM2112	Urinalisis dan Cairan Tubuh	2 (1T/1P)	1C	2	Teori	Kamis	09:40:00	11:20:00	R.302	Bayu Dwi Rianto, M.Biomed.	3
4	TLM2116	Komunikasi dan Promosi Kesehatan	2 (2T)	1C	2	Teori	Sabtu	08:00:00	09:40:00	R.204	Bayu Dwi Rianto, M.Biomed.	3
\.


--
-- TOC entry 5096 (class 0 OID 17048)
-- Dependencies: 229
-- Data for Name: pertemuan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pertemuan (id, mata_kuliah_id, ke, tipe, tanggal, jam_mulai, jam_selesai, durasi_menit, jumlah_jam, topik, metode, dosen_pengajar, kehadiran_dosen, jumlah_hadir_mhs) FROM stdin;
1	1	1	kuliah	2026-02-26	07:00:00	08:40:00	100	2	Pendahuluan	Teori	Dr. Arina Novilla, M.Kes.	hadir	11
2	1	2	kuliah	2026-03-03	07:00:00	08:40:00	100	2	Komponen dan fungsi darah	Teori	Dr. Arina Novilla, M.Kes.	hadir	12
3	1	3	kuliah	2026-03-12	07:00:00	08:40:00	100	2	Hematopoesis	Teori	Dr. Arina Novilla, M.Kes.	hadir	11
4	1	4	kuliah	2026-04-01	07:00:00	08:40:00	100	2	Eritropoesis	Teori	Dr. Arina Novilla, M.Kes.	hadir	12
5	1	5	kuliah	2026-04-09	07:00:00	08:40:00	100	2	Granulopoesis	Teori	Dr. Arina Novilla, M.Kes.	hadir	12
6	1	6	kuliah	2026-04-11	07:00:00	08:40:00	100	2	Limfopoesis	Teori	Dr. Arina Novilla, M.Kes.	hadir	12
7	1	7	kuliah	2026-04-18	07:00:00	08:40:00	100	2	Megakariopoesis	Teori	Dr. Arina Novilla, M.Kes.	hadir	12
8	1	8	uts	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
9	1	9	kuliah	2026-05-16	07:00:00	08:40:00	100	2	Hematologi rutin, kadar Hb	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
10	1	10	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
11	1	11	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
12	1	12	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
13	1	13	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
14	1	14	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
15	1	15	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
16	1	16	uas	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
17	2	1	kuliah	2026-02-26	13:00:00	15:30:00	150	3	Pendahuluan	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
18	2	2	kuliah	2026-03-03	13:00:00	15:30:00	150	3	Komponen dan fungsi darah	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
19	2	3	kuliah	2026-03-12	13:00:00	15:30:00	150	3	Hematopoesis	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
20	2	4	kuliah	2026-04-01	13:00:00	15:30:00	150	3	Eritropoesis	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
21	2	5	kuliah	2026-04-09	13:00:00	15:30:00	150	3	Granulopoesis	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
22	2	6	kuliah	2026-04-11	13:00:00	15:30:00	150	3	Limfopoesis	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
23	2	7	kuliah	2026-04-18	13:00:00	15:30:00	150	3	Megakariopoesis	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
24	2	8	uts	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
25	2	9	kuliah	2026-05-16	13:00:00	15:30:00	150	3	Hematologi rutin, kadar Hb	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
26	2	10	kuliah	2026-05-16	13:00:00	15:30:00	150	3	Laju Endap Darah	Praktikum	Dr. Arina Novilla, M.Kes.	hadir	12
27	2	11	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
28	2	12	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
29	2	13	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
30	2	14	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
31	2	15	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
32	2	16	uas	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
33	3	1	kuliah	2026-02-26	09:40:00	11:20:00	100	2	Pendahuluan	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
34	3	2	kuliah	2026-03-03	09:40:00	11:20:00	100	2	Komponen dan fungsi darah	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
35	3	3	kuliah	2026-03-12	09:40:00	11:20:00	100	2	Hematopoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
36	3	4	kuliah	2026-04-01	09:40:00	11:20:00	100	2	Eritropoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
37	3	5	kuliah	2026-04-09	09:40:00	11:20:00	100	2	Granulopoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
38	3	6	kuliah	2026-04-11	09:40:00	11:20:00	100	2	Limfopoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
39	3	7	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
40	3	8	uts	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
41	3	9	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
42	3	10	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
43	3	11	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
44	3	12	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
45	3	13	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
46	3	14	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
47	3	15	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
48	3	16	uas	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
49	4	1	kuliah	2026-02-26	08:00:00	09:40:00	100	2	Pendahuluan	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
50	4	2	kuliah	2026-03-03	08:00:00	09:40:00	100	2	Komponen dan fungsi darah	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
51	4	3	kuliah	2026-03-12	08:00:00	09:40:00	100	2	Hematopoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
52	4	4	kuliah	2026-04-01	08:00:00	09:40:00	100	2	Eritropoesis	Teori	Bayu Dwi Rianto, M.Biomed.	hadir	12
53	4	5	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
54	4	6	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
55	4	7	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
56	4	8	uts	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
57	4	9	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
58	4	10	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
59	4	11	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
60	4	12	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
61	4	13	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
62	4	14	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
63	4	15	kuliah	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
64	4	16	uas	\N	\N	\N	\N	\N	\N	\N	\N	\N	0
\.


--
-- TOC entry 5088 (class 0 OID 16955)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, nama, role, nim, angkatan, no_hp) FROM stdin;
1	admin	admin	Administrator Prodi	admin	\N	\N	\N
2	sri.wahyuni	123456	Sri Wahyuni	admin	\N	\N	\N
3	2350081070	scrypt$cc0a9195b1b95933dea1836136ecf9d9$cf9b4451d8f57639bc9f16e3f41303be87abe5dda9633166ada4b79aed9b76c219c826c39dc97b341937557f8d53878ff69e481020fc42233cdab7276f757666	Rifqi Aulia	pj	2350081070	2021	085173130210
\.


--
-- TOC entry 5109 (class 0 OID 0)
-- Dependencies: 222
-- Name: dosen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dosen_id_seq', 6, true);


--
-- TOC entry 5110 (class 0 OID 0)
-- Dependencies: 230
-- Name: kehadiran_mahasiswa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kehadiran_mahasiswa_id_seq', 2, true);


--
-- TOC entry 5111 (class 0 OID 0)
-- Dependencies: 224
-- Name: mata_kuliah_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mata_kuliah_id_seq', 4, true);


--
-- TOC entry 5112 (class 0 OID 0)
-- Dependencies: 228
-- Name: pertemuan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pertemuan_id_seq', 64, true);


--
-- TOC entry 5113 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- TOC entry 4922 (class 2606 OID 17036)
-- Name: dosen_mata_kuliah dosen_mata_kuliah_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen_mata_kuliah
    ADD CONSTRAINT dosen_mata_kuliah_pkey PRIMARY KEY (mata_kuliah_id, dosen_id);


--
-- TOC entry 4912 (class 2606 OID 16987)
-- Name: dosen dosen_nama_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_nama_key UNIQUE (nama);


--
-- TOC entry 4914 (class 2606 OID 16985)
-- Name: dosen dosen_nid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_nid_key UNIQUE (nid);


--
-- TOC entry 4916 (class 2606 OID 16983)
-- Name: dosen dosen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_pkey PRIMARY KEY (id);


--
-- TOC entry 4928 (class 2606 OID 17084)
-- Name: kehadiran_mahasiswa kehadiran_mahasiswa_pertemuan_id_mahasiswa_nim_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kehadiran_mahasiswa
    ADD CONSTRAINT kehadiran_mahasiswa_pertemuan_id_mahasiswa_nim_key UNIQUE (pertemuan_id, mahasiswa_nim);


--
-- TOC entry 4930 (class 2606 OID 17082)
-- Name: kehadiran_mahasiswa kehadiran_mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kehadiran_mahasiswa
    ADD CONSTRAINT kehadiran_mahasiswa_pkey PRIMARY KEY (id);


--
-- TOC entry 4920 (class 2606 OID 17019)
-- Name: krs krs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.krs
    ADD CONSTRAINT krs_pkey PRIMARY KEY (mahasiswa_nim, mata_kuliah_id);


--
-- TOC entry 4904 (class 2606 OID 16953)
-- Name: mahasiswa mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pkey PRIMARY KEY (nim);


--
-- TOC entry 4918 (class 2606 OID 17007)
-- Name: mata_kuliah mata_kuliah_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mata_kuliah
    ADD CONSTRAINT mata_kuliah_pkey PRIMARY KEY (id);


--
-- TOC entry 4924 (class 2606 OID 17065)
-- Name: pertemuan pertemuan_mata_kuliah_id_ke_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pertemuan
    ADD CONSTRAINT pertemuan_mata_kuliah_id_ke_key UNIQUE (mata_kuliah_id, ke);


--
-- TOC entry 4926 (class 2606 OID 17063)
-- Name: pertemuan pertemuan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pertemuan
    ADD CONSTRAINT pertemuan_pkey PRIMARY KEY (id);


--
-- TOC entry 4906 (class 2606 OID 16970)
-- Name: users users_nim_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nim_key UNIQUE (nim);


--
-- TOC entry 4908 (class 2606 OID 16966)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4910 (class 2606 OID 16968)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4934 (class 2606 OID 17042)
-- Name: dosen_mata_kuliah dosen_mata_kuliah_dosen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen_mata_kuliah
    ADD CONSTRAINT dosen_mata_kuliah_dosen_id_fkey FOREIGN KEY (dosen_id) REFERENCES public.dosen(id) ON DELETE CASCADE;


--
-- TOC entry 4935 (class 2606 OID 17037)
-- Name: dosen_mata_kuliah dosen_mata_kuliah_mata_kuliah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen_mata_kuliah
    ADD CONSTRAINT dosen_mata_kuliah_mata_kuliah_id_fkey FOREIGN KEY (mata_kuliah_id) REFERENCES public.mata_kuliah(id) ON DELETE CASCADE;


--
-- TOC entry 4937 (class 2606 OID 17090)
-- Name: kehadiran_mahasiswa kehadiran_mahasiswa_mahasiswa_nim_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kehadiran_mahasiswa
    ADD CONSTRAINT kehadiran_mahasiswa_mahasiswa_nim_fkey FOREIGN KEY (mahasiswa_nim) REFERENCES public.mahasiswa(nim) ON DELETE CASCADE;


--
-- TOC entry 4938 (class 2606 OID 17085)
-- Name: kehadiran_mahasiswa kehadiran_mahasiswa_pertemuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kehadiran_mahasiswa
    ADD CONSTRAINT kehadiran_mahasiswa_pertemuan_id_fkey FOREIGN KEY (pertemuan_id) REFERENCES public.pertemuan(id) ON DELETE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 17020)
-- Name: krs krs_mahasiswa_nim_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.krs
    ADD CONSTRAINT krs_mahasiswa_nim_fkey FOREIGN KEY (mahasiswa_nim) REFERENCES public.mahasiswa(nim) ON DELETE CASCADE;


--
-- TOC entry 4933 (class 2606 OID 17025)
-- Name: krs krs_mata_kuliah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.krs
    ADD CONSTRAINT krs_mata_kuliah_id_fkey FOREIGN KEY (mata_kuliah_id) REFERENCES public.mata_kuliah(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 17008)
-- Name: mata_kuliah mata_kuliah_pj_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mata_kuliah
    ADD CONSTRAINT mata_kuliah_pj_id_fkey FOREIGN KEY (pj_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4936 (class 2606 OID 17066)
-- Name: pertemuan pertemuan_mata_kuliah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pertemuan
    ADD CONSTRAINT pertemuan_mata_kuliah_id_fkey FOREIGN KEY (mata_kuliah_id) REFERENCES public.mata_kuliah(id) ON DELETE CASCADE;


-- Completed on 2026-09-10 21:30:30

--
-- PostgreSQL database dump complete
--

\unrestrict u3DtQvDUWKvge0uGRwLxX4Ip1fV13t61PildH1KwX6Zc3iSOPYXXt3puq7UaPPZ

