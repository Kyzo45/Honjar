-- ==========================================
-- SKEMA DATABASE APLIKASI HONJAR (UNJANI)
-- VERSI POSTGRESQL COMPATIBLE
-- ==========================================

-- Hapus tabel lama jika sudah ada (sesuai urutan foreign key menggunakan CASCADE)
DROP TABLE IF EXISTS kehadiran_mahasiswa CASCADE;
DROP TABLE IF EXISTS pertemuan CASCADE;
DROP TABLE IF EXISTS dosen_mata_kuliah CASCADE;
DROP TABLE IF EXISTS krs CASCADE;
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
-- 2. TABEL: users
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pj', 'dosen', 'mahasiswa')),
    mahasiswa_nim VARCHAR(15) UNIQUE,
    FOREIGN KEY (mahasiswa_nim) REFERENCES mahasiswa(nim) ON DELETE SET NULL
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
    kode_absen_aktif VARCHAR(6) NULL,
    UNIQUE (mata_kuliah_id, ke),
    FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
);

-- ==========================================
-- 8. TABEL: kehadiran_mahasiswa
-- ==========================================
CREATE TABLE kehadiran_mahasiswa (
    id SERIAL PRIMARY KEY,
    pertemuan_id INT,
    mahasiswa_nim VARCHAR(15),
    status VARCHAR(10) NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'tanpa')),
    waktu_presensi TIMESTAMP NULL DEFAULT NULL,
    file_bukti VARCHAR(255) DEFAULT NULL,
    UNIQUE (pertemuan_id, mahasiswa_nim),
    FOREIGN KEY (pertemuan_id) REFERENCES pertemuan(id) ON DELETE CASCADE,
    FOREIGN KEY (mahasiswa_nim) REFERENCES mahasiswa(nim) ON DELETE CASCADE
);

