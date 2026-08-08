export type Role = "pj" | "admin";

export type ViewId =
  | "mk"
  | "ledger"
  | "monitor"
  | "honor"
  | "master"
  | "cetak";

export interface UserSession {
  id: number;
  username: string;
  nama: string;
  role: Role;
  nim?: string;
  kelas?: string;
}

export type Metode = "Teori" | "Praktikum" | "Lapangan";

export type Kehadiran = "hadir" | "daring" | "diganti" | "batal";

export type StatusMhs = "sakit" | "izin" | "tanpa";

export interface AbsentRecord {
  nim: string;
  status: StatusMhs;
  fileName?: string;
}

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
  absents?: AbsentRecord[];
  isAbsenAktif?: boolean;
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
  tipe: "Teori" | "Praktikum";
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
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
  tipe: "Teori" | "Praktikum";
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
}
