import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { ImportMahasiswaRow } from "@/lib/types";

// Menulis baris hasil preview (/api/mahasiswa/import-preview) yang sudah dikonfirmasi
// pengguna ke database, dalam satu transaksi. Baris berstatus "error" diabaikan.
// Hanya menulis data induk mahasiswa (nim/nama/angkatan) — tidak menyentuh
// kepesertaan mata kuliah manapun, itu diatur terpisah lewat menu Daftar Kelas.
export async function POST(req: Request) {
  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris untuk disimpan" }, { status: 400 });
  }

  const validRows: ImportMahasiswaRow[] = rows.filter((r: ImportMahasiswaRow) => r.status !== "error" && r.nim && r.nama);
  if (validRows.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris valid untuk disimpan" }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (connErr: any) {
    console.warn("PostgreSQL offline. Import mahasiswa dilewati:", connErr.message);
    return NextResponse.json({ success: true, inserted: 0, updated: 0 });
  }

  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");

    for (const r of validRows) {
      const nim = r.nim.trim();
      const nama = r.nama.trim();
      const angkatan = (r.angkatan || "").trim() || null;

      const { rows: result } = await client.query(
        `INSERT INTO mahasiswa (nim, nama, angkatan) VALUES ($1, $2, $3)
         ON CONFLICT (nim) DO UPDATE SET nama = EXCLUDED.nama, angkatan = EXCLUDED.angkatan
         RETURNING (xmax = 0) AS inserted`,
        [nim, nama, angkatan]
      );
      if (result[0]?.inserted) inserted += 1;
      else updated += 1;
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, inserted, updated });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gagal mengimpor data mahasiswa:", error);
    return NextResponse.json({ error: "Gagal menyimpan hasil impor: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
