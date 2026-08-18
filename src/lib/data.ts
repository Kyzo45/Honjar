import type { MataKuliah, Row } from "./types";

/* =========================================================
   DATA CONTOH — diambil dari dokumen asli program studi
   ========================================================= */

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
      // Seed a few absents for testing the absent system
      const absents = i === 1 
        ? [{ nim: "4211005", status: "sakit" as const, fileName: "surat_dokter.pdf" }]
        : i === 3 
        ? [{ nim: "4211010", status: "izin" as const, fileName: "surat_tugas.pdf" }]
        : [];

      rows.push({
        ke: i,
        tipe: "kuliah",
        tgl: TGL[idx] || "2026-05-16",
        jam: JAM[idx] || ["14:40", "16:20"],
        hadir: (HADIR[idx] || 44) - absents.length,
        topik,
        metode: idx > 6 ? "Praktikum" : "Teori",
        dosen: koor,
        kehadiran: "hadir",
        absents,
      });
    } else {
      rows.push({ ke: i, tipe: "kuliah", absents: [] });
    }
  }
  return rows;
}

interface MataKuliahSeed {
  id: number;
  kode: string;
  nama: string;
  kelas: string;
  sks: string;
  koor: string;
  dosen: string[];
  mhs: number;
  pj: string;
  isi: number;
  tipe: "Teori" | "Praktikum";
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
}

const SEED: MataKuliahSeed[] = [
  {
    id: 1, kode: "TLM2104", nama: "Hematologi Rutin dan Lengkap", kelas: "1C", sks: "2 (1T/1P)",
    koor: "Dr. Arina Novilla, M.Kes.", dosen: ["M. Ratna Ningrum, M.Si.", "Taufik Gunawan, S.Tr.Kes."],
    mhs: 48, pj: "Rifqi Aulia", isi: 9, tipe: "Teori", semester: 2,
    hari: "Senin", jamMulai: "07:00", jamSelesai: "08:40", ruangan: "R.301"
  },
  {
    id: 2, kode: "TLM2108", nama: "Flebotomi dan Pengelolaan Spesimen", kelas: "1C", sks: "3 (1T/2P)",
    koor: "Dr. Arina Novilla, M.Kes.", dosen: ["Bayu Dwi Rianto, M.Biomed."],
    mhs: 47, pj: "Rifqi Aulia", isi: 10, tipe: "Praktikum", semester: 2,
    hari: "Selasa", jamMulai: "13:00", jamSelesai: "15:30", ruangan: "Lab. Hematologi"
  },
  {
    id: 3, kode: "TLM2112", nama: "Urinalisis dan Cairan Tubuh", kelas: "1C", sks: "2 (1T/1P)",
    koor: "Bayu Dwi Rianto, M.Biomed.", dosen: ["Dr. Erick Khristian, M.Si."],
    mhs: 48, pj: "Rifqi Aulia", isi: 6, tipe: "Teori", semester: 2,
    hari: "Kamis", jamMulai: "09:40", jamSelesai: "11:20", ruangan: "R.302"
  },
  {
    id: 4, kode: "TLM2116", nama: "Komunikasi dan Promosi Kesehatan", kelas: "1C", sks: "2 (2T)",
    koor: "Bayu Dwi Rianto, M.Biomed.", dosen: ["Anggi Sandika, S.Tr.Kes., MM."],
    mhs: 48, pj: "Rifqi Aulia", isi: 4, tipe: "Teori", semester: 2,
    hari: "Sabtu", jamMulai: "08:00", jamSelesai: "09:40", ruangan: "R.204"
  },
];

export function buildInitialCourses(): MataKuliah[] {
  return SEED.map((m) => ({
    id: m.id, kode: m.kode, nama: m.nama, kelas: m.kelas, sks: m.sks,
    koor: m.koor, dosen: m.dosen, mhs: m.mhs, roster: [], pj: m.pj, pjId: null,
    rows: buildRows(m.koor, m.isi),
    tipe: m.tipe,
    semester: m.semester,
    hari: m.hari,
    jamMulai: m.jamMulai,
    jamSelesai: m.jamSelesai,
    ruangan: m.ruangan,
  }));
}
