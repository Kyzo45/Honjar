import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { fallbackPJ } from "@/app/api/pj/route";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const { username, password } = body;

  if (!username || !username.toString().trim()) {
    return NextResponse.json({ error: "Username tidak boleh kosong" }, { status: 400 });
  }
  if (!password || !password.toString().trim()) {
    return NextResponse.json({ error: "Password tidak boleh kosong" }, { status: 400 });
  }

  const q = username.toString().trim();
  const pwd = password.toString().trim();

  try {
    // 1. Coba Query dari PostgreSQL
    const { rows } = await pool.query(
      `SELECT id, username, nama, role, password_hash, nim FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(nim) = LOWER($1)`,
      [q]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "Username atau NIM tidak terdaftar" }, { status: 404 });
    }

    if (user.role === "mahasiswa") {
      return NextResponse.json(
        { error: "Mahasiswa tidak perlu masuk. Presensi mandiri ditiadakan, kehadiran diinput langsung oleh PJ kelas." },
        { status: 403 }
      );
    }

    const isValidPassword = verifyPassword(pwd, user.password_hash) || user.password_hash === pwd;
    if (!isValidPassword) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nim: user.nim || (user.role === "pj" ? user.username : undefined),
      },
    });
  } catch (error: any) {
    console.warn("PostgreSQL offline / error. Menggunakan data login mock:", error.message);

    // 2. Offline Fallback (Database Mati / Tidak Terhubung)
    const mockUsers: Record<string, any> = {
      admin: { id: 1, username: "admin", nama: "Administrator", role: "admin", password: "admin" },
      "2350081070": { id: 3, username: "2350081070", nama: "Rifqi", role: "pj", nim: "2350081070", password: "pjra" },
    };

    const lowerQ = q.toLowerCase();
    let user = mockUsers[lowerQ];

    if (!user) {
      const matchPJ = fallbackPJ.find(
        (p) => p.username.toLowerCase() === lowerQ || (p.nim && p.nim.toLowerCase() === lowerQ)
      );
      if (matchPJ) {
        user = {
          id: matchPJ.id,
          username: matchPJ.username,
          nama: matchPJ.nama,
          role: "pj",
          nim: matchPJ.nim,
          password: matchPJ.password || "pjra",
        };
      }
    }

    if (!user) {
      if (lowerQ.includes("elsa") || lowerQ.includes("joko")) {
        return NextResponse.json(
          { error: "Mahasiswa tidak perlu masuk. Kehadiran akan diinput langsung oleh PJ kelas." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Username atau NIM tidak terdaftar" }, { status: 404 });
    }

    // Hanya kunci password ke password milik user tersebut (tidak ada bypass 123456/admin)
    const expectedPassword = user.password;
    if (pwd !== expectedPassword) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nim: user.nim,
      },
    });
  }
}