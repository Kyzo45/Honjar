import type { Role, ViewId } from "./types";

export interface RoleInfo {
  name: string;
  go: ViewId;
}

export const ROLE: Record<Role, RoleInfo> = {
  pj: { name: "Rifqi Aulia · Penanggung Jawab", go: "mk" },
  admin: { name: "Sri Wahyuni · Admin prodi", go: "honor" },
};

export const TITLE: Record<ViewId, [string, string]> = {
  mk: ["Mata kuliah saya", "Empat kelas yang Anda pegang semester ini."],
  ledger: ["Berita acara kuliah", "Isi tiap pertemuan setelah kelas selesai. Batas input tujuh hari."],
  monitor: ["Kelengkapan berita acara", "Pantau kelas yang tertinggal sebelum akhir semester."],
  honor: ["Rekap honor mengajar", "Turunan langsung dari berita acara."],
  master: ["Master mata kuliah", "Mata kuliah, kelas, dan penugasan dosen serta Penanggung Jawab."],
  cetak: ["Cetak berita acara", "Pratinjau keluaran PDF sebelum diunduh."],
};
