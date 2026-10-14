export type Role = "pj" | "admin";

export type ToastType = "success" | "error";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

export type ViewId =
  | "mk"
  | "ledger"
  | "monitor"
  | "honor"
  | "reports"
  | "master"
  | "dosen"
  | "pjlist"
  | "mahasiswa"
  | "kelas"
  | "cetak";

export interface UserSession {
  id: number;
  username: string;
  nama: string;
  role: Role;
  nim?: string;
  kelas?: string;
}

export type Metode = "Teori" | "Praktikum";
export type MataKuliahTipe = "Teori" | "Praktikum";

export type Kehadiran = "hadir" | "daring" | "diganti" | "batal";

export type StatusMhs = "sakit" | "izin" | "tanpa";

export interface AbsentRecord {
  nim: string;
  status: StatusMhs;
  fileName?: string; // nama asli berkas, untuk ditampilkan
  fileUrl?: string; // path servable ke berkas terunggah, untuk dibuka/dilihat
}

export function parseDosenList(value?: string | string[] | null, knownNames: string[] = []): string[] {
  const raw = Array.isArray(value) ? value : [value ?? ""];
  const names: string[] = [];

  if (knownNames.length > 0) {
    const candidates = knownNames.flatMap((name) => {
      const fullName = name.trim();
      const coreName = fullName.split(",", 1)[0].trim();
      return [fullName, coreName]
        .map((alias) => ({ name: fullName, alias: alias.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "") }))
        .filter(({ alias }) => alias.length > 0);
    });

    for (const entry of raw) {
      if (typeof entry !== "string" || !entry.trim()) continue;
      const normalized = entry.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "");
      let cursor = 0;

      while (cursor < normalized.length) {
        const matches = candidates
          .map((candidate) => ({ ...candidate, index: normalized.indexOf(candidate.alias, cursor) }))
          .filter((candidate) => candidate.index >= 0)
          .sort((left, right) => left.index - right.index || right.alias.length - left.alias.length);
        const match = matches[0];
        if (!match) break;
        names.push(match.name);
        cursor = match.index + match.alias.length;
      }

      if (cursor === 0) names.push(entry.trim());
    }

    return Array.from(new Set(names));
  }

  return Array.from(new Set(raw
    .flatMap((entry) => typeof entry === "string" ? entry.split(",") : [])
    .map((name) => name.trim())
    .filter(Boolean)));
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

export interface Mahasiswa {
  nim: string;
  nama: string;
  angkatan?: string;
}

export interface MataKuliah {
  id: number;
  kode: string;
  nama: string;
  kelas: string;
  sks: string;
  koor: string;
  dosen: string[];
  mhs: number;
  // Roster peserta mata kuliah ini (lewat KRS) — satu mahasiswa bisa muncul di
  // roster banyak mata kuliah sekaligus, jadi ini bukan turunan dari field kelas.
  roster: Mahasiswa[];
  pj: string;
  pjId: number | null;
  pjIds: number[];
  pjNames: string[];
  rows: Row[];
  tipe: MataKuliahTipe;
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
}

export interface NewMahasiswaInput {
  nim: string;
  nama: string;
  angkatan: string;
}

// Baris hasil parsing file Excel (belum tentu sudah tersimpan ke database).
export type ImportRowStatus = "baru" | "update" | "error";

export interface ImportMahasiswaRow {
  nim: string;
  nama: string;
  angkatan: string;
  status: ImportRowStatus;
  pesan?: string;
}

export type StatusDosen = "tetap" | "luar";

export interface Dosen {
  id: number;
  nid: string;
  nama: string;
  status: StatusDosen;
}

export interface NewDosenInput {
  nid: string;
  nama: string;
  status: StatusDosen;
}

export interface PJUser {
  id: number;
  nim: string;
  nama: string;
  angkatan: string;
  noHp: string;
  username: string;
}

export interface NewPJInput {
  nim: string;
  nama: string;
  angkatan: string;
  noHp: string;
  password?: string;
}

export interface NewCourseInput {
  kode: string;
  nama: string;
  kelas: string;
  sks: string;
  koor: string;
  dosen: string[];
  pjId: number | null;
  pjIds?: number[];
  tipe: MataKuliahTipe;
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
  // Mahasiswa awal yang diinput manual/diimpor lewat form ini saat mata kuliah
  // baru dibuat. Server menyimpannya ke tabel mahasiswa (jika NIM belum ada)
  // lalu mendaftarkannya ke KRS mata kuliah ini.
  newRoster?: { nim: string; nama: string; angkatan: string }[];
}

export interface ReminderTarget {
  pjId: number | null;
  pjNama: string;
  noHp: string;
  courses: {
    kode: string;
    nama: string;
    kelas: string;
    filledCount: number;
    unfilledCount: number;
  }[];
}

