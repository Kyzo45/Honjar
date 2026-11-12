import { NextResponse } from "next/server";
import { authorizeBakteriologiSessionEdit, connectSessionClient } from "@/lib/sessions";

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  const pjId = Number(body?.pjId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(pjId) || pjId <= 0) {
    return NextResponse.json({ error: "courseId dan pjId wajib valid" }, { status: 400 });
  }

  const conn = await connectSessionClient("menghapus kolom tambahan");
  if (!conn.ok) return conn.response;
  const { client } = conn;

  try {
    await client.query("BEGIN");

    const auth = await authorizeBakteriologiSessionEdit(client, courseId, pjId);
    if (!auth.ok) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { rows: meetings } = await client.query(
      `SELECT p.*,
              NOT EXISTS (
                SELECT 1 FROM kehadiran_mahasiswa km WHERE km.pertemuan_id = p.id
              ) AS no_attendance
       FROM pertemuan p
       WHERE p.mata_kuliah_id = $1
       ORDER BY p.ke ASC
       FOR UPDATE OF p`,
      [courseId]
    );

    const kuliahMeetings = meetings.filter((m: { tipe: string }) => m.tipe === "kuliah");
    if (kuliahMeetings.length <= 14) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Tidak ada kolom pertemuan tambahan untuk dihapus" }, { status: 400 });
    }

    const meeting = kuliahMeetings[kuliahMeetings.length - 1];
    const isEmpty = !meeting.topik && !meeting.tanggal && !meeting.jam_mulai && !meeting.jam_selesai &&
      !meeting.durasi_menit && !meeting.jumlah_jam && !meeting.metode && !meeting.dosen_pengajar &&
      !meeting.kehadiran_dosen && Number(meeting.jumlah_hadir_mhs || 0) === 0 && meeting.no_attendance;
    if (!isEmpty) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pertemuan terakhir sudah memiliki data dan tidak dapat dihapus" }, { status: 409 });
    }

    const deletedKe = Number(meeting.ke);
    await client.query("DELETE FROM pertemuan WHERE id = $1", [meeting.id]);

    const rowsToShift = meetings
      .filter((m: { ke: number }) => Number(m.ke) > deletedKe)
      .sort((a: { ke: number }, b: { ke: number }) => Number(a.ke) - Number(b.ke));

    for (const row of rowsToShift) {
      await client.query("UPDATE pertemuan SET ke = $1 WHERE id = $2", [Number(row.ke) - 1, row.id]);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, ke: deletedKe });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menghapus kolom tambahan:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menghapus kolom tambahan: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}
