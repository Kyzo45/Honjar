import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

interface CourseExportRow {
  kode: string;
  nama: string;
  tipe: string;
  sks: string;
  semester: number;
  kelas: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
  koor: string;
  dosen: string[];
  pj: string;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const semester = payload?.semester === "all" ? "all" : Number(payload?.semester);
    const courses: CourseExportRow[] = Array.isArray(payload?.courses)
      ? payload.courses.slice(0, 2000).map((course: Record<string, unknown>) => ({
          kode: text(course.kode),
          nama: text(course.nama),
          tipe: text(course.tipe),
          sks: text(course.sks),
          semester: Number(course.semester) || 0,
          kelas: text(course.kelas),
          hari: text(course.hari),
          jamMulai: text(course.jamMulai),
          jamSelesai: text(course.jamSelesai),
          ruangan: text(course.ruangan),
          koor: text(course.koor),
          dosen: Array.isArray(course.dosen) ? course.dosen.map(text).filter(Boolean) : [],
          pj: text(course.pj),
        }))
      : [];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HONJAR UNJANI";
    workbook.subject = "Daftar mata kuliah dan penugasan";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Mata Kuliah", {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.columns = [
      { header: "Kode", key: "kode", width: 14 },
      { header: "Mata Kuliah", key: "nama", width: 34 },
      { header: "Tipe", key: "tipe", width: 14 },
      { header: "SKS", key: "sks", width: 12 },
      { header: "Semester", key: "semester", width: 11 },
      { header: "Kelas", key: "kelas", width: 12 },
      { header: "Jadwal", key: "jadwal", width: 32 },
      { header: "Koordinator", key: "koor", width: 26 },
      { header: "Dosen Pengampu", key: "dosen", width: 34 },
      { header: "Penanggung Jawab", key: "pj", width: 30 },
    ];

    for (let rowNumber = 1; rowNumber <= 5; rowNumber += 1) {
      sheet.mergeCells(`B${rowNumber}:I${rowNumber}`);
      const cell = sheet.getCell(`B${rowNumber}`);
      cell.value = [
        "YAYASAN KARTIKA EKA PAKSI",
        "UNIVERSITAS JENDERAL ACHMAD YANI (UNJANI)",
        "FAKULTAS ILMU DAN TEKNOLOGI KESEHATAN (FITKes)",
        "PROGRAM STUDI TEKNOLOGI LABORATORIUM MEDIS (D4)",
        "Kampus: Jl. Terusan Jenderal Sudirman-Cimahi Tlp.(022) 6631622-6631623",
      ][rowNumber - 1];
      cell.font = { name: "Times New Roman", size: rowNumber === 2 ? 12 : 10, bold: rowNumber < 5 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(rowNumber).height = rowNumber === 5 ? 20 : 18;
    }

    const [yayasanLogo, unjaniLogo] = await Promise.all([
      readFile(path.join(process.cwd(), "public", "logo-yayasan.jpeg")),
      readFile(path.join(process.cwd(), "public", "logo-unjani.png")),
    ]);
    const yayasanImageId = workbook.addImage({
      base64: `data:image/jpeg;base64,${yayasanLogo.toString("base64")}`,
      extension: "jpeg",
    });
    const unjaniImageId = workbook.addImage({
      base64: `data:image/png;base64,${unjaniLogo.toString("base64")}`,
      extension: "png",
    });
    sheet.addImage(yayasanImageId, { tl: { col: 0.15, row: 0.25 }, ext: { width: 56, height: 56 } });
    sheet.addImage(unjaniImageId, { tl: { col: 9.15, row: 0.25 }, ext: { width: 56, height: 56 } });

    sheet.mergeCells("A7:J7");
    sheet.getCell("A7").value = "DAFTAR MATA KULIAH DAN PENUGASAN";
    sheet.getCell("A7").font = { name: "Times New Roman", size: 13, bold: true };
    sheet.getCell("A7").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(7).height = 24;

    sheet.mergeCells("A8:J8");
    sheet.getCell("A8").value = `Semester: ${semester === "all" || !Number.isFinite(semester) ? "Semua Semester" : `Semester ${semester}`}    |    Tahun Ajaran: 2026/2027`;
    sheet.getCell("A8").font = { name: "Times New Roman", size: 10 };
    sheet.getCell("A8").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells("A9:J9");
    sheet.getCell("A9").value = `Dicetak: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date())}`;
    sheet.getCell("A9").font = { name: "Times New Roman", size: 9, italic: true };
    sheet.getCell("A9").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(9).height = 20;

    const headerRow = sheet.getRow(11);
    headerRow.values = ["Kode", "Mata Kuliah", "Tipe", "SKS", "Semester", "Kelas", "Jadwal", "Koordinator", "Dosen Pengampu", "Penanggung Jawab"];
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECE8" } };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    });

    courses.forEach((course) => {
      const row = sheet.addRow({
        kode: course.kode,
        nama: course.nama,
        tipe: course.tipe,
        sks: course.sks,
        semester: course.semester,
        kelas: course.kelas,
        jadwal: `${course.hari}, ${course.jamMulai}-${course.jamSelesai} (${course.ruangan})`,
        koor: course.koor,
        dosen: course.dosen.join("\n"),
        pj: course.pj,
      });
      row.eachCell((cell) => {
        cell.font = { name: "Times New Roman", size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" },
        };
      });
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.height = 30;
    });

    sheet.autoFilter = { from: "A11", to: "J11" };
    sheet.views = [{ state: "frozen", ySplit: 11 }];
    sheet.pageSetup.printArea = `A1:J${Math.max(11, sheet.rowCount)}`;
    sheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Daftar_Mata_Kuliah_Semester_${semester === "all" || !Number.isFinite(semester) ? "Semua" : semester}.xlsx`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Gagal membuat daftar mata kuliah Excel:", error);
    return Response.json({ error: "Gagal membuat berkas Excel." }, { status: 500 });
  }
}