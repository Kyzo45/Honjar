import { NextResponse } from "next/server";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import pool from "@/lib/db";
import type { ImportMahasiswaRow, ImportRowStatus } from "@/lib/types";

// Menerima file Excel (multipart/form-data, field "file"), mem-parsing lewat skrip
// Python (openpyxl), lalu mengembalikan preview baris tanpa menulis apapun ke
// database — konfirmasi baru dilakukan lewat /api/mahasiswa/import-commit, atau
// (dari form mata kuliah) langsung disertakan ke payload simpan mata kuliah.
export async function POST(req: Request) {
  let tempPath: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Berkas Excel tidak ditemukan" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    tempPath = path.join(os.tmpdir(), `honjar-import-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
    fs.writeFileSync(tempPath, buffer);

    const scriptPath = path.join(process.cwd(), "src", "lib", "parse_mahasiswa_excel.py");
    const stdout: string = await new Promise((resolve, reject) => {
      execFile("python", [scriptPath, tempPath as string], (error, out, stderr) => {
        if (error) {
          // Skrip Python normalnya tetap keluar dengan kode 0 dan menaruh pesan
          // error yang bisa dibaca pengguna di stdout (lihat parse_mahasiswa_excel.py).
          // Tapi kalau tetap ada exit code bukan-0 (mis. python-nya sendiri tidak
          // ketemu), coba dulu baca stdout siapa tahu tetap berisi JSON error yang
          // berguna, baru jatuh ke stderr/pesan generik Node kalau memang kosong.
          const fallback = (out || "").trim();
          if (fallback) {
            try {
              JSON.parse(fallback);
              resolve(fallback);
              return;
            } catch {
              // bukan JSON valid, lanjut ke penanganan error di bawah
            }
          }
          reject(new Error(stderr || error.message));
        } else {
          resolve(out.trim());
        }
      });
    });

    const parsed = JSON.parse(stdout);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const rawRows: { nim: string; nama: string; angkatan: string }[] = parsed.rows || [];
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Tidak ada baris data yang terbaca dari berkas ini" }, { status: 400 });
    }

    // Bandingkan dengan data yang sudah ada supaya preview bisa menandai baru/update/error
    const { rows: existingRows } = await pool.query("SELECT nim, nama, angkatan FROM mahasiswa");
    const existingByNim = new Map<string, { nama: string; angkatan: string }>(
      existingRows.map((r: any) => [r.nim, { nama: r.nama, angkatan: r.angkatan || "" }])
    );

    const seenNim = new Set<string>();
    const rows: ImportMahasiswaRow[] = rawRows.map((r) => {
      const nim = (r.nim || "").trim();
      const nama = (r.nama || "").trim();
      const angkatan = (r.angkatan || "").trim();

      let status: ImportRowStatus = "baru";
      let pesan: string | undefined;

      if (!nim || !/^\d+$/.test(nim)) {
        status = "error";
        pesan = "NIM kosong atau bukan angka";
      } else if (nim.length > 15) {
        status = "error";
        pesan = "NIM lebih dari 15 digit";
      } else if (!nama) {
        status = "error";
        pesan = "Nama kosong";
      } else if (seenNim.has(nim)) {
        status = "error";
        pesan = "NIM duplikat di berkas ini";
      } else {
        const existing = existingByNim.get(nim);
        if (existing) {
          const changed = existing.nama !== nama || existing.angkatan !== angkatan;
          status = "update";
          pesan = changed ? "Data akan diperbarui" : "Sudah sama persis, tidak ada perubahan";
        } else {
          status = "baru";
        }
      }

      if (nim) seenNim.add(nim);

      return { nim, nama, angkatan, status, pesan };
    });

    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error("Gagal membaca berkas Excel mahasiswa:", error);
    return NextResponse.json({ error: "Gagal membaca berkas Excel: " + error.message }, { status: 500 });
  } finally {
    if (tempPath) {
      fs.unlink(tempPath, () => {});
    }
  }
}
