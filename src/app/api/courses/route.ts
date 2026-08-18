import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { MataKuliah, Row, AbsentRecord } from "@/lib/types";
import { buildInitialCourses } from "@/lib/data";

function formatDate(date: any): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;

  // Jika input aslinya adalah string bertipe YYYY-MM-DD
  if (typeof date === "string" && date.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateJadwal(jamMulai: string, jamSelesai: string): string | null {
  if (!jamMulai || !jamSelesai) return "Jam mulai dan jam selesai wajib diisi";
  if (jamSelesai <= jamMulai) return "Jam selesai harus setelah jam mulai";
  return null;
}

// Terima pjId baik sebagai number maupun string angka (mis. "5") — jangan diam-diam
// menganggap "tidak ada PJ" hanya karena tipe datanya bukan number murni.
function resolvePjId(pjId: unknown): number | null {
  if (pjId === null || pjId === undefined || pjId === "") return null;
  const n = Number(pjId);
  return Number.isFinite(n) ? n : null;
}

// Cari dosen berdasarkan nama persis, atau buat baru dengan NID otomatis jika belum ada.
// Dipakai sebagai fallback saja — normalnya dosen sudah dipilih dari daftar dosen yang ada.
async function resolveDosenId(client: { query: (q: string, p?: any[]) => Promise<any> }, nama: string): Promise<number> {
  const { rows: existing } = await client.query("SELECT id FROM dosen WHERE nama = $1", [nama]);
  if (existing[0]) return existing[0].id;

  const { rows: seq } = await client.query("SELECT nextval(pg_get_serial_sequence('dosen', 'id')) AS id");
  const newId = Number(seq[0].id);
  const nid = "DSN" + String(newId).padStart(4, "0");
  const { rows: inserted } = await client.query(
    "INSERT INTO dosen (id, nid, nama) VALUES ($1, $2, $3) RETURNING id",
    [newId, nid, nama]
  );
  return inserted[0].id;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nim = searchParams.get("nim");
    const pjIdParam = searchParams.get("pjId");

    // 1. Ambil mata kuliah (filter by nim atau pjId jika ada)
    let coursesList: any[] = [];
    if (nim) {
      const { rows } = await pool.query(
        "SELECT mk.* FROM mata_kuliah mk JOIN krs k ON mk.id = k.mata_kuliah_id WHERE k.mahasiswa_nim = $1",
        [nim]
      );
      coursesList = rows;
    } else if (pjIdParam) {
      const { rows } = await pool.query("SELECT * FROM mata_kuliah WHERE pj_id = $1", [Number(pjIdParam)]);
      coursesList = rows;
    } else {
      const { rows } = await pool.query("SELECT * FROM mata_kuliah");
      coursesList = rows;
    }

    const fullCourses: MataKuliah[] = [];

    for (const c of coursesList) {
      // 2. Ambil nama dosen pengampu
      const { rows: dosenRows } = await pool.query(
        "SELECT d.nama FROM dosen d JOIN dosen_mata_kuliah dmk ON d.id = dmk.dosen_id WHERE dmk.mata_kuliah_id = $1",
        [c.id]
      );
      const dosen = dosenRows.map((r: any) => r.nama);

      // 3. Ambil nama PJ
      const { rows: pjRows } = await pool.query("SELECT nama FROM users WHERE id = $1", [c.pj_id]);
      const pj = pjRows[0]?.nama || "—";
      const pjId: number | null = c.pj_id ?? null;

      // 4. Ambil roster peserta (lewat KRS) — satu mahasiswa bisa muncul di roster
      // banyak mata kuliah, jadi ini query langsung per mata kuliah, bukan lewat
      // pencocokan field kelas manapun.
      const { rows: rosterRows } = await pool.query(
        `SELECT m.nim, m.nama, m.angkatan FROM mahasiswa m
         JOIN krs k ON k.mahasiswa_nim = m.nim
         WHERE k.mata_kuliah_id = $1 ORDER BY m.nama ASC`,
        [c.id]
      );
      const roster = rosterRows.map((r: any) => ({ nim: r.nim, nama: r.nama, angkatan: r.angkatan || "" }));
      const mhs = roster.length;

      // 5. Ambil daftar pertemuan (rows)
      const { rows: pList } = await pool.query(
        "SELECT * FROM pertemuan WHERE mata_kuliah_id = $1 ORDER BY ke",
        [c.id]
      );

      const rows: Row[] = [];
      for (const p of pList) {
        if (p.tipe === "uts" || p.tipe === "uas") {
          rows.push({
            ke: p.ke,
            tipe: p.tipe,
          });
        } else {
          // Ambil absensi mahasiswa jika sesi diisi
          let absents: AbsentRecord[] = [];
          if (p.topik) {
            const { rows: absentRows } = await pool.query(
              'SELECT mahasiswa_nim as nim, status, file_bukti as "fileUrl", file_nama_asli as "fileName" FROM kehadiran_mahasiswa WHERE pertemuan_id = $1 AND status != \'hadir\'',
              [p.id]
            );
            absents = absentRows.map((r: any) => ({
              nim: r.nim,
              status: r.status,
              fileName: r.fileName || undefined,
              fileUrl: r.fileUrl || undefined,
            }));
          }

          rows.push({
            ke: p.ke,
            tipe: "kuliah",
            tgl: formatDate(p.tanggal),
            jam: p.jam_mulai && p.jam_selesai
              ? [p.jam_mulai.slice(0, 5), p.jam_selesai.slice(0, 5)]
              : undefined,
            hadir: p.topik ? mhs - absents.length : undefined,
            topik: p.topik || undefined,
            metode: p.metode || undefined,
            dosen: p.dosen_pengajar || undefined,
            kehadiran: p.kehadiran_dosen || undefined,
            absents,
            isAbsenAktif: !!p.kode_absen_aktif,
          });
        }
      }

      fullCourses.push({
        id: c.id,
        kode: c.kode,
        nama: c.nama,
        kelas: c.kelas,
        sks: c.sks,
        koor: c.koordinator,
        dosen,
        mhs,
        roster,
        pj,
        pjId,
        rows,
        tipe: c.tipe as "Teori" | "Praktikum",
        semester: c.semester,
        hari: c.hari,
        jamMulai: c.jam_mulai ? c.jam_mulai.slice(0, 5) : "—",
        jamSelesai: c.jam_selesai ? c.jam_selesai.slice(0, 5) : "—",
        ruangan: c.ruangan,
      });
    }

    return NextResponse.json(fullCourses);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan data mata kuliah mock:", error.message);
    return NextResponse.json(buildInitialCourses());
  }
}

// Mahasiswa awal yang diinput manual/diimpor lewat form mata kuliah saat course-nya
// baru dibuat. Ditulis ke tabel mahasiswa (kalau NIM belum ada) lalu langsung
// didaftarkan ke KRS mata kuliah ini — tidak menyentuh mata kuliah lain manapun.
async function insertNewRoster(
  client: { query: (q: string, p?: any[]) => Promise<any> },
  newRoster: { nim: string; nama: string; angkatan: string }[] | undefined,
  courseId: number
) {
  if (!Array.isArray(newRoster)) return;
  for (const m of newRoster) {
    const nim = (m.nim || "").toString().trim();
    const nama = (m.nama || "").toString().trim();
    const angkatan = (m.angkatan || "").toString().trim();
    if (!nim || !nama) continue;
    await client.query(
      `INSERT INTO mahasiswa (nim, nama, angkatan) VALUES ($1, $2, $3)
       ON CONFLICT (nim) DO UPDATE SET nama = EXCLUDED.nama, angkatan = EXCLUDED.angkatan`,
      [nim, nama, angkatan || null]
    );
    await client.query(
      "INSERT INTO krs (mahasiswa_nim, mata_kuliah_id) VALUES ($1, $2) ON CONFLICT (mahasiswa_nim, mata_kuliah_id) DO NOTHING",
      [nim, courseId]
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { kode, nama, kelas, sks, koor, dosen, pjId, tipe, semester, hari, jamMulai, jamSelesai, ruangan, newRoster } = body;
  const dosenNames: string[] = Array.isArray(dosen)
    ? dosen.map((s: string) => s.trim()).filter(Boolean)
    : [];

  const jadwalError = validateJadwal(jamMulai, jamSelesai);
  if (jadwalError) {
    return NextResponse.json({ error: jadwalError }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (connErr: any) {
    console.warn("PostgreSQL offline. Menambahkan ke data mock secara lokal:", connErr.message);
    return NextResponse.json({ success: true, id: Date.now() });
  }

  try {
    await client.query("BEGIN");

    // 1. PJ dipilih langsung dari daftar Penanggung Jawab (pjId), boleh kosong (belum ditentukan)
    const pj_id: number | null = resolvePjId(pjId);

    // 2. Simpan mata kuliah
    const { rows: insResult } = await client.query(
      `INSERT INTO mata_kuliah
      (kode, nama, sks, kelas, semester, tipe, hari, jam_mulai, jam_selesai, ruangan, koordinator, pj_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [kode, nama, sks, kelas, Number(semester), tipe, hari, jamMulai, jamSelesai, ruangan, koor, pj_id]
    );
    const newCourseId = insResult[0].id;

    // 3. Simpan dosen pengampu (many to many)
    for (const dName of dosenNames) {
      const dosenId = await resolveDosenId(client, dName);
      await client.query("INSERT INTO dosen_mata_kuliah (mata_kuliah_id, dosen_id) VALUES ($1, $2)", [
        newCourseId,
        dosenId,
      ]);
    }

    // 4. Simpan roster awal (input manual/impor Excel dari form ini) langsung ke KRS
    // mata kuliah yang baru dibuat ini
    await insertNewRoster(client, newRoster, newCourseId);

    // 5. Buat 16 pertemuan kosong
    for (let i = 1; i <= 16; i++) {
      const pTipe = i === 8 ? "uts" : i === 16 ? "uas" : "kuliah";
      await client.query("INSERT INTO pertemuan (mata_kuliah_id, ke, tipe) VALUES ($1, $2, $3)", [
        newCourseId,
        i,
        pTipe,
      ]);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, id: newCourseId });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menambahkan mata kuliah:", error);
    return NextResponse.json({ error: "Gagal menyimpan mata kuliah: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const {
    id,
    kode,
    nama,
    kelas,
    sks,
    koor,
    dosen,
    pjId,
    tipe,
    semester,
    hari,
    jamMulai,
    jamSelesai,
    ruangan,
  } = body;

  if (!id) {
    return NextResponse.json({ error: "id wajib disertakan untuk mengubah mata kuliah" }, { status: 400 });
  }

  const jadwalError = validateJadwal(jamMulai, jamSelesai);
  if (jadwalError) {
    return NextResponse.json({ error: jadwalError }, { status: 400 });
  }

  const dosenNames: string[] = Array.isArray(dosen)
    ? dosen.map((s: string) => s.trim()).filter(Boolean)
    : [];

  let client;
  try {
    client = await pool.connect();
  } catch (connErr: any) {
    console.warn("PostgreSQL offline. Mengubah data mock secara lokal:", connErr.message);
    return NextResponse.json({ success: true });
  }

  try {
    await client.query("BEGIN");

    // 1. PJ dipilih langsung dari daftar Penanggung Jawab (pjId), boleh kosong (belum ditentukan)
    const pj_id: number | null = resolvePjId(pjId);

    // 2. Update mata kuliah
    await client.query(
      `UPDATE mata_kuliah SET
        kode = $1,
        nama = $2,
        sks = $3,
        kelas = $4,
        semester = $5,
        tipe = $6,
        hari = $7,
        jam_mulai = $8,
        jam_selesai = $9,
        ruangan = $10,
        koordinator = $11,
        pj_id = $12
      WHERE id = $13`,
      [kode, nama, sks, kelas, Number(semester), tipe, hari, jamMulai, jamSelesai, ruangan, koor, pj_id, id]
    );

    // 3. Update dosen pengampu (many to many)
    await client.query("DELETE FROM dosen_mata_kuliah WHERE mata_kuliah_id = $1", [id]);

    for (const dName of dosenNames) {
      const dosenId = await resolveDosenId(client, dName);
      await client.query("INSERT INTO dosen_mata_kuliah (mata_kuliah_id, dosen_id) VALUES ($1, $2)", [
        id,
        dosenId,
      ]);
    }

    // Catatan: roster peserta (KRS) sengaja tidak disentuh di sini. Roster dikelola
    // langsung lewat /api/courses/roster (menu Daftar Kelas), tidak lagi disusun
    // ulang otomatis tiap mata kuliah diedit.

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal mengubah mata kuliah:", error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id wajib disertakan untuk menghapus mata kuliah" }, { status: 400 });
  }

  try {
    // pertemuan, krs, dosen_mata_kuliah, dan kehadiran_mahasiswa ikut terhapus otomatis (ON DELETE CASCADE)
    await pool.query("DELETE FROM mata_kuliah WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menghapus mata kuliah:", error);
    return NextResponse.json({ error: "Gagal menghapus mata kuliah: " + error.message }, { status: 500 });
  }
}
