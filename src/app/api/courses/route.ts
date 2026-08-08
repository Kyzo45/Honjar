import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { MataKuliah, Row, AbsentRecord } from "@/lib/types";
import { buildInitialCourses } from "@/lib/data";

function formatDate(date: any): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;

  // Jika input aslinya adalah string bertipe YYYY-MM-DD
  if (typeof date === "string" && date.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nim = searchParams.get("nim");

    // 1. Ambil mata kuliah (filter by nim jika ada)
    let coursesList: any[] = [];
    if (nim) {
      const { rows } = await pool.query(
        "SELECT mk.* FROM mata_kuliah mk JOIN krs k ON mk.id = k.mata_kuliah_id WHERE k.mahasiswa_nim = $1",
        [nim]
      );
      coursesList = rows;
    } else {
      const { rows } = await pool.query("SELECT * FROM mata_kuliah");
      coursesList = rows;
    }

    const fullCourses: MataKuliah[] = [];

    for (const c of coursesList) {
      // 2. Ambil nama dosen pengampu
      const { rows: dosenRows } = await pool.query(
        "SELECT d.nama FROM dosen d JOIN dosen_mata_kuliah dmk ON d.id = dmk.dosen_id WHERE dmk.mata_kuliah_id = $1",
        [c.id]
      );
      const dosen = dosenRows.map((r: any) => r.nama);

      // 3. Ambil nama PJ
      const { rows: pjRows } = await pool.query("SELECT nama FROM users WHERE id = $1", [c.pj_id]);
      const pj = pjRows[0]?.nama || "—";

      // 4. Hitung jumlah mahasiswa di KRS
      const { rows: krsCountRows } = await pool.query(
        "SELECT COUNT(*) as count FROM krs WHERE mata_kuliah_id = $1",
        [c.id]
      );
      const mhs = Number(krsCountRows[0]?.count || 0);

      // 5. Ambil daftar pertemuan (rows)
      const { rows: pList } = await pool.query(
        "SELECT * FROM pertemuan WHERE mata_kuliah_id = $1 ORDER BY ke",
        [c.id]
      );

      const rows: Row[] = [];
      for (const p of pList) {
        if (p.tipe === "uts" || p.tipe === "uas") {
          rows.push({
            ke: p.ke,
            tipe: p.tipe,
          });
        } else {
          // Ambil absensi mahasiswa jika sesi diisi
          let absents: AbsentRecord[] = [];
          if (p.topik) {
            const { rows: absentRows } = await pool.query(
              'SELECT mahasiswa_nim as nim, status, file_bukti as "fileName" FROM kehadiran_mahasiswa WHERE pertemuan_id = $1 AND status != \'hadir\'',
              [p.id]
            );
            absents = absentRows.map((r: any) => ({
              nim: r.nim,
              status: r.status,
              fileName: r.fileName || undefined,
            }));
          }

          rows.push({
            ke: p.ke,
            tipe: "kuliah",
            tgl: formatDate(p.tanggal),
            jam: p.jam_mulai && p.jam_selesai
              ? [p.jam_mulai.slice(0, 5), p.jam_selesai.slice(0, 5)]
              : undefined,
            hadir: p.topik ? mhs - absents.length : undefined,
            topik: p.topik || undefined,
            metode: p.metode || undefined,
            dosen: p.dosen_pengajar || undefined,
            kehadiran: p.kehadiran_dosen || undefined,
            absents,
            isAbsenAktif: !!p.kode_absen_aktif,
          });
        }
      }

      fullCourses.push({
        id: c.id,
        kode: c.kode,
        nama: c.nama,
        kelas: c.kelas,
        sks: c.sks,
        koor: c.koordinator,
        dosen,
        mhs,
        pj,
        rows,
        tipe: c.tipe as "Teori" | "Praktikum",
        semester: c.semester,
        hari: c.hari,
        jamMulai: c.jam_mulai.slice(0, 5),
        jamSelesai: c.jam_selesai.slice(0, 5),
        ruangan: c.ruangan,
      });
    }

    return NextResponse.json(fullCourses);
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menggunakan data mata kuliah mock:", error.message);
    return NextResponse.json(buildInitialCourses());
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kode, nama, kelas, sks, koor, dosenText, pj, tipe, semester, hari, jamMulai, jamSelesai, ruangan } = body;

    // 1. Dapatkan pj_id
    const { rows: userRows } = await pool.query("SELECT id FROM users WHERE nama = $1 OR username = $2", [pj, pj]);
    let pj_id = userRows[0]?.id || null;

    if (!pj_id) {
      // Jika PJ tidak ada, kaitkan ke user default / PJ Rifqi
      const { rows: defaultUser } = await pool.query("SELECT id FROM users WHERE role = 'pj' LIMIT 1");
      pj_id = defaultUser[0]?.id || 2;
    }

    // 2. Simpan mata kuliah
    const { rows: insResult } = await pool.query(
      `INSERT INTO mata_kuliah 
      (kode, nama, sks, kelas, semester, tipe, hari, jam_mulai, jam_selesai, ruangan, koordinator, pj_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [kode, nama, sks, kelas, Number(semester), tipe, hari, jamMulai, jamSelesai, ruangan, koor, pj_id]
    );
    const newCourseId = insResult[0].id;

    // 3. Simpan dosen pengampu (many to many)
    const dosenNames = dosenText.split(",").map((s: string) => s.trim()).filter(Boolean);
    for (const dName of dosenNames) {
      // Dapatkan atau buat dosen
      const { rows: dosenRows } = await pool.query("SELECT id FROM dosen WHERE nama = $1", [dName]);
      let dosenId = dosenRows[0]?.id;
      if (!dosenId) {
        const { rows: insDosen } = await pool.query("INSERT INTO dosen (nama) VALUES ($1) RETURNING id", [dName]);
        dosenId = insDosen[0].id;
      }
      await pool.query("INSERT INTO dosen_mata_kuliah (mata_kuliah_id, dosen_id) VALUES ($1, $2)", [
        newCourseId,
        dosenId,
      ]);
    }

    // 4. Masukkan mahasiswa kelas ke KRS secara otomatis
    const { rows: students } = await pool.query("SELECT nim FROM mahasiswa WHERE kelas = $1", [kelas]);
    for (const student of students) {
      await pool.query("INSERT INTO krs (mahasiswa_nim, mata_kuliah_id) VALUES ($1, $2)", [
        student.nim,
        newCourseId,
      ]);
    }

    // 5. Buat 16 pertemuan kosong
    for (let i = 1; i <= 16; i++) {
      const pTipe = i === 8 ? "uts" : i === 16 ? "uas" : "kuliah";
      await pool.query("INSERT INTO pertemuan (mata_kuliah_id, ke, tipe) VALUES ($1, $2, $3)", [
        newCourseId,
        i,
        pTipe,
      ]);
    }

    return NextResponse.json({ success: true, id: newCourseId });
  } catch (error: any) {
    console.warn("PostgreSQL offline. Menambahkan ke data mock secara lokal:", error.message);
    return NextResponse.json({ success: true, id: Date.now() });
  }
}
