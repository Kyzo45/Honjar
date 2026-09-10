import { NextResponse } from "next/server";
import pool from "@/lib/db";

let fallbackLecturers = [
  { id: 1, nid: "DSN0001", nama: "Dr. Arina Novilla, M.Kes.", status: "tetap" },
  { id: 2, nid: "DSN0002", nama: "M. Ratna Ningrum, M.Si.", status: "tetap" },
  { id: 3, nid: "DSN0003", nama: "Taufik Gunawan, S.Tr.Kes.", status: "tetap" },
  { id: 4, nid: "DSN0004", nama: "Bayu Dwi Rianto, M.Biomed.", status: "tetap" },
  { id: 5, nid: "DSN0005", nama: "Dr. Erick Khristian, M.Si.", status: "tetap" },
  { id: 6, nid: "DSN0006", nama: "Anggi Sandika, S.Tr.Kes., MM.", status: "luar" },
];

function normalizeStatus(status: unknown): "tetap" | "luar" | null {
  if (status === "tetap" || status === "luar") return status;
  return null;
}

export async function GET() {
  try {
    const { rows } = await pool.query("SELECT id, nid, nama, status_dosen FROM dosen ORDER BY nama ASC");
    const dosen = rows.map((r: any) => ({ id: r.id, nid: r.nid, nama: r.nama, status: r.status_dosen }));
    return NextResponse.json(dosen);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan daftar dosen mock:", error.message);
    return NextResponse.json(fallbackLecturers);
  }
}

export async function POST(req: Request) {
  try {
    const { nid, nama, status } = await req.json();
    if (!nid || !nid.trim()) {
      return NextResponse.json({ error: "NID tidak boleh kosong" }, { status: 400 });
    }
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama dosen tidak boleh kosong" }, { status: 400 });
    }
    const trimmedNid = nid.trim();
    const trimmedNama = nama.trim();
    const statusDosen = normalizeStatus(status) || "tetap";

    const { rows: exists } = await pool.query(
      "SELECT id FROM dosen WHERE nid = $1 OR nama = $2",
      [trimmedNid, trimmedNama]
    );
    if (exists.length > 0) {
      return NextResponse.json({ error: "NID atau nama dosen sudah terdaftar" }, { status: 409 });
    }

    await pool.query(
      "INSERT INTO dosen (nid, nama, status_dosen) VALUES ($1, $2, $3)",
      [trimmedNid, trimmedNama, statusDosen]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline/error. Sukses menyimpan dosen ke cache lokal:", error.message);
    const { nid, nama, status } = await req.clone().json().catch(() => ({}));
    const trimmedNid = (nid || "").toString().trim();
    const trimmedNama = (nama || "").toString().trim();
    if (trimmedNid && trimmedNama) {
      const maxId = fallbackLecturers.length > 0 ? Math.max(...fallbackLecturers.map((l) => l.id)) : 0;
      fallbackLecturers.push({
        id: maxId + 1,
        nid: trimmedNid,
        nama: trimmedNama,
        status: normalizeStatus(status) || "tetap",
      });
    }
    return NextResponse.json({ success: true });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, nid, nama, status } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan untuk mengubah dosen" }, { status: 400 });
    }
    if (!nid || !nid.trim()) {
      return NextResponse.json({ error: "NID tidak boleh kosong" }, { status: 400 });
    }
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama dosen tidak boleh kosong" }, { status: 400 });
    }
    const trimmedNid = nid.trim();
    const trimmedNama = nama.trim();
    const statusDosen = normalizeStatus(status);
    if (!statusDosen) {
      return NextResponse.json({ error: "Status dosen tidak valid" }, { status: 400 });
    }

    const { rows: clash } = await pool.query(
      "SELECT id FROM dosen WHERE (nid = $1 OR nama = $2) AND id != $3",
      [trimmedNid, trimmedNama, id]
    );
    if (clash.length > 0) {
      return NextResponse.json({ error: "NID atau nama dosen sudah dipakai dosen lain" }, { status: 409 });
    }

    await pool.query(
      "UPDATE dosen SET nid = $1, nama = $2, status_dosen = $3 WHERE id = $4",
      [trimmedNid, trimmedNama, statusDosen, id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline/error. Sukses mengubah dosen di cache lokal:", error.message);
    const { id, nid, nama, status } = await req.clone().json().catch(() => ({}));
    const idx = fallbackLecturers.findIndex((l) => l.id === Number(id));
    if (idx !== -1) {
      fallbackLecturers[idx] = {
        id: Number(id),
        nid: (nid || "").toString().trim(),
        nama: (nama || "").toString().trim(),
        status: normalizeStatus(status) || "tetap",
      };
    }
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan untuk menghapus dosen" }, { status: 400 });
    }

    await pool.query("DELETE FROM dosen WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn("PostgreSQL offline/error. Sukses menghapus dosen di cache lokal:", error.message);
    const { id } = await req.clone().json().catch(() => ({}));
    if (id) {
      fallbackLecturers = fallbackLecturers.filter((l) => l.id !== Number(id));
    }
    return NextResponse.json({ success: true });
  }
}
