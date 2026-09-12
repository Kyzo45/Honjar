import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import pool from "@/lib/db";
import type { ImportMahasiswaRow, ImportRowStatus } from "@/lib/types";

const normalizeHeader = (value: unknown) => String(value ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();

const cellToText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const findHeaderRow = (sheet: ExcelJS.Worksheet) => {
  const maxScan = Math.min(30, sheet.rowCount || 0);
  for (let row = 1; row <= maxScan; row += 1) {
    for (let col = 1; col <= sheet.columnCount; col += 1) {
      if (normalizeHeader(sheet.getCell(row, col).value) === "nim") {
        return row;
      }
    }
  }
  return null;
};

const buildColumnMap = (sheet: ExcelJS.Worksheet, headerRow: number) => {
  const map: Record<string, number> = {};
  for (let col = 1; col <= sheet.columnCount; col += 1) {
    const header = normalizeHeader(sheet.getCell(headerRow, col).value);
    if (header === "nim") map.nim = col;
    else if (header === "nama" || header === "namamahasiswa") map.nama = col;
    else if (["angkatan", "angk", "angg", "thangkatan"].includes(header)) map.angkatan = col;
  }
  return map;
};

const parseStudentRowsFromWorkbook = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Berkas Excel kosong atau tidak valid");
  }

  const headerRow = findHeaderRow(sheet);
  if (!headerRow) {
    throw new Error("Kolom NIM tidak ditemukan di berkas ini. Pastikan ada kolom berjudul 'NIM'.");
  }

  const colMap = buildColumnMap(sheet, headerRow);
  if (!colMap.nim) {
    throw new Error("Kolom NIM tidak ditemukan di berkas ini.");
  }

  const rows: { nim: string; nama: string; angkatan: string }[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) {
    const nim = cellToText(sheet.getCell(row, colMap.nim).value);
    const nama = colMap.nama ? cellToText(sheet.getCell(row, colMap.nama).value) : "";
    const angkatan = colMap.angkatan ? cellToText(sheet.getCell(row, colMap.angkatan).value) : "";

    if (!nim && !nama) continue;
    rows.push({ nim: nim.trim(), nama: nama.trim(), angkatan: angkatan.trim() });
  }

  return rows;
};

// Menerima file Excel (multipart/form-data, field "file"), mem-parsing lewat
// ExcelJS di Node.js, lalu mengembalikan preview baris tanpa menulis apapun ke
// database — konfirmasi baru dilakukan lewat /api/mahasiswa/import-commit, atau
// (dari form mata kuliah) langsung disertakan ke payload simpan mata kuliah.
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Berkas Excel tidak ditemukan" }, { status: 400 });
    }

    const rawRows = await parseStudentRowsFromWorkbook(file);
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
  }
}
