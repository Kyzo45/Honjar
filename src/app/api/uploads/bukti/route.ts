import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

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

    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(originalName)}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`bukti/${storedName}`, file, {
        access: "public",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        originalName,
      });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Penyimpanan berkas belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN di environment deployment." },
        { status: 500 }
      );
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/bukti/${storedName}`,
      originalName,
    });
  } catch (error: unknown) {
    console.error("Gagal mengunggah berkas bukti:", error);
    const message = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return NextResponse.json({ error: "Gagal mengunggah berkas: " + message }, { status: 500 });
  }
}
