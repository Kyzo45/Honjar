export type Role = "pj" | "admin";

export type ViewId =
  | "mk"
  | "ledger"
  | "izin"
  | "monitor"
  | "honor"
  | "master"
  | "cetak";

export type Metode = "Teori" | "Praktikum" | "Lapangan";

export type Kehadiran = "hadir" | "daring" | "diganti" | "batal";

export type StatusMhs = "sakit" | "izin" | "tanpa";

export interface KuliahRow {
  ke: number;
  tipe: "kuliah";
  tgl?: string;
  jam?: [string, string];
  hadir?: number;
  topik?: string;
  metode?: Metode;
  dosen?: string;
  kehadiran?: Kehadiran;
}

export interface UjianRow {
  ke: number;
  tipe: "uts" | "uas";
}

export type Row = KuliahRow | UjianRow;

export interface MataKuliah {
  id: number;
  kode: string;
  nama: string;
  kelas: string;
  sks: string;
  koor: string;
  dosen: string[];
  mhs: number;
  pj: string;
  rows: Row[];
}

export interface Mahasiswa {
  nim: string;
  nama: string;
}

export interface NewCourseInput {
  kode: string;
  nama: string;
  kelas: string;
  sks: string;
  koor: string;
  dosenText: string;
  mhs: number;
  pj: string;
}

export type StatusIzin = "diajukan" | "disetujui" | "ditolak";

export interface PengajuanIzin {
  n: string;
  nim: string;
  tgl: string;
  j: "Sakit" | "Izin";
  ket: string;
  f: string;
  k: number;
  s: StatusIzin;
}
