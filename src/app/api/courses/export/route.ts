import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ACADEMIC_CONFIG } from "@/config/academic";

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
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
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
    workbook.subject = "Daftar Mata Kuliah dan Penugasan Dosen";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Mata Kuliah", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    });

    // PENTING: Jangan gunakan properti `header` di sheet.columns karena ExcelJS
    // akan otomatis menulisnya di baris 1 (menabrak area Kop Surat).
    sheet.columns = [
      { key: "no", width: 6 },
      { key: "kode", width: 14 },
      { key: "nama", width: 36 },
      { key: "tipe", width: 12 },
      { key: "sks", width: 10 },
      { key: "semester", width: 11 },
      { key: "kelas", width: 10 },
      { key: "jadwal", width: 32 },
      { key: "koor", width: 26 },
      { key: "dosen", width: 36 },
      { key: "pj", width: 26 },
    ];

    // Teks Kop Surat Lembaga (Dimerge penuh A s.d. K agar benar-benar berada di tengah dokumen secara simetris)
    const kopLines = [
      { text: ACADEMIC_CONFIG.institusi.yayasan, size: 11, bold: true },
      { text: ACADEMIC_CONFIG.institusi.universitas, size: 13, bold: true },
      { text: ACADEMIC_CONFIG.institusi.fakultas, size: 11, bold: true },
      { text: ACADEMIC_CONFIG.institusi.prodi, size: 11, bold: true },
      { text: ACADEMIC_CONFIG.institusi.alamat, size: 9.5, bold: false },
    ];

    kopLines.forEach((item, index) => {
      const rowNumber = index + 1;
      sheet.mergeCells(`A${rowNumber}:K${rowNumber}`);
      const cell = sheet.getCell(`A${rowNumber}`);
      cell.value = item.text;
      cell.font = { name: "Times New Roman", size: item.size, bold: item.bold, color: { argb: "FF000000" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
      sheet.getRow(rowNumber).height = rowNumber === 2 ? 22 : 18;
    });

    // Penyisipan Logo Resmi (Yayasan & Unjani) dengan posisi simetris kiri & kanan
    try {
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

      // Total tinggi baris 1-5 adalah ~94pt. Logo 62x62px diposisikan pas di tengah vertikal.
      // Logo kiri di awal Kolom A, logo kanan di akhir Kolom K (sejajar batas tabel kanan).
      sheet.addImage(yayasanImageId, { tl: { col: 0.12, row: 0.35 }, ext: { width: 62, height: 62 } });
      sheet.addImage(unjaniImageId, { tl: { col: 10.6, row: 0.35 }, ext: { width: 62, height: 62 } });
    } catch (logoErr) {
      console.warn("Logo tidak ditemukan untuk ekspor Excel, melanjutkan tanpa logo:", logoErr);
    }

    // Baris 6: Garis pemisah ganda kop surat resmi (diberikan ke seluruh kolom A s.d. K)
    sheet.mergeCells("A6:K6");
    sheet.getRow(6).height = 5;
    for (let c = 1; c <= 11; c++) {
      sheet.getCell(6, c).border = {
        bottom: { style: "double", color: { argb: "FF000000" } },
      };
    }

    // Baris 7: Spasi pemisah setelah kop
    sheet.getRow(7).height = 10;

    // Baris 8: Judul Dokumen
    sheet.mergeCells("A8:K8");
    const titleCell = sheet.getCell("A8");
    titleCell.value = "DAFTAR MATA KULIAH DAN PENUGASAN DOSEN";
    titleCell.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF16233D" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(8).height = 24;

    // Baris 9: Subjudul Semester & Tahun Ajaran
    const semesterDisplay =
      semester === "all" || !Number.isFinite(semester) ? "Semua Semester" : `Semester ${semester}`;
    sheet.mergeCells("A9:K9");
    const subCell = sheet.getCell("A9");
    subCell.value = `Semester: ${semesterDisplay}    |    Tahun Ajaran: ${ACADEMIC_CONFIG.tahunAjaran}`;
    subCell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FF334155" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(9).height = 18;

    // Baris 10: Metadata Tanggal Unduh & Jumlah Data
    const formattedDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
    sheet.mergeCells("A10:K10");
    const metaCell = sheet.getCell("A10");
    metaCell.value = `Dicetak pada: ${formattedDate}    |    Total: ${courses.length} Mata Kuliah Terdata`;
    metaCell.font = { name: "Times New Roman", size: 9, italic: true, color: { argb: "FF64748B" } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(10).height = 18;

    // Baris 11: Spasi pemisah sebelum tabel
    sheet.getRow(11).height = 8;

    // Baris 12: Header Tabel Data
    const headerRow = sheet.getRow(12);
    headerRow.values = [
      "No",
      "Kode",
      "Mata Kuliah",
      "Tipe",
      "SKS",
      "Semester",
      "Kelas",
      "Jadwal & Ruangan",
      "Koordinator",
      "Dosen Pengampu",
      "Penanggung Jawab",
    ];
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A34" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1F3A34" } },
        left: { style: "thin", color: { argb: "FF1F3A34" } },
        bottom: { style: "medium", color: { argb: "FF0F231E" } },
        right: { style: "thin", color: { argb: "FF1F3A34" } },
      };
    });

    // Baris 12+: Isi Data Mata Kuliah
    courses.forEach((c, idx) => {
      const dosenList = c.dosen.length ? c.dosen : [c.koor || "—"];
      const calcHeight = Math.max(26, dosenList.length * 16 + 8);

      const row = sheet.addRow({
        no: idx + 1,
        kode: c.kode,
        nama: c.nama,
        tipe: c.tipe,
        sks: c.sks,
        semester: c.semester,
        kelas: c.kelas,
        jadwal: `${c.hari}, ${c.jamMulai}–${c.jamSelesai}\nRuang: ${c.ruangan || "—"}`,
        koor: c.koor || "—",
        dosen: dosenList.join("\n"),
        pj: c.pj || "—",
      });
      row.height = calcHeight;

      const isEven = idx % 2 === 1;
      const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF";

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Times New Roman", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };

        // Format perataan sel (center untuk kolom kode, tipe, sks, sem, kelas, no)
        if ([1, 2, 4, 5, 6, 7].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        }

        // Cetak tebal pada kolom penting (Kode, Nama, Kelas)
        if (colNumber === 2 || colNumber === 3 || colNumber === 7) {
          cell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FF0F172A" } };
        }
      });
    });

    // Baris Ringkasan Total di Bawah Tabel
    if (courses.length > 0) {
      const totalRowNumber = sheet.rowCount + 1;
      sheet.mergeCells(`A${totalRowNumber}:D${totalRowNumber}`);
      sheet.mergeCells(`H${totalRowNumber}:K${totalRowNumber}`);

      const totalRow = sheet.getRow(totalRowNumber);
      totalRow.height = 24;
      totalRow.getCell(1).value = `TOTAL: ${courses.length} MATA KULIAH`;

      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FF1E293B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF475569" } },
          bottom: { style: "double", color: { argb: "FF475569" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        cell.alignment = { vertical: "middle" };
      });
      totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    }

    // Blok Pengesahan / Tanda Tangan
    const signStartRow = sheet.rowCount + 3;
    const signCol = 9; // Kolom I s.d. K
    sheet.mergeCells(signStartRow, signCol, signStartRow, 11);
    sheet.getCell(signStartRow, signCol).value = `${ACADEMIC_CONFIG.institusi.kota}, ${formattedDate}`;
    sheet.getCell(signStartRow, signCol).font = { name: "Times New Roman", size: 10 };
    sheet.getCell(signStartRow, signCol).alignment = { horizontal: "center" };

    sheet.mergeCells(signStartRow + 1, signCol, signStartRow + 1, 11);
    sheet.getCell(signStartRow + 1, signCol).value = "Mengetahui,";
    sheet.getCell(signStartRow + 1, signCol).font = { name: "Times New Roman", size: 10 };
    sheet.getCell(signStartRow + 1, signCol).alignment = { horizontal: "center" };

    sheet.mergeCells(signStartRow + 2, signCol, signStartRow + 2, 11);
    sheet.getCell(signStartRow + 2, signCol).value = ACADEMIC_CONFIG.pejabat.jabatan;
    sheet.getCell(signStartRow + 2, signCol).font = { name: "Times New Roman", size: 10, bold: true };
    sheet.getCell(signStartRow + 2, signCol).alignment = { horizontal: "center" };

    sheet.mergeCells(signStartRow + 6, signCol, signStartRow + 6, 11);
    sheet.getCell(signStartRow + 6, signCol).value = ACADEMIC_CONFIG.pejabat.nama
      ? `(${ACADEMIC_CONFIG.pejabat.nama})`
      : "(___________________________________)";
    sheet.getCell(signStartRow + 6, signCol).font = { name: "Times New Roman", size: 10, bold: true };
    sheet.getCell(signStartRow + 6, signCol).alignment = { horizontal: "center" };

    sheet.autoFilter = { from: "A12", to: "K12" };

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
