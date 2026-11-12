import { NextResponse } from "next/server";
import { authorizeBakteriologiSessionEdit, connectSessionClient } from "@/lib/sessions";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  const pjId = Number(body?.pjId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(pjId) || pjId <= 0) {
    return NextResponse.json({ error: "courseId dan pjId wajib valid" }, { status: 400 });
  }

  const conn = await connectSessionClient("menambah pertemuan");
  if (!conn.ok) return conn.response;
  const { client } = conn;

  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE public.pertemuan DROP CONSTRAINT IF EXISTS pertemuan_ke_check");

    const auth = await authorizeBakteriologiSessionEdit(client, courseId, pjId);
    if (!auth.ok) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { rows: meetings } = await client.query(
      "SELECT id, ke, tipe FROM pertemuan WHERE mata_kuliah_id = $1 ORDER BY ke ASC FOR UPDATE",
      [courseId]
    );

    const uasRow = meetings.find((m: { tipe: string }) => m.tipe === "uas");
    const insertKe = uasRow
      ? Number(uasRow.ke)
      : meetings.length > 0
        ? Math.max(...meetings.map((m: { ke: number }) => Number(m.ke))) + 1
        : 1;

    if (uasRow) {
      const rowsToShift = [...meetings]
        .filter((m: { ke: number }) => Number(m.ke) >= insertKe)
        .sort((a: { ke: number }, b: { ke: number }) => Number(b.ke) - Number(a.ke));

      for (const row of rowsToShift) {
        await client.query("UPDATE pertemuan SET ke = $1 WHERE id = $2", [Number(row.ke) + 1, row.id]);
      }
    }

    await client.query(
      "INSERT INTO pertemuan (mata_kuliah_id, ke, tipe) VALUES ($1, $2, 'kuliah')",
      [courseId, insertKe]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, ke: insertKe });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menambah pertemuan:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menambah pertemuan: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}
