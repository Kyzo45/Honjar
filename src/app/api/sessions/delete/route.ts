import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  const ke = Number(body?.ke);
  const pjId = Number(body?.pjId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(ke) || ke <= 0 || !Number.isInteger(pjId) || pjId <= 0) {
    return NextResponse.json({ error: "courseId, ke, dan pjId wajib valid" }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    console.error("Database tidak tersedia saat menghapus pertemuan:", error);
    return NextResponse.json({ error: "Gagal terhubung ke database: " + message }, { status: 503 });
  }

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT p.id
       FROM pertemuan p
       JOIN mata_kuliah mk ON mk.id = p.mata_kuliah_id
       WHERE p.mata_kuliah_id = $1 AND p.ke = $2
         AND (
           mk.pj_id = $3
           OR EXISTS (
             SELECT 1 FROM mata_kuliah_pj mpj
             WHERE mpj.mata_kuliah_id = mk.id AND mpj.pj_id = $3
           )
         )
       FOR UPDATE OF p`,
      [courseId, ke, pjId]
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pertemuan tidak ditemukan atau bukan kelas PJ ini" }, { status: 404 });
    }

    const meetingIds = rows.map((row: { id: number }) => row.id);
    await client.query("DELETE FROM kehadiran_mahasiswa WHERE pertemuan_id = ANY($1::integer[])", [meetingIds]);
    await client.query(
      `UPDATE pertemuan SET
         tanggal = NULL,
         jam_mulai = NULL,
         jam_selesai = NULL,
         durasi_menit = NULL,
         jumlah_jam = NULL,
         topik = NULL,
         metode = NULL,
         dosen_pengajar = NULL,
         kehadiran_dosen = NULL,
         jumlah_hadir_mhs = 0
      WHERE mata_kuliah_id = $1 AND ke = $2`,
          [courseId, ke]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menghapus isi pertemuan:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menghapus pertemuan: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}
