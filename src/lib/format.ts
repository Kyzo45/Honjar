const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

export function fmtTgl(s: string): string {
  const d = new Date(s + "T00:00");
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
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

export function parseTimeToMinutes(t: unknown): number {
  if (!t || typeof t !== "string") return -1;
  const match = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export function minutesToTimeStr(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Tambah menit ke format waktu HH:mm, mengembalikan format HH:mm
export function addMinutes(timeStr: string, minutes: number): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins < 0) return timeStr;
  return minutesToTimeStr(mins + minutes);
}

/**
 * Auto-sequence jam sesi perkuliahan pada tanggal dan mata kuliah/kelas yang sama
 * untuk mengatasi human error penginputan jam bentrok oleh PJ:
 * 1. Menghapus klon duplikat identik murni (pertemuan dan topik yang sama persis).
 * 2. Mengurutkan sesi dan menggeser sesi kedua/berikutnya secara berurutan (auto-sequence)
 *    jika jam mulai bertabrakan atau identik dengan sesi sebelumnya.
 * 3. Menjamin Dosen Tetap & Luar dibayar 100% penuh untuk setiap pertemuan materi silabus.
 */
export function autoSequenceHonorRows<T extends Record<string, any>>(rows: T[]): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // 1. Filter out TRUE duplicates (identical clone entries: same dsn, tgl, mk, kls, ke, topik, and time)
  const seenClone = new Set<string>();
  const nonClones = rows.filter((r) => {
    const dsn = String(r.dsn || r.dosen || "").trim().toLowerCase();
    const tgl = String(r.tgl || "").trim();
    const mk = String(r.mk || "").trim().toLowerCase();
    const kls = String(r.kls || "").trim().toLowerCase();
    const keStr = r.ke !== undefined && r.ke !== null ? String(r.ke).trim() : "";
    const topikStr = r.topik ? String(r.topik).trim().toLowerCase() : "";
    const a = String(r.a || r.mulai || r.jam_mulai || "").trim();
    const b = String(r.b || r.selesai || r.jam_selesai || "").trim();

    const cloneKey = `${dsn}|${tgl}|${mk}|${kls}|${keStr}|${topikStr}|${a}|${b}`;
    if (seenClone.has(cloneKey)) return false;
    seenClone.add(cloneKey);
    return true;
  });

  // 2. Group by lecturer + date + course + class to detect and sequence overlaps
  const groupKey = (r: T) => {
    const dsn = String(r.dsn || r.dosen || "").trim().toLowerCase();
    const tgl = String(r.tgl || "").trim();
    const mk = String(r.mk || "").trim().toLowerCase();
    const kls = String(r.kls || "").trim().toLowerCase();
    return `${dsn}|${tgl}|${mk}|${kls}`;
  };

  const groups = new Map<string, T[]>();
  nonClones.forEach((r) => {
    const key = groupKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  });

  const result: T[] = [];

  groups.forEach((items) => {
    if (items.length <= 1) {
      const item = items[0];
      const origA = String(item.a || item.mulai || item.jam_mulai || "").trim();
      const origB = String(item.b || item.selesai || item.jam_selesai || "").trim();
      const startMin = parseTimeToMinutes(origA);
      const endMin = parseTimeToMinutes(origB);
      let duration = Number(item.mnt) || 0;
      if (duration <= 0 && startMin >= 0 && endMin >= 0) {
        duration = endMin - startMin;
      }
      if (duration <= 0) duration = 100;
      const cleanA = startMin >= 0 ? minutesToTimeStr(startMin) : origA;
      const cleanB = endMin > 0 ? minutesToTimeStr(endMin) : (startMin >= 0 ? minutesToTimeStr(startMin + duration) : origB);
      result.push({
        ...item,
        a: cleanA,
        b: cleanB,
        mulai: cleanA,
        selesai: cleanB,
        jam_mulai: cleanA,
        jam_selesai: cleanB,
        mnt: duration,
        jam: Number(item.jam) || jamAjar(duration),
      });
      return;
    }

    // Urutkan item dalam grup berdasarkan ke (jika ada) atau jam mulai awal
    items.sort((x, y) => {
      const keX = Number(x.ke);
      const keY = Number(y.ke);
      if (!Number.isNaN(keX) && !Number.isNaN(keY) && keX > 0 && keY > 0 && keX !== keY) {
        return keX - keY;
      }
      const aX = String(x.a || x.mulai || x.jam_mulai || "");
      const aY = String(y.a || y.mulai || y.jam_mulai || "");
      return aX.localeCompare(aY);
    });

    let currentEndMin = -1;

    items.forEach((item) => {
      const origA = String(item.a || item.mulai || item.jam_mulai || "").trim();
      const origB = String(item.b || item.selesai || item.jam_selesai || "").trim();
      const startMin = parseTimeToMinutes(origA);
      const endMin = parseTimeToMinutes(origB);

      let duration = Number(item.mnt) || 0;
      if (duration <= 0 && startMin >= 0 && endMin >= 0) {
        duration = endMin - startMin;
      }
      if (duration <= 0) duration = 100;

      // Terjadi bentrok jika sesi ini dimulai sebelum sesi sebelumnya selesai
      if (currentEndMin > 0 && startMin >= 0 && startMin < currentEndMin) {
        const newStartMin = currentEndMin;
        const newEndMin = newStartMin + duration;
        const newA = minutesToTimeStr(newStartMin);
        const newB = minutesToTimeStr(newEndMin);
        currentEndMin = newEndMin;

        result.push({
          ...item,
          a: newA,
          b: newB,
          mulai: newA,
          selesai: newB,
          jam_mulai: newA,
          jam_selesai: newB,
          mnt: duration,
          jam: Number(item.jam) || jamAjar(duration),
        });
      } else {
        const effectiveEnd = endMin > 0 ? endMin : (startMin >= 0 ? startMin + duration : -1);
        if (effectiveEnd > 0) {
          currentEndMin = Math.max(currentEndMin, effectiveEnd);
        }
        const cleanA = startMin >= 0 ? minutesToTimeStr(startMin) : origA;
        const cleanB = endMin > 0 ? minutesToTimeStr(endMin) : (startMin >= 0 ? minutesToTimeStr(startMin + duration) : origB);
        result.push({
          ...item,
          a: cleanA,
          b: cleanB,
          mulai: cleanA,
          selesai: cleanB,
          jam_mulai: cleanA,
          jam_selesai: cleanB,
          mnt: duration,
          jam: Number(item.jam) || jamAjar(duration),
        });
      }
    });
  });

  return result;
}

