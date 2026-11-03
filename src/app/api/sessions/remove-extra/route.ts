import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  const pjId = Number(body?.pjId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(pjId) || pjId <= 0) {
    return NextResponse.json({ error: "courseId dan pjId wajib valid" }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    console.error("Database tidak tersedia saat menghapus kolom tambahan:", error);
    return NextResponse.json({ error: "Gagal terhubung ke database: " + message }, { status: 503 });
  }

  try {
    await client.query("BEGIN");

    const { rows: courses } = await client.query(
      `SELECT mk.id
       FROM mata_kuliah mk
       WHERE mk.id = $1
         AND (
           mk.pj_id = $2
           OR EXISTS (
             SELECT 1 FROM mata_kuliah_pj mpj
             WHERE mpj.mata_kuliah_id = mk.id AND mpj.pj_id = $2
           )
         )
       FOR UPDATE OF mk`,
      [courseId, pjId]
    );

    if (!courses[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Mata kuliah tidak ditemukan atau bukan kelas PJ ini" }, { status: 404 });
    }

    const { rows: meetings } = await client.query(
      `SELECT p.*,
              NOT EXISTS (
                SELECT 1 FROM kehadiran_mahasiswa km WHERE km.pertemuan_id = p.id
              ) AS no_attendance
       FROM pertemuan p
       WHERE p.mata_kuliah_id = $1
       ORDER BY p.ke DESC
       LIMIT 1
       FOR UPDATE OF p`,
      [courseId]
    );
    const meeting = meetings[0];

    if (!meeting || Number(meeting.ke) <= 16 || meeting.tipe !== "kuliah") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Tidak ada kolom pertemuan tambahan untuk dihapus" }, { status: 400 });
    }

    const isEmpty = !meeting.topik && !meeting.tanggal && !meeting.jam_mulai && !meeting.jam_selesai &&
      !meeting.durasi_menit && !meeting.jumlah_jam && !meeting.metode && !meeting.dosen_pengajar &&
      !meeting.kehadiran_dosen && Number(meeting.jumlah_hadir_mhs || 0) === 0 && meeting.no_attendance;
    if (!isEmpty) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pertemuan terakhir sudah memiliki data dan tidak dapat dihapus" }, { status: 409 });
    }

    await client.query("DELETE FROM pertemuan WHERE id = $1", [meeting.id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, ke: Number(meeting.ke) });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menghapus kolom tambahan:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menghapus kolom tambahan: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}