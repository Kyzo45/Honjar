# Manual Book Project Honjar

## 1. Tentang Project

Honjar adalah aplikasi manajemen akademik dan administrasi honor mengajar berbasis web. Project ini dibangun dengan Next.js, React, dan PostgreSQL, dan ditujukan untuk mendukung kebutuhan operasional program studi, khususnya di lingkungan D4 Teknologi Laboratorium Medis UNJANI.

Aplikasi ini mencakup beberapa fungsi utama, yaitu:

- pengelolaan data mata kuliah
- pengelolaan data dosen
- pengelolaan data penanggung jawab (PJ) kelas
- pengelolaan data mahasiswa
- penentuan roster per mata kuliah
- input berita acara dan presensi pertemuan
- perhitungan honor dan laporan penggajian
- pencetakan data untuk kebutuhan administrasi

Project ini juga sudah memiliki struktur API backend yang dikelola melalui folder src/app/api, dengan penyimpanan utama di PostgreSQL sesuai skema database yang tersedia di honjar.sql.

---

## 2. Tujuan Sistem

Sistem ini dibuat untuk membantu admin prodi dan PJ kelas dalam mengelola kegiatan akademik secara terintegrasi, termasuk:

1. memudahkan pengelolaan kurikulum dan jadwal mata kuliah
2. menyusun daftar mahasiswa per kelas/mata kuliah
3. mengatur penugasan dosen dan PJ
4. menangani absensi dan laporan pertemuan
5. menghitung besaran honor mengajar berdasarkan data pertemuan
6. menghasilkan dokumen laporan yang siap dicetak

---

## 3. User Role dan Hak Akses

Sistem ini memiliki beberapa role utama:

### a. Admin Prodi
Admin memiliki akses ke seluruh modul utama, termasuk:

- pengelolaan mata kuliah
- pengelolaan dosen
- pengelolaan PJ
- pengelolaan mahasiswa
- monitoring kelas dan presensi
- honor dan laporan

### b. Penanggung Jawab (PJ) Kelas
PJ kelas memiliki akses untuk membimbing dan memantau kelas yang dipimpinnya, termasuk:

- melihat jadwal dan mata kuliah yang menjadi tanggung jawabnya
- mengelola roster mahasiswa
- mengecek presensi
- mengisi laporan pertemuan / berita acara

### c. Mahasiswa
Mahasiswa tidak perlu login untuk satu alur utama aplikasi karena kehadiran ditangani langsung oleh PJ kelas, sesuai desain sistem yang digunakan pada project ini.

---

## 4. Teknologi yang Digunakan

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- pg library untuk koneksi database
- CSS vanilla untuk styling
- file upload handling untuk bukti presensi

---

## 5. Struktur Project

Berikut struktur inti dari project ini:

- src/app : halaman aplikasi dan route API
- src/app/api : endpoint backend untuk login, CRUD, roster, presensi, honor, dll
- src/components : komponen UI seperti modal, sidebar, view halaman
- src/context : state management aplikasi utama
- src/lib : konfigurasi database, autentikasi, helper, dan tipe data
- public/uploads : berkas upload seperti bukti presensi
- honjar.sql : file schema database PostgreSQL
- README.md : dokumentasi proyek

---

## 6. Persiapan Environment

Sebelum menjalankan aplikasi, pastikan perangkat sudah memiliki:

- Node.js LTS
- npm
- PostgreSQL yang aktif
- database dengan nama yang sesuai

### Variabel lingkungan
Project ini dapat menggunakan konfigurasi database dengan salah satu dari dua cara berikut:

1. DATABASE_URL
2. DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

Contoh konfigurasi lokal:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=honjar
```

Atau jika memakai URL:

```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/honjar
```

> Pastikan database PostgreSQL sudah dibuat dan tabel telah dibuat sesuai skema di honjar.sql.

---

## 7. Cara Menjalankan Project

1. Buka terminal di folder project
2. Install dependency

```bash
npm install
```

3. Jalankan server development

```bash
npm run dev
```

4. Buka browser ke alamat berikut:

```text
http://localhost:3000
```

Jika ingin build production:

```bash
npm run build
npm run start
```

---

## 8. Cara Setup Database

1. Pastikan PostgreSQL aktif
2. Buat database baru, misalnya honjar
3. Import file skema SQL:

```bash
psql -U postgres -d honjar -f honjar.sql
```

Jika menggunakan GUI seperti pgAdmin, import file honjar.sql ke database tersebut.

File schema mencakup tabel utama seperti:

- mahasiswa
- users
- dosen
- mata_kuliah
- krs
- pertemuan
- kehadiran_mahasiswa

---

## 9. Panduan Login dan Penggunaan Aplikasi

### Login
Pada halaman login, user menginput username dan password.

Sistem akan mengecek kredensial pada database users.

Contoh akun default yang sering dipakai pada project ini:

- username: admin
- password: admin

Untuk PJ atau user lain, silakan lihat data pada tabel users dan sesuaikan sesuai kebutuhan.

### Menu Utama
Setelah login, user akan masuk ke dashboard dengan menu navigasi seperti:

- Mata Kuliah Saya
- Daftar Kelas
- Monitor
- Honor
- Dosen
- PJ
- Mahasiswa
- Master
- Cetak

---

## 10. Panduan Fitur Utama

### 10.1 Master Mata Kuliah
Bagian ini digunakan untuk:

- menambah mata kuliah baru
- mengubah data mata kuliah
- menghapus mata kuliah
- melihat jadwal, dosen, koordinator, dan PJ

Setiap mata kuliah memiliki data seperti:

- kode mata kuliah
- nama mata kuliah
- sks
- semester
- kelas
- hari dan jam
- ruangan
- koordinator
- dosen pengampu
- penanggung jawab kelas

### 10.2 Dosen
Menu dosen berfungsi untuk:

- menambah data dosen baru
- mengubah status dosen tetap / luar
- menghapus data dosen jika tidak digunakan
- mengelola daftar dosen yang dipakai di mata kuliah

### 10.3 PJ
Menu PJ digunakan untuk:

- mencatat penanggung jawab kelas
- membuat akun PJ
- mengatur username dan password
- hubungan dengan kelas yang dipengampu

### 10.4 Mahasiswa
Menu mahasiswa digunakan untuk:

- menambah mahasiswa baru
- mengubah data mahasiswa
- menghapus mahasiswa
- import data mahasiswa dari file Excel

Data mahasiswa yang masuk akan dipakai dalam daftar kelas dan KRS.

### 10.5 Kelas dan Roster
Bagian ini berfokus pada struktur peserta per mata kuliah.

Kepesertaan mahasiswa tidak disimpan sebagai atribut tetap pada mahasiswa, tetapi terkait langsung pada tabel KRS per mata kuliah.

Artinya:

- satu mahasiswa bisa masuk ke banyak mata kuliah
- satu mata kuliah bisa punya roster mahasiswa yang berbeda
- kelas diorganisir berdasarkan mata kuliah dan relasi KRS

### 10.6 Berita Acara / Pertemuan
Setiap mata kuliah memiliki sesi pertemuan.

Pada form berita acara, user dapat mengisi:

- pertemuan ke-
- tipe (kuliah, uts, uas)
- tanggal dan jam
- topik pembelajaran
- metode
- dosen pengajar
- status kehadiran dosen
- jumlah mahasiswa hadir

### 10.7 Presensi Mahasiswa
Presensi mahasiswa diisi oleh PJ kelas berdasarkan pertemuan yang sudah dibuat.

Data yang disimpan meliputi:

- nama mahasiswa
- status hadir / sakit / izin / tanpa keterangan
- bukti upload file jika diperlukan

### 10.8 Honor Mengajar
Menu honor digunakan untuk menghitung dan menyiapkan laporan pembayaran untuk kegiatan mengajar.

Sistem biasanya mengolah data berdasarkan:

- jadwal pertemuan
- dosen pengampu
- jumlah pertemuan
- jenis kegiatan kelas
- struktur honor yang berlaku di program studi

### 10.9 Cetak Laporan
Menu cetak memungkinkan pengguna menyiapkan output laporan dan dokumen yang dibutuhkan untuk administrasi akademik.

---

## 11. Alur Kerja Umum Aplikasi

Berikut alur kerja yang biasanya dipakai:

1. Admin menambahkan dosen dan PJ
2. Admin menambahkan mata kuliah dan menentukan jadwal
3. Admin menambahkan mahasiswa atau melakukan import data mahasiswa
4. Admin atau PJ mengatur roster mahasiswa ke mata kuliah
5. PJ kelas mencatat berita acara dan presensi
6. Admin memantau data dan menghitung honor
7. Laporan siap dicetak atau dipresentasikan

---

## 12. API dan Endpoint Penting

Project ini menyediakan API untuk kebutuhan CRUD dan integrasi, antara lain:

- /api/auth/login
- /api/mahasiswa
- /api/lecturers
- /api/pj
- /api/courses
- /api/courses/roster
- /api/sessions/save
- /api/uploads/bukti
- /api/honor/download

Semua endpoint ini biasanya dipakai oleh frontend melalui AppContext dan komponen UI.

---

## 13. Troubleshooting

### Masalah 1: Login gagal
Cek:

- apakah username benar
- apakah password sesuai
- apakah data users di database sudah dibuat
- apakah kolom password_hash atau hash autentikasi sudah sesuai format

### Masalah 2: Data mahasiswa tidak muncul
Cek:

- apakah table mahasiswa sudah dibuat
- apakah file SQL sudah diimport
- apakah API /api/mahasiswa berfungsi

### Masalah 3: Error autentikasi PostgreSQL
Jika muncul error seperti:

- password authentication failed for user "postgres"
- authentication failed

maka kemungkinan:

- password PostgreSQL salah
- user postgres tidak aktif
- env variable database tidak sesuai
- database lokal belum dibuat

Perbaiki konfigurasi DB di file environment atau file koneksi database.

### Masalah 4: JSON parse error di browser
Ini biasanya terjadi ketika server mengembalikan response bukan JSON yang valid, misalnya error handler merespons dengan teks kosong atau payload gagal. Pastikan API route mengembalikan JSON dengan format yang konsisten.

---

## 14. Tips Penggunaan

- Selalu import schema database sebelum menjalankan fitur yang membutuhkan data master
- Backup database sebelum melakukan perubahan data besar
- Gunakan akun admin untuk pengelolaan data inti, sedangkan PJ digunakan untuk pengelolaan kelas yang ditugaskan
- Periksa file upload bukti presensi agar format dan ukuran file sesuai kebutuhan
- Jika ada perubahan pada skema data, sesuaikan juga sumber data di API dan context aplikasi

---

## 15. Penutup

Project Honjar adalah sistem administrasi akademik yang dirancang untuk mempermudah pengelolaan kelas, mahasiswa, dosen, PJ, presensi, dan honor mengajar. Dengan dokumentasi ini, diharapkan user maupun pengembang dapat memahami fungsi utama aplikasi, alur kerja, dan teknik pemeliharaan sistem secara lebih mudah.

Untuk pengembangan lanjutan, pastikan setiap perubahan pada fitur diikuti juga oleh update pada dokumentasi, skema database, dan validasi endpoint API.

---

## 16. Quick Start Ringkas

```bash
npm install
npm run dev
```

Buka:

```text
http://localhost:3000
```

Pastikan PostgreSQL sudah aktif dan database honjar siap digunakan.
