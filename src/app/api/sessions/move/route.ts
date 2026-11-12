import { NextResponse } from "next/server";
import { authorizeBakteriologiSessionEdit, connectSessionClient } from "@/lib/sessions";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  const ke = Number(body?.ke);
  const pjId = Number(body?.pjId);
  const direction = body?.direction;

  if (
    !Number.isInteger(courseId) || courseId <= 0 ||
    !Number.isInteger(ke) || ke <= 0 ||
    !Number.isInteger(pjId) || pjId <= 0 ||
    (direction !== "up" && direction !== "down")
  ) {
    return NextResponse.json({ error: "courseId, ke, direction, dan pjId wajib valid" }, { status: 400 });
  }

  const conn = await connectSessionClient("menggeser baris UTS/UAS");
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

    const idx = meetings.findIndex((m: { ke: number }) => Number(m.ke) === ke);
    const current = idx >= 0 ? meetings[idx] : null;
    if (!current || (current.tipe !== "uts" && current.tipe !== "uas")) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Hanya baris UTS atau UAS yang dapat digeser" }, { status: 400 });
    }

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= meetings.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Baris tidak dapat digeser lebih jauh" }, { status: 400 });
    }

    const neighbor = meetings[targetIdx];
    if (
      (current.tipe === "uts" && neighbor.tipe === "uas") ||
      (current.tipe === "uas" && neighbor.tipe === "uts")
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "UTS harus tetap berada sebelum UAS" }, { status: 400 });
    }

    const keA = Number(current.ke);
    const keB = Number(neighbor.ke);
    const tempKe = Math.max(...meetings.map((m: { ke: number }) => Number(m.ke))) + 1000;

    await client.query("UPDATE pertemuan SET ke = $1 WHERE id = $2", [tempKe, current.id]);
    await client.query("UPDATE pertemuan SET ke = $1 WHERE id = $2", [keA, neighbor.id]);
    await client.query("UPDATE pertemuan SET ke = $1 WHERE id = $2", [keB, current.id]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, fromKe: keA, toKe: keB, tipe: current.tipe });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal menggeser baris UTS/UAS:", error);
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    return NextResponse.json({ error: "Gagal menggeser baris UTS/UAS: " + message }, { status: 500 });
  } finally {
    client.release();
  }
}
