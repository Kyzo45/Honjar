import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Kelola peserta (KRS) satu mata kuliah secara langsung — sumber kebenaran roster
// bukan kecocokan teks "kelas" (satu mahasiswa bisa ikut banyak mata kuliah
// dengan label kelas apapun), tapi baris di tabel krs untuk mata kuliah ini saja.

export async function POST(req: Request) {
  try {
    const { courseId, nim, nama, angkatan } = await req.json();
    if (!courseId || !nim) {
      return NextResponse.json({ error: "courseId dan nim wajib diisi" }, { status: 400 });
    }
    const trimmedNim = nim.toString().trim();
    if (!/^\d+$/.test(trimmedNim)) {
      return NextResponse.json({ error: "NIM harus berupa angka" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Mahasiswa boleh sudah ada (tinggal ditambahkan ke roster mata kuliah ini)
      // atau baru sama sekali (nama wajib diisi supaya bisa dibuat).
      const { rows: existing } = await client.query("SELECT nim FROM mahasiswa WHERE nim = $1", [trimmedNim]);
      if (existing.length === 0) {
        const trimmedNama = (nama || "").toString().trim();
        if (!trimmedNama) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Mahasiswa dengan NIM ini belum terdaftar — isi nama untuk membuat data baru" }, { status: 400 });
        }
        await client.query(
          "INSERT INTO mahasiswa (nim, nama, angkatan) VALUES ($1, $2, $3)",
          [trimmedNim, trimmedNama, (angkatan || "").toString().trim() || null]
        );
      }

      await client.query(
        "INSERT INTO krs (mahasiswa_nim, mata_kuliah_id) VALUES ($1, $2) ON CONFLICT (mahasiswa_nim, mata_kuliah_id) DO NOTHING",
        [trimmedNim, courseId]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
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
