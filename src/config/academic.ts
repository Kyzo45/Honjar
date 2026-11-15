/**
 * Konfigurasi Terpusat Akademik & Institusi (HONJAR UNJANI)
 * 
 * Semua pengaturan tahun ajaran, semester aktif, daftar semester, dan identitas
 * institusi (kop surat, pejabat prodi) dikelola di sini.
 * 
 * Saat pergantian semester atau tahun ajaran, Anda cukup mengubah nilai di file ini:
 * - tahunAjaran: e.g. "2026/2027" -> "2027/2028"
 * - semesterAktif: "ganjil" | "genap"
 */

export type SemesterType = "ganjil" | "genap";

export interface InstitutionalConfig {
  yayasan: string;
  universitas: string;
  fakultas: string;
  prodi: string;
  alamat: string;
  kota: string;
  logoYayasan: string;
  logoUnjani: string;
}

export interface OfficialSignatoryConfig {
  jabatan: string;
  nama: string;
  nid: string;
}

export interface AcademicConfig {
  tahunAjaran: string;
  semesterAktif: SemesterType;
  semesterList: {
    ganjil: number[];
    genap: number[];
    all: number[];
  };
  institusi: InstitutionalConfig;
  pejabat: OfficialSignatoryConfig;
}

export const ACADEMIC_CONFIG: AcademicConfig = {
  // Tahun ajaran yang sedang aktif berjalan
  tahunAjaran: "2026/2027",

  // Tipe semester yang sedang berjalan: "ganjil" atau "genap"
  semesterAktif: "ganjil",

  // Pemetaan nomor semester reguler (D4 = 8 semester)
  semesterList: {
    ganjil: [1, 3, 5, 7],
    genap: [2, 4, 6, 8],
    all: [1, 2, 3, 4, 5, 6, 7, 8],
  },

  // Identitas resmi institusi untuk Kop Surat, Dokumen PDF, dan Excel
  institusi: {
    yayasan: "YAYASAN KARTIKA EKA PAKSI",
    universitas: "UNIVERSITAS JENDERAL ACHMAD YANI (UNJANI)",
    fakultas: "FAKULTAS ILMU DAN TEKNOLOGI KESEHATAN (FITKes)",
    prodi: "PROGRAM STUDI TEKNOLOGI LABORATORIUM MEDIS (D4)",
    alamat: "Kampus: Jl. Terusan Jenderal Sudirman-Cimahi Tlp.(022) 6631622–6631623",
    kota: "Cimahi",
    logoYayasan: "/logo-yayasan.jpeg",
    logoUnjani: "/logo-unjani.png",
  },

  // Pejabat penandatangan laporan / berita acara
  pejabat: {
    jabatan: "Ka. Prodi TLM D4",
    nama: "Gina Khairinisa, M.Imun",
    nid: "4121 282 88",
  },
};

/**
 * Mengembalikan daftar nomor semester untuk semester yang sedang aktif berjalan.
 */
export function getActiveSemesterNumbers(): number[] {
  return ACADEMIC_CONFIG.semesterList[ACADEMIC_CONFIG.semesterAktif];
}

/**
 * Format label filter semester untuk Topbar dan dropdown pemilihan semester.
 * Contoh output: "Ganjil 2026/2027 · Semester 3" atau "Ganjil/Genap 2026/2027 · Semua semester"
 */
export function formatSemesterOptionLabel(semester: number | "all"): string {
  if (semester === "all") {
    return `Ganjil/Genap ${ACADEMIC_CONFIG.tahunAjaran} · Semua semester`;
  }
  const period = semester % 2 === 0 ? "Genap" : "Ganjil";
  return `${period} ${ACADEMIC_CONFIG.tahunAjaran} · Semester ${semester}`;
}

/**
 * Format judul semester lengkap, contoh: "Semester Ganjil TA. 2026/2027"
 */
export function getFullSemesterTitle(type: SemesterType = ACADEMIC_CONFIG.semesterAktif): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  return `Semester ${cap} TA. ${ACADEMIC_CONFIG.tahunAjaran}`;
}
