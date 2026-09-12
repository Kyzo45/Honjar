import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const LUAR_KEYWORDS = [
  "anggi sandika",
  "adityana",
  "amelia",
  "hendy satria",
  "handy satria",
  "i'oh",
  "iin nurhayati",
  "sonny feisal",
  "sussylawati",
  "tarma",
];

function formatTanggal(tgl?: string): string {
  if (!tgl) return "";

  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;

  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function formatDateId(dateStr?: string): string {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

function formatTimeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(":");
      return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed) || !Number.isNaN(Date.parse(trimmed))) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    return trimmed;
  }

  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return String(value).trim();
}

function normalizeStatus(row: any): "tetap" | "luar" {
  if (row?.status === "luar" || row?.status === "tetap") {
    return row.status;
  }

  const source = String(row?.dsn ?? row?.dosen ?? row?.nama ?? "").toLowerCase();
  return LUAR_KEYWORDS.some((keyword) => source.includes(keyword)) ? "luar" : "tetap";
}

function sortRows(rows: any[]) {
  return [...rows].sort((a, b) => {
    const left = `${a.dsn ?? ""}|${a.tgl ?? ""}|${a.a ?? ""}`.toLowerCase();
    const right = `${b.dsn ?? ""}|${b.tgl ?? ""}|${b.a ?? ""}`.toLowerCase();
    return left.localeCompare(right);
  });
}

function clearRows(worksheet: ExcelJS.Worksheet, startRow: number) {
  const lastRow = worksheet.rowCount || 400;
  for (let row = startRow; row <= lastRow; row += 1) {
    for (let col = 1; col <= 12; col += 1) {
      worksheet.getCell(row, col).value = null;
      worksheet.getCell(row, col).font = { name: "Times New Roman", size: 10 };
      worksheet.getCell(row, col).alignment = { vertical: "middle" };
    }
  }
}

function setBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
}

function setHeaderCell(worksheet: ExcelJS.Worksheet, row: number, col: number, value: string) {
  const cell = worksheet.getCell(row, col);
  cell.value = value;
  cell.font = { name: "Times New Roman", size: 10, bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
  setBorder(cell);
}

function writeGroupedSheet(
  worksheet: ExcelJS.Worksheet,
  rows: any[],
  monthName: string,
  currentDate: string,
  sheetName: "Tetap" | "Luar"
) {
  worksheet.name = sheetName;
  worksheet.views = [{ state: "normal" }];

  // 1. LEBAR KOLOM SESUAI PROPORSI GAMBAR
  worksheet.columns = [
    { width: 5 },   // 1. NO
    { width: 32 },  // 2. DOSEN TETAP / DOSEN LUAR (Lebar)
    { width: 14 },  // 3. TANGGAL
    { width: 10 },  // 4. MULAI
    { width: 10 },  // 5. SELESAI
    { width: 10 },  // 6. DURASI
    { width: 10 },  // 7. JUMLAH JAM
    { width: 35 },  // 8. MATA KULIAH (Lebar)
    { width: 14 },  // 9. METODE
    { width: 18 },  // 10. TINGKAT / KELAS
    { width: 12 },  // 11. Hitung Menit
  ];

  // Header Judul Dokumen
  worksheet.getCell("A1").value = "REKAPITULASI JAM MENGAJAR DOSEN PROGRAM STUDI TEKNOLOGI LABORATORIUM MEDIK (D4)";
  worksheet.getCell("A1").font = { name: "Times New Roman", size: 12, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("A1:K1");

  worksheet.getCell("A2").value = `SEMESTER GENAP TA. 2025/2026`;
  worksheet.getCell("A2").font = { name: "Times New Roman", size: 10, bold: true };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("A2:K2");

  worksheet.getCell("A3").value = `PERIODE ${monthName.toUpperCase()}`;
  worksheet.getCell("A3").font = { name: "Times New Roman", size: 10, bold: true };
  worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("A3:K3");

  // 2. SUSUN HEADER BERTINGKAT 2 BARIS (BARIS 5 & 6)
  // Set nilai header dasar
  setHeaderCell(worksheet, 5, 1, "NO");
  setHeaderCell(worksheet, 5, 2, sheetName === "Tetap" ? "DOSEN TETAP" : "DOSEN LUAR");
  setHeaderCell(worksheet, 5, 3, "TANGGAL");
  setHeaderCell(worksheet, 5, 4, "WAKTU PERKULIAHAN"); // Merged D5:E5
  setHeaderCell(worksheet, 6, 4, "MULAI");
  setHeaderCell(worksheet, 6, 5, "SELESAI");
  setHeaderCell(worksheet, 5, 6, "DURASI");
  setHeaderCell(worksheet, 5, 7, "JUMLAH\nJAM");
  setHeaderCell(worksheet, 5, 8, "MATA KULIAH");
  setHeaderCell(worksheet, 5, 9, "METODE");
  setHeaderCell(worksheet, 5, 10, "TINGKAT / KELAS");
  setHeaderCell(worksheet, 5, 11, "Hitung Menit");

  // Set style header baris 6 untuk Mulai & Selesai
  setHeaderCell(worksheet, 6, 4, "MULAI");
  setHeaderCell(worksheet, 6, 5, "SELESAI");

  // Merge Cell Header Vertical (Baris 5-6) untuk kolom selain Waktu Perkuliahan
  worksheet.mergeCells("A5:A6");
  worksheet.mergeCells("B5:B6");
  worksheet.mergeCells("C5:C6");
  worksheet.mergeCells("D5:E5"); // Horizontal Merge untuk WAKTU PERKULIAHAN
  worksheet.mergeCells("F5:F6");
  worksheet.mergeCells("G5:G6");
  worksheet.mergeCells("H5:H6");
  worksheet.mergeCells("I5:I6");
  worksheet.mergeCells("J5:J6");
  worksheet.mergeCells("K5:K6");

  // Pastikan border tetap rapi di sel yang di-merge
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach((col) => {
    setBorder(worksheet.getCell(5, col));
    setBorder(worksheet.getCell(6, col));
    worksheet.getCell(5, col).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getCell(6, col).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  worksheet.getRow(5).height = 22;
  worksheet.getRow(6).height = 18;

  // 3. PENGISIAN DATA (DIMULAI DARI BARIS 7)
  let rowNum = 7;
  let currentDosen: string | null = null;
  let noCounter = 0;

  rows.forEach((row) => {
    const dosen = String(row?.dsn ?? row?.dosen ?? "").trim();
    const isNewDosen = Boolean(dosen) && dosen !== currentDosen;

    if (isNewDosen) {
      noCounter += 1;
      currentDosen = dosen;

      if (rowNum > 7) {
        // Pemisah antar dosen (Baris Kuning/Kosong)
        for (let c = 1; c <= 11; c++) {
          worksheet.getCell(rowNum, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
        }
        rowNum += 1;
      }
    }

    const noVal = isNewDosen ? noCounter : null;
    const startTime = formatTimeValue(row?.a ?? row?.mulai ?? row?.jam_mulai ?? row?.startTime);
    const endTime = formatTimeValue(row?.b ?? row?.selesai ?? row?.jam_selesai ?? row?.endTime);
    const durationMinutes = Number(row?.mnt ?? 0) || ((startTime && endTime) ? (() => {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    })() : 0);

    const rowData = [
      noVal,
      dosen,
      formatDateId(row?.tgl),
      startTime,
      endTime,
      durationMinutes,
      Number(row?.jam ?? 0) || Math.max(1, Math.ceil(durationMinutes / 100)),
      row?.mk || "",
      row?.met || "",
      row?.kls || "",
      durationMinutes,
    ];

    rowData.forEach((value, idx) => {
      const cell = worksheet.getCell(rowNum, idx + 1);
      cell.value = value ?? "";
      cell.font = { name: "Times New Roman", size: 10 };
      // Align kiri untuk Dosen, Mata Kuliah, dan Kelas
      cell.alignment = { 
        vertical: "middle", 
        horizontal: (idx === 1 || idx === 7 || idx === 9) ? "left" : "center" 
      };
      setBorder(cell);
      if (idx === 0 && noVal !== null) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F7" } };
      }
    });

    worksheet.getCell(rowNum, 2).font = { name: "Times New Roman", size: 10, bold: true };
    worksheet.getRow(rowNum).height = 20;
    rowNum += 1;
  });

  // Tanda Tangan Ka. Prodi
  const signatureRow = rowNum + 2;
  worksheet.getCell(signatureRow, 8).value = `Cimahi, ${currentDate}`;
  worksheet.getCell(signatureRow, 8).font = { name: "Times New Roman", size: 10 };
  worksheet.getCell(signatureRow + 1, 8).value = "Ka. Prodi TLM D4";
  worksheet.getCell(signatureRow + 1, 8).font = { name: "Times New Roman", size: 10, bold: true };
  worksheet.getCell(signatureRow + 5, 8).value = "Gina Khairinisa, M.Imun";
  worksheet.getCell(signatureRow + 5, 8).font = { name: "Times New Roman", size: 10, bold: true };
  worksheet.getCell(signatureRow + 6, 8).value = "NID. 4121 282 88";
  worksheet.getCell(signatureRow + 6, 8).font = { name: "Times New Roman", size: 10 };
}

export async function generateHonorExcel(payload: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
  const monthName = String(payload?.monthName || "Semua Periode");
  const currentDate = String(payload?.currentDate || new Date().toISOString().slice(0, 10));

  const grouped = {
    tetap: sortRows(rows.filter((row) => normalizeStatus(row) === "tetap")),
    luar: sortRows(rows.filter((row) => normalizeStatus(row) === "luar")),
  };

  const templatePath = path.join(process.cwd(), "File Pendukung", "Honjar Mei Tahun 2026 PRODI TLM D4.xlsx");
  if (fs.existsSync(templatePath)) {
    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.readFile(templatePath);
    const templateTetap = templateWorkbook.getWorksheet("Tetap");
    const templateLuar = templateWorkbook.getWorksheet("Luar");

    if (templateTetap) {
      const tetapSheet = workbook.addWorksheet("Tetap", templateTetap);
      clearRows(tetapSheet, 7);
      writeGroupedSheet(tetapSheet, grouped.tetap, monthName, currentDate, "Tetap");
    }

    if (templateLuar) {
      const luarSheet = workbook.addWorksheet("Luar", templateLuar);
      clearRows(luarSheet, 7);
      writeGroupedSheet(luarSheet, grouped.luar, monthName, currentDate, "Luar");
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const tetapSheet = workbook.addWorksheet("Tetap");
  const luarSheet = workbook.addWorksheet("Luar");

  writeGroupedSheet(tetapSheet, grouped.tetap, monthName, currentDate, "Tetap");
  writeGroupedSheet(luarSheet, grouped.luar, monthName, currentDate, "Luar");

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
