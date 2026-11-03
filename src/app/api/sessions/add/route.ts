import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
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
    console.error("Database tidak tersedia saat menambah pertemuan:", error);
    return NextResponse.json({ error: "Gagal terhubung ke database: " + message }, { status: 503 });
  }

  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE public.pertemuan DROP CONSTRAINT IF EXISTS pertemuan_ke_check");

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

    const { rows: nextRows } = await client.query(
      "SELECT COALESCE(MAX(ke), 0) + 1 AS ke FROM pertemuan WHERE mata_kuliah_id = $1",
      [courseId]
    );
    const ke = Number(nextRows[0].ke);

    await client.query(
      "INSERT INTO pertemuan (mata_kuliah_id, ke, tipe) VALUES ($1, $2, 'kuliah')",
      [courseId, ke]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, ke });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menambah pertemuan:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menambah pertemuan: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}