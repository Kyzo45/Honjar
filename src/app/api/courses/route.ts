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
      const { rows } = await pool.query(
        `SELECT DISTINCT mk.*
         FROM mata_kuliah mk
         LEFT JOIN mata_kuliah_pj mpj ON mpj.mata_kuliah_id = mk.id
         WHERE mk.pj_id = $1 OR mpj.pj_id = $1
         ORDER BY mk.id ASC`,
        [Number(pjIdParam)]
      );
      coursesList = rows;
    } else {
      const { rows } = await pool.query("SELECT * FROM mata_kuliah");
      coursesList = rows;
    }

    if (coursesList.length === 0) return NextResponse.json([]);

    const courseIds = coursesList.map((course) => Number(course.id));
    const [{ rows: lecturerRows }, { rows: pjRows }, { rows: rosterRows }, { rows: meetingRows }] = await Promise.all([
      pool.query(
        `SELECT dmk.mata_kuliah_id, d.nama
         FROM dosen_mata_kuliah dmk
         JOIN dosen d ON d.id = dmk.dosen_id
         WHERE dmk.mata_kuliah_id = ANY($1::integer[])
         ORDER BY d.nama ASC`,
        [courseIds]
      ),
      pool.query(
        `SELECT mpj.mata_kuliah_id, u.id, u.nama
         FROM mata_kuliah_pj mpj
         JOIN users u ON u.id = mpj.pj_id
         WHERE mpj.mata_kuliah_id = ANY($1::integer[])
         ORDER BY u.nama ASC`,
        [courseIds]
      ),
      pool.query(
        `SELECT k.mata_kuliah_id, m.nim, m.nama, m.angkatan
         FROM krs k
         JOIN mahasiswa m ON m.nim = k.mahasiswa_nim
         WHERE k.mata_kuliah_id = ANY($1::integer[])
         ORDER BY m.nama ASC`,
        [courseIds]
      ),
      pool.query(
        "SELECT * FROM pertemuan WHERE mata_kuliah_id = ANY($1::integer[]) ORDER BY mata_kuliah_id, ke",
        [courseIds]
      ),
    ]);

    const legacyPjIds = [...new Set(coursesList.map((course) => Number(course.pj_id)).filter((id) => id > 0))];
    const legacyPjRows = legacyPjIds.length > 0
      ? (await pool.query("SELECT id, nama FROM users WHERE id = ANY($1::integer[])", [legacyPjIds])).rows
      : [];
    const legacyPjNames = new Map<number, string>(legacyPjRows.map((row) => [Number(row.id), row.nama]));

    const meetings = meetingRows;
    const meetingIds = meetings.map((meeting) => Number(meeting.id));
    const absentRows = meetingIds.length > 0
      ? (await pool.query(
          `SELECT pertemuan_id, mahasiswa_nim AS nim, status,
                  file_bukti AS "fileUrl", file_nama_asli AS "fileName"
           FROM kehadiran_mahasiswa
           WHERE pertemuan_id = ANY($1::integer[]) AND status != 'hadir'`,
          [meetingIds]
        )).rows
      : [];

    const lecturersByCourse = new Map<number, string[]>();
    lecturerRows.forEach((row) => {
      const list = lecturersByCourse.get(Number(row.mata_kuliah_id)) ?? [];
      list.push(row.nama);
      lecturersByCourse.set(Number(row.mata_kuliah_id), list);
    });

    const pjByCourse = new Map<number, { id: number; nama: string }[]>();
    pjRows.forEach((row) => {
      const list = pjByCourse.get(Number(row.mata_kuliah_id)) ?? [];
      list.push({ id: Number(row.id), nama: row.nama });
      pjByCourse.set(Number(row.mata_kuliah_id), list);
    });

    const rosterByCourse = new Map<number, { nim: string; nama: string; angkatan: string }[]>();
    rosterRows.forEach((row) => {
      const list = rosterByCourse.get(Number(row.mata_kuliah_id)) ?? [];
      list.push({ nim: row.nim, nama: row.nama, angkatan: row.angkatan || "" });
      rosterByCourse.set(Number(row.mata_kuliah_id), list);
    });

    const absentsByMeeting = new Map<number, AbsentRecord[]>();
    absentRows.forEach((row) => {
      const meetingId = Number(row.pertemuan_id);
      const list = absentsByMeeting.get(meetingId) ?? [];
      list.push({
        nim: row.nim,
        status: row.status,
        fileName: row.fileName || undefined,
        fileUrl: row.fileUrl || undefined,
      });
      absentsByMeeting.set(meetingId, list);
    });

    const meetingsByCourse = new Map<number, typeof meetings>();
    meetings.forEach((meeting) => {
      const list = meetingsByCourse.get(Number(meeting.mata_kuliah_id)) ?? [];
      list.push(meeting);
      meetingsByCourse.set(Number(meeting.mata_kuliah_id), list);
    });

    const fullCourses: MataKuliah[] = coursesList.map((course) => {
      const courseId = Number(course.id);
      const roster = rosterByCourse.get(courseId) ?? [];
      const assignedPjs = pjByCourse.get(courseId) ?? [];
      const pjIds = assignedPjs.length > 0
        ? assignedPjs.map((pj) => pj.id)
        : (course.pj_id ? [Number(course.pj_id)] : []);
      const pjNames = assignedPjs.length > 0
        ? assignedPjs.map((pj) => pj.nama)
        : (course.pj_id
          ? [legacyPjNames.get(Number(course.pj_id)) || "—"]
          : []);
      const rows: Row[] = (meetingsByCourse.get(courseId) ?? []).map((meeting) => {
        if (meeting.tipe === "uts" || meeting.tipe === "uas") {
          return { ke: meeting.ke, tipe: meeting.tipe };
        }

        const absents = meeting.topik ? absentsByMeeting.get(Number(meeting.id)) ?? [] : [];
        return {
          ke: meeting.ke,
          tipe: "kuliah",
          tgl: formatDate(meeting.tanggal),
          jam: meeting.jam_mulai && meeting.jam_selesai
            ? [meeting.jam_mulai.slice(0, 5), meeting.jam_selesai.slice(0, 5)]
            : undefined,
          hadir: meeting.topik ? roster.length - absents.length : undefined,
          topik: meeting.topik || undefined,
          metode: meeting.metode || undefined,
          dosen: meeting.dosen_pengajar || undefined,
          kehadiran: meeting.kehadiran_dosen || undefined,
          absents,
          isAbsenAktif: !!meeting.kode_absen_aktif,
        };
      });
      return {
        id: course.id,
        kode: course.kode,
        nama: course.nama,
        kelas: course.kelas,
        sks: course.sks,
        koor: course.koordinator,
        dosen: lecturersByCourse.get(courseId) ?? [],
        mhs: roster.length,
        roster,
        pj: pjNames.join(", ") || "—",
        pjId: pjIds[0] ?? null,
        pjIds,
        pjNames,
        rows,
        tipe: course.tipe as "Teori" | "Praktikum",
        semester: course.semester,
        hari: course.hari,
        jamMulai: course.jam_mulai ? course.jam_mulai.slice(0, 5) : "—",
        jamSelesai: course.jam_selesai ? course.jam_selesai.slice(0, 5) : "—",
        ruangan: course.ruangan,
      };
    });

    return NextResponse.json(fullCourses);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan data mata kuliah mock:", error.message);
    const fallbackCourses = buildInitialCourses();
    const { searchParams } = new URL(req.url);
    const nim = searchParams.get("nim");
    const pjIdParam = searchParams.get("pjId");

    if (nim) {
      return NextResponse.json(fallbackCourses.filter((course) => course.roster.some((student) => student.nim === nim)));
    }
    if (pjIdParam) {
      const pjId = Number(pjIdParam);
      return NextResponse.json(fallbackCourses.filter((course) => course.pjId === pjId || course.pjIds.includes(pjId)));
    }
    return NextResponse.json(fallbackCourses);
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
  const { kode, nama, kelas, sks, koor, dosen, pjId, pjIds, tipe, semester, hari, jamMulai, jamSelesai, ruangan, newRoster } = body;
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

    // 1. Dukung mode lama (pjId tunggal) dan mode baru (banyak PJ).
    const normalizedPjIds = Array.isArray(pjIds)
      ? pjIds.map((value: unknown) => Number(value)).filter((value) => Number.isFinite(value))
      : [];
    const selectedPjIds = normalizedPjIds.length > 0 ? normalizedPjIds : (resolvePjId(pjId) ? [resolvePjId(pjId) as number] : []);
    const pj_id: number | null = selectedPjIds[0] ?? null;

    // 2. Simpan mata kuliah
    const { rows: insResult } = await client.query(
      `INSERT INTO mata_kuliah
      (kode, nama, sks, kelas, semester, tipe, hari, jam_mulai, jam_selesai, ruangan, koordinator, pj_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [kode, nama, sks, kelas, Number(semester), tipe, hari, jamMulai, jamSelesai, ruangan, koor, pj_id]
    );
    const newCourseId = insResult[0].id;

    // 3. Simpan relasi PJ mata kuliah (banyak-ke-banyak, tetap menjaga pj_id utama untuk kompatibilitas)
    for (const selectedPjId of selectedPjIds) {
      await client.query(
        "INSERT INTO mata_kuliah_pj (mata_kuliah_id, pj_id) VALUES ($1, $2) ON CONFLICT (mata_kuliah_id, pj_id) DO NOTHING",
        [newCourseId, selectedPjId]
      );
    }

    // 4. Simpan dosen pengampu (many to many)
    for (const dName of dosenNames) {
      const dosenId = await resolveDosenId(client, dName);
      await client.query("INSERT INTO dosen_mata_kuliah (mata_kuliah_id, dosen_id) VALUES ($1, $2)", [
        newCourseId,
        dosenId,
      ]);
    }

    // 5. Simpan roster awal (input manual/impor Excel dari form ini) langsung ke KRS
    // mata kuliah yang baru dibuat ini
    await insertNewRoster(client, newRoster, newCourseId);

    // 6. Buat 16 pertemuan kosong
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
    pjIds,
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

    // 1. Dukung mode lama (pjId tunggal) dan mode baru (banyak PJ).
    const normalizedPjIds = Array.isArray(pjIds)
      ? pjIds.map((value: unknown) => Number(value)).filter((value) => Number.isFinite(value))
      : [];
    const selectedPjIds = normalizedPjIds.length > 0 ? normalizedPjIds : (resolvePjId(pjId) ? [resolvePjId(pjId) as number] : []);
    const pj_id: number | null = selectedPjIds[0] ?? null;

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

    // 3. Sync relasi PJ mata kuliah (banyak-ke-banyak)
    await client.query("DELETE FROM mata_kuliah_pj WHERE mata_kuliah_id = $1", [id]);
    for (const selectedPjId of selectedPjIds) {
      await client.query(
        "INSERT INTO mata_kuliah_pj (mata_kuliah_id, pj_id) VALUES ($1, $2) ON CONFLICT (mata_kuliah_id, pj_id) DO NOTHING",
        [id, selectedPjId]
      );
    }

    // 4. Update dosen pengampu (many to many)
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
