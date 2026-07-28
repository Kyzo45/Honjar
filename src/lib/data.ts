import type { Mahasiswa, MataKuliah, PengajuanIzin, Row, StatusMhs } from "./types";

/* =========================================================
   DATA CONTOH — diambil dari dokumen asli program studi
   ========================================================= */

export const MHS: Mahasiswa[] = [
  { nim: "4211001", nama: "Adinda Pramesti" },
  { nim: "4211002", nama: "Bagas Nurwahid" },
  { nim: "4211003", nama: "Citra Halimah" },
  { nim: "4211004", nama: "Dwi Anggara" },
  { nim: "4211005", nama: "Elsa Nurhaliza" },
  { nim: "4211006", nama: "Fajar Sidiq" },
  { nim: "4211007", nama: "Gita Maharani" },
  { nim: "4211008", nama: "Hilman Rizky" },
  { nim: "4211009", nama: "Intan Permata" },
  { nim: "4211010", nama: "Joko Prasetyo" },
  { nim: "4211011", nama: "Karina Ayu" },
  { nim: "4211012", nama: "Lukman Hakim" },
];

export const IZIN_DISETUJUI: Record<string, StatusMhs> = {
  "4211005": "sakit",
  "4211010": "izin",
};

const TOPIK: (string | null)[] = [
  "Pendahuluan", "Komponen dan fungsi darah", "Hematopoesis", "Eritropoesis",
  "Granulopoesis", "Limfopoesis", "Megakariopoesis",
  null, /* UTS */
  "Hematologi rutin, kadar Hb", "Laju Endap Darah",
];

const JAM: ([string, string] | null)[] = [
  ["07:00", "07:50"], ["13:00", "13:50"], ["07:00", "07:50"], ["19:30", "20:20"],
  ["09:40", "10:30"], ["16:15", "17:05"], ["07:00", "07:50"], null,
  ["14:40", "16:20"], ["14:40", "16:20"],
];
const HADIR: (number | null)[] = [46, 48, 42, 47, 48, 46, 43, null, 46, 44];
const TGL: (string | null)[] = [
  "2026-02-26", "2026-03-03", "2026-03-12", "2026-04-01", "2026-04-09", "2026-04-11",
  "2026-04-18", null, "2026-05-16", "2026-05-16",
];

/** bangun 16 baris untuk tiap MK: 1-7 kuliah, 8 UTS, 9-15 kuliah, 16 UAS */
export function buildRows(koor: string, isi: number): Row[] {
  const rows: Row[] = [];
  for (let i = 1; i <= 16; i++) {
    if (i === 8) { rows.push({ ke: i, tipe: "uts" }); continue; }
    if (i === 16) { rows.push({ ke: i, tipe: "uas" }); continue; }
    const idx = i < 8 ? i - 1 : i - 2;
    const topik = TOPIK[idx];
    const terisi = idx < isi && topik;
    if (terisi) {
      rows.push({
        ke: i,
        tipe: "kuliah",
        tgl: TGL[idx] || "2026-05-16",
        jam: JAM[idx] || ["14:40", "16:20"],
        hadir: HADIR[idx] || 44,
        topik,
        metode: idx > 6 ? "Praktikum" : "Teori",
        dosen: koor,
        kehadiran: "hadir",
      });
    } else {
      rows.push({ ke: i, tipe: "kuliah" });
    }
  }
  return rows;
}

interface MataKuliahSeed {
  id: number; kode: string; nama: string; kelas: string; sks: string;
  koor: string; dosen: string[]; mhs: number; pj: string; isi: number;
}

const SEED: MataKuliahSeed[] = [
  { id: 1, kode: "TLM2104", nama: "Hematologi Rutin dan Lengkap", kelas: "1C", sks: "2 (1T/1P)",
    koor: "Dr. Arina Novilla, M.Kes.", dosen: ["M. Ratna Ningrum, M.Si.", "Taufik Gunawan, S.Tr.Kes."],
    mhs: 48, pj: "Rifqi Aulia", isi: 9 },
  { id: 2, kode: "TLM2108", nama: "Flebotomi dan Pengelolaan Spesimen", kelas: "1C", sks: "3 (1T/2P)",
    koor: "Dr. Arina Novilla, M.Kes.", dosen: ["Bayu Dwi Rianto, M.Biomed."],
    mhs: 47, pj: "Rifqi Aulia", isi: 12 },
  { id: 3, kode: "TLM2112", nama: "Urinalisis dan Cairan Tubuh", kelas: "1C", sks: "2 (1T/1P)",
    koor: "Bayu Dwi Rianto, M.Biomed.", dosen: ["Dr. Erick Khristian, M.Si."],
    mhs: 48, pj: "Rifqi Aulia", isi: 6 },
  { id: 4, kode: "TLM2116", nama: "Komunikasi dan Promosi Kesehatan", kelas: "1C", sks: "2 (2T)",
    koor: "Bayu Dwi Rianto, M.Biomed.", dosen: ["Anggi Sandika, S.Tr.Kes., MM."],
    mhs: 48, pj: "Rifqi Aulia", isi: 4 },
];

export function buildInitialCourses(): MataKuliah[] {
  return SEED.map((m) => ({
    id: m.id, kode: m.kode, nama: m.nama, kelas: m.kelas, sks: m.sks,
    koor: m.koor, dosen: m.dosen, mhs: m.mhs, pj: m.pj,
    rows: buildRows(m.koor, m.isi),
  }));
}

export const IZIN: PengajuanIzin[] = [
  { n: "Elsa Nurhaliza", nim: "4211005", tgl: "16 Mei 2026", j: "Sakit",
    ket: "Demam berdarah, rawat inap 3 hari", f: "surat-dokter.pdf", k: 4, s: "diajukan" },
  { n: "Joko Prasetyo", nim: "4211010", tgl: "16 Mei 2026", j: "Izin",
    ket: "Lomba PIMNAS tingkat nasional", f: "surat-tugas.pdf", k: 4, s: "disetujui" },
  { n: "Bagas Nurwahid", nim: "4211002", tgl: "13 Mei 2026", j: "Sakit",
    ket: "Tifus", f: "—", k: 2, s: "diajukan" },
  { n: "Citra Halimah", nim: "4211003", tgl: "11 Mei 2026", j: "Izin",
    ket: "Menghadiri pemakaman keluarga", f: "surat-keluarga.jpg", k: 3, s: "ditolak" },
];
