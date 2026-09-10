import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateHonorExcel } from "@/lib/generateExcel";

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
    const { month, year, monthName } = await req.json();

    // 1. Peta nama dosen -> status (tetap/luar), sumber kebenaran untuk pemisahan sheet
    const { rows: dosenRows } = await pool.query("SELECT nama, status_dosen FROM dosen");
    const statusByName = new Map<string, string>(dosenRows.map((d: any) => [d.nama, d.status_dosen]));

    // 2. Ambil data mata kuliah dari database
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
          const [yearNum, monthNum] = tglStr.split("-");
          if (year && year !== "all" && yearNum !== year) continue;
          if (month !== "all" && monthNum !== month) continue;
        }

        const dosenNama = p.dosen_pengajar || c.koordinator;
        rows.push({
          dsn: dosenNama,
          status: statusByName.get(dosenNama) || "tetap",
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
            const [yearNum, monthNum] = r.tgl.split("-");
            if (year && year !== "all" && yearNum !== year) return;
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

    const fileBuffer = await generateHonorExcel(payload);
    const filename = `Rekap_Honor_Mengajar_${(monthName || "Semua_Periode").replace(/\s+/g, "_")}.xlsx`;
    const uint8 = new Uint8Array(fileBuffer);

    return new Response(uint8, {
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
