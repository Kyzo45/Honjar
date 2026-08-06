import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!username) {
    return NextResponse.json({ error: "Username tidak boleh kosong" }, { status: 400 });
  }

  try {
    // Ambil data user dari PostgreSQL
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.nama, u.role, u.mahasiswa_nim as nim, m.kelas 
       FROM users u 
       LEFT JOIN mahasiswa m ON u.mahasiswa_nim = m.nim 
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "Username tidak terdaftar" }, { status: 404 });
    }

    if (password !== "123456" && password !== "admin") {
      return NextResponse.json({ error: "Password salah (Gunakan: 123456)" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nim: user.nim || undefined,
        kelas: user.kelas || undefined,
      },
    });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan data login mock:", error.message);
    
    // Data akun demo cadangan (offline fallback)
    const mockUsers: Record<string, any> = {
      "sri.wahyuni": { id: 1, username: "sri.wahyuni", nama: "Sri Wahyuni", role: "admin" },
      "rifqi.aulia": { id: 2, username: "rifqi.aulia", nama: "Rifqi Aulia", role: "pj" },
      "elsa.nurhaliza": { id: 3, username: "elsa.nurhaliza", nama: "Elsa Nurhaliza", role: "mahasiswa", nim: "4211005", kelas: "1C" },
      "joko.prasetyo": { id: 4, username: "joko.prasetyo", nama: "Joko Prasetyo", role: "mahasiswa", nim: "4211010", kelas: "1C" },
    };

    const user = mockUsers[username.toLowerCase().trim()];

    if (!user) {
      return NextResponse.json({ error: "Username demo tidak dikenal" }, { status: 404 });
    }

    if (password !== "123456" && password !== "admin") {
      return NextResponse.json({ error: "Password salah (Gunakan: 123456)" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  }
}
