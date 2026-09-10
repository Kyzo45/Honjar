import ExcelJS from "exceljs";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatTanggal(tgl?: string): string {
  if (!tgl) return "";

  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;

  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function sortRows(rows: any[]) {
  return [...rows].sort((a, b) => {
    const left = `${a.dsn ?? ""}|${a.tgl ?? ""}|${a.a ?? ""}`.toLowerCase();
    const right = `${b.dsn ?? ""}|${b.tgl ?? ""}|${b.a ?? ""}`.toLowerCase();
    return left.localeCompare(right);
  });
}

function addHeaderCell(worksheet: ExcelJS.Worksheet, row: number, col: number, value: string) {
  const cell = worksheet.getCell(row, col);
  cell.value = value;
  cell.font = { name: "Times New Roman", size: 10, bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
  return cell;
}

export async function generateHonorExcel(payload: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Jam Mengajar", {
    properties: { tabColor: { argb: "FFB7B7B7" } },
  });

  const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
  const sortedRows = sortRows(rows);
  const monthName = String(payload?.monthName || "Semua Periode");
  const currentDate = String(payload?.currentDate || new Date().toISOString().slice(0, 10));

  worksheet.mergeCells("A1:J1");
  worksheet.getCell("A1").value = "REKAPITULASI JAM MENGAJAR";
  worksheet.getCell("A1").font = { name: "Times New Roman", size: 12, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:J2");
  worksheet.getCell("A2").value = `PERIODE ${monthName.toUpperCase()}`;
  worksheet.getCell("A2").font = { name: "Times New Roman", size: 10, bold: true };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  const headers = [
    "No",
    "Dosen",
    "Tanggal",
    "Mulai",
    "Selesai",
    "Durasi",
    "Jam",
    "Mata Kuliah",
    "Metode",
    "Kelas",
  ];

  headers.forEach((header, index) => {
    addHeaderCell(worksheet, 4, index + 1, header);
    worksheet.getColumn(index + 1).width = [8, 30, 16, 12, 12, 12, 10, 28, 18, 14][index] ?? 14;
  });

  let rowIndex = 5;
  let lastDosen: string | null = null;
  let noCounter = 0;

  sortedRows.forEach((row) => {
    const isNewDosen = row.dsn !== lastDosen;
    if (isNewDosen) {
      noCounter += 1;
      lastDosen = row.dsn;
    }

    if (isNewDosen) {
      worksheet.mergeCells(`A${rowIndex}:J${rowIndex}`);
      worksheet.getCell(rowIndex, 1).value = `${noCounter}. ${row.dsn}`;
      worksheet.getCell(rowIndex, 1).font = { name: "Times New Roman", size: 10, bold: true };
      worksheet.getCell(rowIndex, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFE699" },
      };
      worksheet.getCell(rowIndex, 1).alignment = { horizontal: "left", vertical: "middle" };
      rowIndex += 1;
    }

    const dateText = formatTanggal(row.tgl);
    const cells = [
      "",
      row.dsn || "",
      dateText,
      row.a || "",
      row.b || "",
      Number(row.mnt ?? 0),
      Number(row.jam ?? 0),
      row.mk || "",
      row.met || "",
      row.kls || "",
    ];

    cells.forEach((value, colIndex) => {
      const cell = worksheet.getCell(rowIndex, colIndex + 1);
      cell.value = value;
      cell.font = { name: "Times New Roman", size: 10 };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
      cell.alignment = { vertical: "middle", horizontal: colIndex === 1 ? "center" : colIndex >= 7 ? "left" : "center" };
    });

    worksheet.getCell(rowIndex, 2).alignment = { horizontal: "left" };
    worksheet.getCell(rowIndex, 8).alignment = { horizontal: "left" };
    worksheet.getCell(rowIndex, 9).alignment = { horizontal: "left" };
    rowIndex += 1;
  });

  const signatureRow = rowIndex + 2;
  worksheet.getCell(signatureRow, 8).value = `Cimahi, ${currentDate}`;
  worksheet.getCell(signatureRow, 8).font = { name: "Times New Roman", size: 10 };

  worksheet.getCell(signatureRow + 1, 8).value = "Ka. Prodi TLM D4";
  worksheet.getCell(signatureRow + 1, 8).font = { name: "Times New Roman", size: 10, bold: true };

  worksheet.getCell(signatureRow + 5, 8).value = "Gina Khairinisa, M.Imun";
  worksheet.getCell(signatureRow + 5, 8).font = { name: "Times New Roman", size: 10, bold: true };

  worksheet.getCell(signatureRow + 6, 8).value = "NID. 4121 282 88";
  worksheet.getCell(signatureRow + 6, 8).font = { name: "Times New Roman", size: 10 };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
