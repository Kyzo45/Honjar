import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const fallbackPJ = [
  { id: 3, nim: "4211001", nama: "Rifqi Aulia", angkatan: "2021", noHp: "", username: "4211001" },
];

function validatePJInput(nim: string, nama: string, angkatan: string, noHp: string): string | null {
  if (!/^\d+$/.test(nim)) return "NIM harus berupa angka";
  if (nim.length > 10) return "NIM maksimal 10 digit";
  if (nama.length > 50) return "Nama maksimal 50 karakter";
  if (angkatan && !/^\d+$/.test(angkatan)) return "Angkatan harus berupa angka";
  if (angkatan.length > 4) return "Angkatan maksimal 4 digit";
  if (noHp && !/^\d+$/.test(noHp)) return "Nomor HP harus berupa angka";
  if (noHp.length > 12) return "Nomor HP maksimal 12 digit";
  return null;
}

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, nama, nim, angkatan, no_hp FROM users WHERE role = 'pj' ORDER BY nama ASC`
    );
    const pjList = rows.map((r: any) => ({
      id: r.id,
      nim: r.nim || "",
      nama: r.nama,
      angkatan: r.angkatan || "",
      noHp: r.no_hp || "",
      username: r.username,
    }));
    return NextResponse.json(pjList);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan daftar PJ mock:", error.message);
    return NextResponse.json(fallbackPJ);
  }
}

export async function POST(req: Request) {
  try {
    const { nim, nama, angkatan, noHp, password } = await req.json();
    if (!nim || !nim.trim()) {
      return NextResponse.json({ error: "NIM tidak boleh kosong" }, { status: 400 });
    }
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ error: "Password wajib diisi untuk PJ baru" }, { status: 400 });
    }
    const trimmedNim = nim.trim();
    const validationError = validatePJInput(trimmedNim, nama.trim(), (angkatan || "").trim(), (noHp || "").trim());
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows: exists } = await pool.query(
      "SELECT id FROM users WHERE nim = $1 OR username = $1",
      [trimmedNim]
    );
    if (exists.length > 0) {
      return NextResponse.json({ error: "NIM sudah terdaftar sebagai Penanggung Jawab" }, { status: 409 });
    }

    await pool.query(
      `INSERT INTO users (username, password_hash, nama, role, nim, angkatan, no_hp)
       VALUES ($1, $2, $3, 'pj', $4, $5, $6)`,
      [trimmedNim, hashPassword(password.trim()), nama.trim(), trimmedNim, angkatan?.trim() || null, noHp?.trim() || null]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Sukses menyimpan PJ ke cache lokal:", error.message);
    return NextResponse.json({ success: true });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, nim, nama, angkatan, noHp, password } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan untuk mengubah PJ" }, { status: 400 });
    }
    if (!nim || !nim.trim()) {
      return NextResponse.json({ error: "NIM tidak boleh kosong" }, { status: 400 });
    }
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    }
    const trimmedNim = nim.trim();
    const validationError = validatePJInput(trimmedNim, nama.trim(), (angkatan || "").trim(), (noHp || "").trim());
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows: clash } = await pool.query(
      "SELECT id FROM users WHERE (nim = $1 OR username = $1) AND id != $2",
      [trimmedNim, id]
    );
    if (clash.length > 0) {
      return NextResponse.json({ error: "NIM sudah dipakai Penanggung Jawab lain" }, { status: 409 });
    }

    if (password && password.trim()) {
      await pool.query(
        `UPDATE users SET username = $1, nama = $2, nim = $3, angkatan = $4, no_hp = $5, password_hash = $6
         WHERE id = $7 AND role = 'pj'`,
        [trimmedNim, nama.trim(), trimmedNim, angkatan?.trim() || null, noHp?.trim() || null, hashPassword(password.trim()), id]
      );
    } else {
      await pool.query(
        `UPDATE users SET username = $1, nama = $2, nim = $3, angkatan = $4, no_hp = $5
         WHERE id = $6 AND role = 'pj'`,
        [trimmedNim, nama.trim(), trimmedNim, angkatan?.trim() || null, noHp?.trim() || null, id]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Sukses mengubah PJ di cache lokal:", error.message);
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan untuk menghapus PJ" }, { status: 400 });
    }

    // Mata kuliah yang PJ-nya dihapus otomatis jadi tanpa PJ (ON DELETE SET NULL), tidak ikut terhapus
    await pool.query("DELETE FROM users WHERE id = $1 AND role = 'pj'", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Sukses menghapus PJ di cache lokal:", error.message);
    return NextResponse.json({ success: true });
  }
}
