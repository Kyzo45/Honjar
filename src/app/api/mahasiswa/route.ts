import { NextResponse } from "next/server";
import pool from "@/lib/db";

let fallbackMahasiswa = [
  { nim: "4211001", nama: "Adinda Pramesti", angkatan: "2021" },
  { nim: "4211002", nama: "Bagas Nurwahid", angkatan: "2021" },
];

function isDbUnavailableError(error: any): boolean {
  const message = String(error?.message ?? "");
  return /ECONNREFUSED|ENOTFOUND|timeout|connect/i.test(message) || error?.code === "ECONNREFUSED";
}

function isDbAuthError(error: any): boolean {
  const message = String(error?.message ?? "");
  return /password authentication failed|invalid password|authentication failed|28P01|28P00/i.test(message);
}

function validateMahasiswaInput(nim: string, nama: string, angkatan: string): string | null {
  if (!nim) return "NIM tidak boleh kosong";
  if (!/^\d+$/.test(nim)) return "NIM harus berupa angka";
  if (nim.length > 15) return "NIM maksimal 15 digit";
  if (!nama) return "Nama tidak boleh kosong";
  if (nama.length > 100) return "Nama maksimal 100 karakter";
  if (angkatan && !/^\d+$/.test(angkatan)) return "Angkatan harus berupa angka";
  if (angkatan && angkatan.length > 4) return "Angkatan maksimal 4 digit";
  return null;
}

export async function GET() {
  try {
    const { rows } = await pool.query("SELECT nim, nama, angkatan FROM mahasiswa ORDER BY nama ASC");
    const mahasiswa = rows.map((r: any) => ({
      nim: r.nim,
      nama: r.nama,
      angkatan: r.angkatan || "",
    }));
    return NextResponse.json(mahasiswa);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan daftar mahasiswa mock:", error.message);
    return NextResponse.json(fallbackMahasiswa);
  }
}

export async function POST(req: Request) {
  try {
    const { nim, nama, angkatan } = await req.json();
    const trimmedNim = (nim || "").toString().trim();
    const trimmedNama = (nama || "").toString().trim();
    const trimmedAngkatan = (angkatan || "").toString().trim();

    const validationError = validateMahasiswaInput(trimmedNim, trimmedNama, trimmedAngkatan);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows: exists } = await pool.query("SELECT nim FROM mahasiswa WHERE nim = $1", [trimmedNim]);
    if (exists.length > 0) {
      return NextResponse.json({ error: "NIM sudah terdaftar di data mahasiswa" }, { status: 409 });
    }

    await pool.query(
      "INSERT INTO mahasiswa (nim, nama, angkatan) VALUES ($1, $2, $3)",
      [trimmedNim, trimmedNama, trimmedAngkatan || null]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PostgreSQL error saat menambah mahasiswa:", error);

    if (isDbAuthError(error)) {
      return NextResponse.json({ error: "Koneksi database gagal: kredensial PostgreSQL tidak valid." }, { status: 500 });
    }
    if (!isDbUnavailableError(error)) {
      return NextResponse.json({ error: "Gagal menyimpan mahasiswa: " + (error?.message || "database error") }, { status: 500 });
    }

    const { nim, nama, angkatan } = await req.clone().json().catch(() => ({}));
    const trimmedNim = (nim || "").toString().trim();
    const trimmedNama = (nama || "").toString().trim();
    if (trimmedNim && trimmedNama) {
      const idx = fallbackMahasiswa.findIndex((m) => m.nim === trimmedNim);
      if (idx === -1) {
        fallbackMahasiswa.push({ nim: trimmedNim, nama: trimmedNama, angkatan: (angkatan || "").toString().trim() });
      }
    }
    return NextResponse.json({ success: true });
  }
}

export async function PUT(req: Request) {
  try {
    const { nim, nama, angkatan } = await req.json();
    const trimmedNim = (nim || "").toString().trim();
    const trimmedNama = (nama || "").toString().trim();
    const trimmedAngkatan = (angkatan || "").toString().trim();

    if (!trimmedNim) {
      return NextResponse.json({ error: "NIM wajib disertakan untuk mengubah data mahasiswa" }, { status: 400 });
    }
    const validationError = validateMahasiswaInput(trimmedNim, trimmedNama, trimmedAngkatan);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows: found } = await pool.query("SELECT nim FROM mahasiswa WHERE nim = $1", [trimmedNim]);
    if (found.length === 0) {
      return NextResponse.json({ error: "Data mahasiswa tidak ditemukan" }, { status: 404 });
    }

    await pool.query(
      "UPDATE mahasiswa SET nama = $1, angkatan = $2 WHERE nim = $3",
      [trimmedNama, trimmedAngkatan || null, trimmedNim]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PostgreSQL error saat mengubah mahasiswa:", error);

    if (isDbAuthError(error)) {
      return NextResponse.json({ error: "Koneksi database gagal: kredensial PostgreSQL tidak valid." }, { status: 500 });
    }
    if (!isDbUnavailableError(error)) {
      return NextResponse.json({ error: "Gagal mengubah mahasiswa: " + (error?.message || "database error") }, { status: 500 });
    }

    const { nim, nama, angkatan } = await req.clone().json().catch(() => ({}));
    const trimmedNim = (nim || "").toString().trim();
    const idx = fallbackMahasiswa.findIndex((m) => m.nim === trimmedNim);
    if (idx !== -1) {
      fallbackMahasiswa[idx] = {
        nim: trimmedNim,
        nama: (nama || "").toString().trim(),
        angkatan: (angkatan || "").toString().trim(),
      };
    }
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(req: Request) {
  try {
    const { nim } = await req.json();
    if (!nim) {
      return NextResponse.json({ error: "nim wajib disertakan untuk menghapus data mahasiswa" }, { status: 400 });
    }

    // krs & kehadiran_mahasiswa ikut terhapus otomatis (ON DELETE CASCADE)
    await pool.query("DELETE FROM mahasiswa WHERE nim = $1", [nim]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PostgreSQL error saat menghapus mahasiswa:", error);

    if (isDbAuthError(error)) {
      return NextResponse.json({ error: "Koneksi database gagal: kredensial PostgreSQL tidak valid." }, { status: 500 });
    }
    if (!isDbUnavailableError(error)) {
      return NextResponse.json({ error: "Gagal menghapus mahasiswa: " + (error?.message || "database error") }, { status: 500 });
    }

    const { nim } = await req.clone().json().catch(() => ({}));
    if (nim) {
      fallbackMahasiswa = fallbackMahasiswa.filter((m) => m.nim !== (nim || "").toString().trim());
    }
    return NextResponse.json({ success: true });
  }
}
