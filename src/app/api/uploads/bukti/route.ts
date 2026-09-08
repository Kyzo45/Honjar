import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Menyimpan berkas bukti sakit/izin yang diunggah PJ ke public/uploads/bukti,
// supaya benar-benar ada file yang bisa dibuka lagi nanti — sebelumnya hanya
// nama file yang dicatat (client-side), isi berkasnya sendiri tidak pernah
// terkirim ke server sama sekali.

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "bukti");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 400 });
    }

    const originalName = file.name || "berkas";
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ error: "Format berkas harus PDF atau gambar (JPG/PNG/WEBP)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran berkas maksimal 5MB" }, { status: 400 });
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(originalName)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/bukti/${storedName}`,
      originalName,
    });
  } catch (error: any) {
    console.error("Gagal mengunggah berkas bukti:", error);
    return NextResponse.json({ error: "Gagal mengunggah berkas: " + error.message }, { status: 500 });
  }
}
