import { NextResponse } from "next/server";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";

function formatDate(date: any): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;

  if (typeof date === "string" && date.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTglId(tglStr: string): string {
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  const day = d.getDate();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export async function POST(req: Request) {
  try {
    const { month, monthName } = await req.json();

    // 1. Ambil data mata kuliah dari database
    const { rows: dbCourses } = await pool.query("SELECT * FROM mata_kuliah");
    const rows: any[] = [];

    for (const c of dbCourses) {
      // Ambil pertemuan kuliah yang terisi
      const { rows: meetings } = await pool.query(
        "SELECT * FROM pertemuan WHERE mata_kuliah_id = $1 AND tipe = 'kuliah' AND topik IS NOT NULL AND kehadiran_dosen != 'batal' ORDER BY ke",
        [c.id]
      );

      for (const p of meetings) {
        const tglStr = formatDate(p.tanggal) || "";
        if (tglStr) {
          const parts = tglStr.split("-");
          const monthNum = parts[1]; // "02", "03", dll.
          if (month !== "all" && monthNum !== month) continue;
        }

        rows.push({
          dsn: p.dosen_pengajar || c.koordinator,
          tgl: tglStr,
          a: p.jam_mulai ? p.jam_mulai.slice(0, 5) : "",
          b: p.jam_selesai ? p.jam_selesai.slice(0, 5) : "",
          mnt: p.durasi_menit || 0,
          jam: p.jumlah_jam || 0,
          mk: c.nama,
          met: p.metode || c.tipe,
          kls: c.kelas
        });
      }
    }

    // Jika database kosong, fallback ke mock data agar ekspor tetap berfungsi untuk demo
    if (rows.length === 0) {
      const { buildInitialCourses } = require("@/lib/data");
      const mockCourses = buildInitialCourses();
      mockCourses.forEach((m: any) => {
        m.rows.forEach((r: any) => {
          if (r.tipe !== "kuliah" || !r.topik) return;
          if (r.kehadiran === "batal") return;
          if (r.tgl) {
            const parts = r.tgl.split("-");
            const monthNum = parts[1];
            if (month !== "all" && monthNum !== month) return;
          }
          rows.push({
            dsn: r.dosen,
            tgl: r.tgl,
            a: r.jam[0],
            b: r.jam[1],
            mnt: r.mnt || 100,
            jam: r.jamAjar || 2,
            mk: m.nama,
            met: r.metode,
            kls: m.kelas
          });
        });
      });
    }

    const payload = {
      monthName: monthName || "Semua Bulan",
      currentDate: formatTglId(new Date().toISOString().slice(0, 10)),
      rows: rows
    };

    // Jalankan skrip Python untuk menghasilkan berkas Excel
    const scriptPath = path.join(process.cwd(), "src", "lib", "generate_excel.py");
    
    const excelFile: string = await new Promise((resolve, reject) => {
      const pyProcess = execFile("python", [scriptPath], (error, stdout, stderr) => {
        if (error) {
          console.error("Python Exec Error:", stderr);
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
      
      pyProcess.stdin?.write(JSON.stringify(payload));
      pyProcess.stdin?.end();
    });

    if (!fs.existsSync(excelFile)) {
      throw new Error("Berkas Excel hasil generate tidak ditemukan di disk");
    }

    const fileBuffer = fs.readFileSync(excelFile);
    
    // Hapus temp file secara asinkronus setelah dibaca
    fs.unlink(excelFile, (err) => {
      if (err) console.error("Gagal menghapus temp excel file:", err);
    });

    const filename = `Rekap_Honor_Mengajar_${monthName.replace(/\s+/g, "_")}_2026.xlsx`;

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error("Gagal membuat Excel:", error);
    return NextResponse.json({ error: "Gagal membuat berkas Excel: " + error.message }, { status: 500 });
  }
}
