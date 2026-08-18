const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

export function fmtTgl(s: string): string {
  const d = new Date(s + "T00:00");
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function menit(a: string, b: string): number {
  const p = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  return p(b) - p(a);
}

export function jamAjar(mnt: number): number {
  return Math.floor(mnt / 50);
}

// Selisih hari (b - a) dari dua tanggal berformat YYYY-MM-DD, dihitung di UTC
// supaya tidak terpengaruh zona waktu lokal browser/server.
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86400000);
}
