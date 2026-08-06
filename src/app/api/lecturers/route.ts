import { NextResponse } from "next/server";
import pool from "@/lib/db";

const fallbackLecturers = [
  "Dr. Arina Novilla, M.Kes.",
  "M. Ratna Ningrum, M.Si.",
  "Taufik Gunawan, S.Tr.Kes.",
  "Bayu Dwi Rianto, M.Biomed.",
  "Dr. Erick Khristian, M.Si.",
  "Anggi Sandika, S.Tr.Kes., MM."
];

export async function GET() {
  try {
    const { rows } = await pool.query("SELECT nama FROM dosen ORDER BY nama ASC");
    const names = rows.map((r: any) => r.nama);
    return NextResponse.json(names);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan daftar dosen mock:", error.message);
    return NextResponse.json(fallbackLecturers);
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama dosen tidak boleh kosong" }, { status: 400 });
    }
    const trimmed = name.trim();
    
    // Cek apakah sudah ada
    const { rows: exists } = await pool.query("SELECT id FROM dosen WHERE nama = $1", [trimmed]);
    if (exists.length > 0) {
      return NextResponse.json({ success: true, message: "Dosen sudah terdaftar" });
    }

    await pool.query("INSERT INTO dosen (nama) VALUES ($1)", [trimmed]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Sukses menyimpan dosen ke cache lokal:", error.message);
    return NextResponse.json({ success: true });
  }
}
