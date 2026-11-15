import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Kelola peserta (KRS) satu mata kuliah secara langsung — sumber kebenaran roster
// bukan kecocokan teks "kelas" (satu mahasiswa bisa ikut banyak mata kuliah
// dengan label kelas apapun), tapi baris di tabel krs untuk mata kuliah ini saja.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseId = Number(body.courseId);
    if (!courseId) {
      return NextResponse.json({ error: "courseId wajib diisi" }, { status: 400 });
    }

    const students: { nim: string; nama?: string; angkatan?: string }[] = Array.isArray(body.students)
      ? body.students
      : body.nim
        ? [{ nim: String(body.nim), nama: body.nama, angkatan: body.angkatan }]
        : [];

    if (students.length === 0) {
      return NextResponse.json({ error: "Daftar mahasiswa kosong atau tidak valid" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let addedCount = 0;
      for (const s of students) {
        const trimmedNim = String(s.nim || "").trim().replace(/\D/g, "");
        if (!trimmedNim) continue;

        const { rows: existing } = await client.query("SELECT nim FROM mahasiswa WHERE nim = $1", [trimmedNim]);
        if (existing.length === 0) {
          const trimmedNama = String(s.nama || "").trim();
          if (trimmedNama) {
            await client.query(
              "INSERT INTO mahasiswa (nim, nama, angkatan) VALUES ($1, $2, $3) ON CONFLICT (nim) DO UPDATE SET nama = EXCLUDED.nama, angkatan = COALESCE(EXCLUDED.angkatan, mahasiswa.angkatan)",
              [trimmedNim, trimmedNama, String(s.angkatan || "").trim() || null]
            );
          } else {
            continue;
          }
        }

        const resKrs = await client.query(
          "INSERT INTO krs (mahasiswa_nim, mata_kuliah_id) VALUES ($1, $2) ON CONFLICT (mahasiswa_nim, mata_kuliah_id) DO NOTHING",
          [trimmedNim, courseId]
        );
        if ((resKrs.rowCount ?? 0) > 0) {
          addedCount += 1;
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, added: addedCount });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Gagal menambahkan mahasiswa ke mata kuliah:", error);
    const message = String(error?.message || "");
    if (/password authentication failed|invalid password|authentication failed|28P01|28P00/i.test(message)) {
      return NextResponse.json({ error: "Koneksi database gagal: kredensial PostgreSQL tidak valid." }, { status: 500 });
    }
    return NextResponse.json({ error: "Gagal menambahkan mahasiswa: " + message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { courseId, nim } = await req.json();
    if (!courseId || !nim) {
      return NextResponse.json({ error: "courseId dan nim wajib diisi" }, { status: 400 });
    }
    await pool.query("DELETE FROM krs WHERE mata_kuliah_id = $1 AND mahasiswa_nim = $2", [courseId, nim]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Gagal mengeluarkan mahasiswa dari mata kuliah:", error);
    return NextResponse.json({ error: "Gagal mengeluarkan mahasiswa: " + error.message }, { status: 500 });
  }
}
