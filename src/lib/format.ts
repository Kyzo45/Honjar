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

// Batas maksimal mundur (dalam hari) saat PJ mengisi tanggal pertemuan.
export const BATAS_INPUT_HARI = 30;

// Selisih hari (b - a) dari dua tanggal berformat YYYY-MM-DD, dihitung di UTC
// supaya tidak terpengaruh zona waktu lokal browser/server.
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86400000);
}

// Konversi nomor HP Indonesia ke format internasional (mis. 08123 -> 628123)
export function formatWANumber(noHp: string): string {
  const digits = (noHp || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits ? "62" + digits : "";
}

// Buat URL wa.me / api.whatsapp.com dengan nomor hp dan pesan ter-encode
export function formatWAUrl(noHp: string, message: string): string {
  const phone = formatWANumber(noHp);
  const text = encodeURIComponent(message);
  return phone
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

