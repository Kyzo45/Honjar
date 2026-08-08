-- ==========================================
-- SKEMA DATABASE: HONJAR (PostgreSQL)
-- Sistem Honor Mengajar & Berita Acara Kuliah
-- D4 Teknologi Laboratorium Medis (TLM) UNJANI
-- ==========================================

-- Bersihkan tabel lama jika ada (CASCADE akan menghapus foreign key terkait)
DROP TABLE IF EXISTS kehadiran_mahasiswa CASCADE;
DROP TABLE IF EXISTS pertemuan CASCADE;
DROP TABLE IF EXISTS krs CASCADE;
DROP TABLE IF EXISTS dosen_mata_kuliah CASCADE;
DROP TABLE IF EXISTS mata_kuliah CASCADE;
DROP TABLE IF EXISTS dosen CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS mahasiswa CASCADE;

-- ==========================================
-- 1. TABEL: mahasiswa
-- ==========================================
CREATE TABLE mahasiswa (
    nim VARCHAR(15) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    kelas VARCHAR(10) NOT NULL
);

-- ==========================================
-- 2. TABEL: users (Hanya untuk Admin & PJ)
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pj'))
);

-- ==========================================
-- 3. TABEL: dosen
-- ==========================================
CREATE TABLE dosen (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE
);

-- ==========================================
-- 4. TABEL: mata_kuliah
-- ==========================================
CREATE TABLE mata_kuliah (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(15) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    sks VARCHAR(15) NOT NULL,
    kelas VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    tipe VARCHAR(15) NOT NULL CHECK (tipe IN ('Teori', 'Praktikum')),
    hari VARCHAR(15) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan VARCHAR(50) NOT NULL,
    koordinator VARCHAR(100) NOT NULL,
    pj_id INT,
    FOREIGN KEY (pj_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- 5. TABEL PIVOT: krs (Kontrak Kuliah Mahasiswa)
-- ==========================================
CREATE TABLE krs (
    mahasiswa_nim VARCHAR(15),
    mata_kuliah_id INT,
    PRIMARY KEY (mahasiswa_nim, mata_kuliah_id),
    FOREIGN KEY (mahasiswa_nim) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
    FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
);

-- ==========================================
-- 6. TABEL PIVOT: dosen_mata_kuliah
-- ==========================================
CREATE TABLE dosen_mata_kuliah (
    mata_kuliah_id INT,
    dosen_id INT,
    PRIMARY KEY (mata_kuliah_id, dosen_id),
    FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE,
    FOREIGN KEY (dosen_id) REFERENCES dosen(id) ON DELETE CASCADE
);

-- ==========================================
-- 7. TABEL: pertemuan (Sesi Berita Acara)
-- ==========================================
CREATE TABLE pertemuan (
    id SERIAL PRIMARY KEY,
    mata_kuliah_id INT,
    ke INT NOT NULL CHECK (ke BETWEEN 1 AND 16),
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('kuliah', 'uts', 'uas')),
    tanggal DATE NULL,
    jam_mulai TIME NULL,
    jam_selesai TIME NULL,
    durasi_menit INT NULL,
    jumlah_jam INT NULL,
    topik TEXT NULL,
    metode VARCHAR(20) NULL CHECK (metode IN ('Teori', 'Praktikum', 'Lapangan')),
    dosen_pengajar VARCHAR(100) NULL,
    kehadiran_dosen VARCHAR(20) NULL CHECK (kehadiran_dosen IN ('hadir', 'daring', 'diganti', 'batal')),
    jumlah_hadir_mhs INT NULL DEFAULT 0,
    UNIQUE (mata_kuliah_id, ke),
    FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
);

-- ==========================================
-- 8. TABEL: kehadiran_mahasiswa (Input Presensi oleh PJ)
-- ==========================================
CREATE TABLE kehadiran_mahasiswa (
    id SERIAL PRIMARY KEY,
    pertemuan_id INT,
    mahasiswa_nim VARCHAR(15),
    status VARCHAR(10) NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'tanpa')),
    file_bukti VARCHAR(255) NULL,
    UNIQUE (pertemuan_id, mahasiswa_nim),
    FOREIGN KEY (pertemuan_id) REFERENCES pertemuan(id) ON DELETE CASCADE,
    FOREIGN KEY (mahasiswa_nim) REFERENCES mahasiswa(nim) ON DELETE CASCADE
);

-- ==========================================
-- SEED DATA UNTUK DEMO & TESTING
-- ==========================================

-- 1. Seeding Data Pengguna (Users)
INSERT INTO users (id, username, password_hash, nama, role) VALUES
(1, 'admin', 'admin', 'Administrator Prodi', 'admin'),
(2, 'sri.wahyuni', '123456', 'Sri Wahyuni', 'admin'),
(3, 'rifqi.aulia', '123456', 'Rifqi Aulia', 'pj')
ON CONFLICT (username) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;

-- 2. Seeding Data Mahasiswa
INSERT INTO mahasiswa (nim, nama, kelas) VALUES
('4211001', 'Adinda Pramesti', '1C'),
('4211002', 'Bagas Nurwahid', '1C'),
('4211003', 'Citra Halimah', '1C'),
('4211004', 'Dwi Anggara', '1C'),
('4211005', 'Elsa Nurhaliza', '1C'),
('4211006', 'Fajar Sidiq', '1C'),
('4211007', 'Gita Maharani', '1C'),
('4211008', 'Hilman Rizky', '1C'),
('4211009', 'Intan Permata', '1C'),
('4211010', 'Joko Prasetyo', '1C'),
('4211011', 'Karina Ayu', '1C'),
('4211012', 'Lukman Hakim', '1C')
ON CONFLICT (nim) DO NOTHING;

-- 3. Seeding Data Dosen
INSERT INTO dosen (id, nama) VALUES
(1, 'Dr. Arina Novilla, M.Kes.'),
(2, 'M. Ratna Ningrum, M.Si.'),
(3, 'Taufik Gunawan, S.Tr.Kes.'),
(4, 'Bayu Dwi Rianto, M.Biomed.'),
(5, 'Dr. Erick Khristian, M.Si.'),
(6, 'Anggi Sandika, S.Tr.Kes., MM.')
ON CONFLICT (nama) DO NOTHING;

SELECT setval(pg_get_serial_sequence('dosen', 'id'), COALESCE(MAX(id), 1)) FROM dosen;

-- 4. Seeding Data Mata Kuliah
INSERT INTO mata_kuliah (id, kode, nama, sks, kelas, semester, tipe, hari, jam_mulai, jam_selesai, ruangan, koordinator, pj_id) VALUES
(1, 'TLM2104', 'Hematologi Rutin dan Lengkap', '2 (1T/1P)', '1C', 2, 'Teori', 'Senin', '07:00:00', '08:40:00', 'R.301', 'Dr. Arina Novilla, M.Kes.', 3),
(2, 'TLM2108', 'Flebotomi dan Pengelolaan Spesimen', '3 (1T/2P)', '1C', 2, 'Praktikum', 'Selasa', '13:00:00', '15:30:00', 'Lab. Hematologi', 'Dr. Arina Novilla, M.Kes.', 3),
(3, 'TLM2112', 'Urinalisis dan Cairan Tubuh', '2 (1T/1P)', '1C', 2, 'Teori', 'Kamis', '09:40:00', '11:20:00', 'R.302', 'Bayu Dwi Rianto, M.Biomed.', 3),
(4, 'TLM2116', 'Komunikasi dan Promosi Kesehatan', '2 (2T)', '1C', 2, 'Teori', 'Sabtu', '08:00:00', '09:40:00', 'R.204', 'Bayu Dwi Rianto, M.Biomed.', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('mata_kuliah', 'id'), COALESCE(MAX(id), 1)) FROM mata_kuliah;

-- 5. Seeding Relasi Dosen & Mata Kuliah (Pivot)
INSERT INTO dosen_mata_kuliah (mata_kuliah_id, dosen_id) VALUES
(1, 2), -- Hematologi Rutin - M. Ratna Ningrum, M.Si.
(1, 3), -- Hematologi Rutin - Taufik Gunawan, S.Tr.Kes.
(2, 4), -- Flebotomi - Bayu Dwi Rianto, M.Biomed.
(3, 5), -- Urinalisis - Dr. Erick Khristian, M.Si.
(4, 6)  -- Komunikasi - Anggi Sandika, S.Tr.Kes., MM.
ON CONFLICT (mata_kuliah_id, dosen_id) DO NOTHING;

-- 6. Seeding KRS (Kontrak Kuliah Mahasiswa)
INSERT INTO krs (mahasiswa_nim, mata_kuliah_id)
SELECT m.nim, mk.id 
FROM mahasiswa m 
CROSS JOIN mata_kuliah mk
WHERE m.kelas = '1C'
ON CONFLICT (mahasiswa_nim, mata_kuliah_id) DO NOTHING;

-- 7. Seeding Pertemuan (16 Pertemuan per Mata Kuliah)
-- Kode MK 1 (Hematologi Rutin) - isi 9
INSERT INTO pertemuan (id, mata_kuliah_id, ke, tipe, tanggal, jam_mulai, jam_selesai, durasi_menit, jumlah_jam, topik, metode, dosen_pengajar, kehadiran_dosen, jumlah_hadir_mhs) VALUES
(1, 1, 1, 'kuliah', '2026-02-26', '07:00:00', '08:40:00', 100, 2, 'Pendahuluan', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 11),
(2, 1, 2, 'kuliah', '2026-03-03', '07:00:00', '08:40:00', 100, 2, 'Komponen dan fungsi darah', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(3, 1, 3, 'kuliah', '2026-03-12', '07:00:00', '08:40:00', 100, 2, 'Hematopoesis', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 11),
(4, 1, 4, 'kuliah', '2026-04-01', '07:00:00', '08:40:00', 100, 2, 'Eritropoesis', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(5, 1, 5, 'kuliah', '2026-04-09', '07:00:00', '08:40:00', 100, 2, 'Granulopoesis', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(6, 1, 6, 'kuliah', '2026-04-11', '07:00:00', '08:40:00', 100, 2, 'Limfopoesis', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(7, 1, 7, 'kuliah', '2026-04-18', '07:00:00', '08:40:00', 100, 2, 'Megakariopoesis', 'Teori', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(8, 1, 8, 'uts', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(9, 1, 9, 'kuliah', '2026-05-16', '07:00:00', '08:40:00', 100, 2, 'Hematologi rutin, kadar Hb', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(10, 1, 10, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(11, 1, 11, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(12, 1, 12, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(13, 1, 13, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(14, 1, 14, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(15, 1, 15, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(16, 1, 16, 'uas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0);

-- Kode MK 2 (Flebotomi) - isi 10
INSERT INTO pertemuan (id, mata_kuliah_id, ke, tipe, tanggal, jam_mulai, jam_selesai, durasi_menit, jumlah_jam, topik, metode, dosen_pengajar, kehadiran_dosen, jumlah_hadir_mhs) VALUES
(17, 2, 1, 'kuliah', '2026-02-26', '13:00:00', '15:30:00', 150, 3, 'Pendahuluan', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(18, 2, 2, 'kuliah', '2026-03-03', '13:00:00', '15:30:00', 150, 3, 'Komponen dan fungsi darah', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(19, 2, 3, 'kuliah', '2026-03-12', '13:00:00', '15:30:00', 150, 3, 'Hematopoesis', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(20, 2, 4, 'kuliah', '2026-04-01', '13:00:00', '15:30:00', 150, 3, 'Eritropoesis', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(21, 2, 5, 'kuliah', '2026-04-09', '13:00:00', '15:30:00', 150, 3, 'Granulopoesis', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(22, 2, 6, 'kuliah', '2026-04-11', '13:00:00', '15:30:00', 150, 3, 'Limfopoesis', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(23, 2, 7, 'kuliah', '2026-04-18', '13:00:00', '15:30:00', 150, 3, 'Megakariopoesis', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(24, 2, 8, 'uts', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(25, 2, 9, 'kuliah', '2026-05-16', '13:00:00', '15:30:00', 150, 3, 'Hematologi rutin, kadar Hb', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(26, 2, 10, 'kuliah', '2026-05-16', '13:00:00', '15:30:00', 150, 3, 'Laju Endap Darah', 'Praktikum', 'Dr. Arina Novilla, M.Kes.', 'hadir', 12),
(27, 2, 11, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(28, 2, 12, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(29, 2, 13, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(30, 2, 14, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(31, 2, 15, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(32, 2, 16, 'uas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0);

-- Kode MK 3 (Urinalisis) - isi 6
INSERT INTO pertemuan (id, mata_kuliah_id, ke, tipe, tanggal, jam_mulai, jam_selesai, durasi_menit, jumlah_jam, topik, metode, dosen_pengajar, kehadiran_dosen, jumlah_hadir_mhs) VALUES
(33, 3, 1, 'kuliah', '2026-02-26', '09:40:00', '11:20:00', 100, 2, 'Pendahuluan', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(34, 3, 2, 'kuliah', '2026-03-03', '09:40:00', '11:20:00', 100, 2, 'Komponen dan fungsi darah', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(35, 3, 3, 'kuliah', '2026-03-12', '09:40:00', '11:20:00', 100, 2, 'Hematopoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(36, 3, 4, 'kuliah', '2026-04-01', '09:40:00', '11:20:00', 100, 2, 'Eritropoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(37, 3, 5, 'kuliah', '2026-04-09', '09:40:00', '11:20:00', 100, 2, 'Granulopoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(38, 3, 6, 'kuliah', '2026-04-11', '09:40:00', '11:20:00', 100, 2, 'Limfopoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(39, 3, 7, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(40, 3, 8, 'uts', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(41, 3, 9, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(42, 3, 10, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(43, 3, 11, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(44, 3, 12, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(45, 3, 13, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(46, 3, 14, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(47, 3, 15, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(48, 3, 16, 'uas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0);

-- Kode MK 4 (Komunikasi) - isi 4
INSERT INTO pertemuan (id, mata_kuliah_id, ke, tipe, tanggal, jam_mulai, jam_selesai, durasi_menit, jumlah_jam, topik, metode, dosen_pengajar, kehadiran_dosen, jumlah_hadir_mhs) VALUES
(49, 4, 1, 'kuliah', '2026-02-26', '08:00:00', '09:40:00', 100, 2, 'Pendahuluan', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(50, 4, 2, 'kuliah', '2026-03-03', '08:00:00', '09:40:00', 100, 2, 'Komponen dan fungsi darah', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(51, 4, 3, 'kuliah', '2026-03-12', '08:00:00', '09:40:00', 100, 2, 'Hematopoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(52, 4, 4, 'kuliah', '2026-04-01', '08:00:00', '09:40:00', 100, 2, 'Eritropoesis', 'Teori', 'Bayu Dwi Rianto, M.Biomed.', 'hadir', 12),
(53, 4, 5, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(54, 4, 6, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(55, 4, 7, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(56, 4, 8, 'uts', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(57, 4, 9, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(58, 4, 10, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(59, 4, 11, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(60, 4, 12, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(61, 4, 13, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(62, 4, 14, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(63, 4, 15, 'kuliah', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(64, 4, 16, 'uas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('pertemuan', 'id'), COALESCE(MAX(id), 1)) FROM pertemuan;

-- 8. Seeding Ketidakhadiran Mahasiswa (kehadiran_mahasiswa)
INSERT INTO kehadiran_mahasiswa (pertemuan_id, mahasiswa_nim, status, file_bukti) VALUES
(1, '4211005', 'sakit', 'surat_dokter.pdf'), -- Elsa Nurhaliza sakit di Pertemuan ke-1 Hematologi
(3, '4211010', 'izin', 'surat_tugas.pdf')    -- Joko Prasetyo izin di Pertemuan ke-3 Hematologi
ON CONFLICT (pertemuan_id, mahasiswa_nim) DO NOTHING;
