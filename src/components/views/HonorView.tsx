"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { fmtTgl, jamAjar, menit } from "@/lib/format";

interface HonorRow {
  dsn: string; tgl: string; a: string; b: string;
  mnt: number; jam: number; mk: string; met: string; kls: string;
}

// 12 bulan lepas dari tahun — tahunnya dipilih terpisah lewat dropdown Tahun,
// jadi tidak perlu menambah daftar baru tiap ganti tahun ajaran.
const MONTHS: { value: string; label: string }[] = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];
const MONTH_LABEL: Record<string, string> = Object.fromEntries(MONTHS.map((m) => [m.value, m.label]));

export default function HonorView() {
  const { courses, showToast } = useApp();
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [exportingPdf, setExportingPdf] = useState(false);

  // Tahun yang tersedia dihitung dari tanggal pertemuan yang benar-benar ada di
  // data, bukan daftar tetap — otomatis mengikuti tahun ajaran berjalan, dan
  // tahun sekarang selalu ikut disertakan meski belum ada pertemuan terisi.
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    courses.forEach((m) => m.rows.forEach((r) => {
      if (r.tipe === "kuliah" && r.tgl) years.add(r.tgl.slice(0, 4));
    }));
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [courses]);

  const periodeLabel = useMemo(() => {
    const bulan = selectedMonth === "all" ? "Semua Bulan" : MONTH_LABEL[selectedMonth];
    const tahun = selectedYear === "all" ? "Semua Tahun" : selectedYear;
    if (selectedMonth === "all" && selectedYear === "all") return "Semua Periode";
    return `${bulan} ${tahun}`;
  }, [selectedMonth, selectedYear]);

  const rows: HonorRow[] = [];
  courses.forEach((m) => {
    m.rows.forEach((r) => {
      if (r.tipe !== "kuliah" || !r.topik) return;
      if (r.kehadiran === "batal") return;
      if (r.tgl) {
        const [year, monthNum] = r.tgl.split("-");
        if (selectedYear !== "all" && year !== selectedYear) return;
        if (selectedMonth !== "all" && monthNum !== selectedMonth) return;
      }
      const mnt = menit(r.jam![0], r.jam![1]);
      rows.push({
        dsn: r.dosen!, tgl: r.tgl!, a: r.jam![0], b: r.jam![1],
        mnt, jam: jamAjar(mnt), mk: m.nama, met: r.metode!, kls: m.kelas,
      });
    });
  });
  rows.sort((x, y) => x.dsn.localeCompare(y.dsn) || x.tgl.localeCompare(y.tgl) || x.a.localeCompare(y.a));

  const grouped = new Map<string, HonorRow[]>();
  rows.forEach((r) => {
    const list = grouped.get(r.dsn) ?? [];
    list.push(r);
    grouped.set(r.dsn, list);
  });

  let no = 0, jamTot = 0;
  const body: React.ReactNode[] = [];
  grouped.forEach((sub, dsn) => {
    no++;
    const totalJam = sub.reduce((sum, item) => sum + item.jam, 0);
    body.push(
      <tr className="group" key={`g-${dsn}`}>
        <td colSpan={10}>
          {no}. {dsn}
          <span>{sub.length} sesi · {totalJam} jam</span>
        </td>
      </tr>
    );

    sub.forEach((r, index) => {
      jamTot += r.jam;
      body.push(
        <tr key={`${dsn}-${index}`}>
          <td></td>
          <td>{r.dsn}</td>
          <td className="num" style={{ fontSize: 12.5 }}>{fmtTgl(r.tgl).split(", ")[1]}</td>
          <td className="num">{r.a}</td>
          <td className="num">{r.b}</td>
          <td className="num">{r.mnt}</td>
          <td className="num"><b>{r.jam}</b></td>
          <td>{r.mk}</td>
          <td>{r.met}</td>
          <td className="num">{r.kls}</td>
        </tr>
      );
    });
  });

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch("/api/honor/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          monthName: periodeLabel
        })
      });
      if (!res.ok) throw new Error("Gagal mengunduh berkas");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      link.setAttribute("download", `Rekap_Honor_Mengajar_${periodeLabel.replace(/\s+/g, "_")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("success", "Rekap honor berhasil diunduh.");
    } catch (err) {
      console.error("Gagal mengunduh rekap honor Excel:", err);
      showToast("error", "Gagal mengunduh rekap honor Excel.");
    }
  };

  const handleDownloadPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const report = document.querySelector(".honor-report-print");
      if (!report) throw new Error("Laporan tidak ditemukan");
      const clone = report.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      clone.style.maxWidth = "none";
      clone.style.background = "#fff";
      clone.querySelectorAll(".report-actions").forEach((element) => element.remove());
      await html2pdf().set({
        margin: 10,
        filename: `Rekap_Honor_Mengajar_${periodeLabel.replace(/\\s+/g, "_")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(clone).save();
      showToast("success", "Rekap honor PDF berhasil diunduh.");
    } catch (err) {
      console.error("Gagal mengunduh rekap honor PDF:", err);
      showToast("error", "Gagal mengunduh rekap honor PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section className="view honor-report-print">
      <div className="cards">
        <div className="stat"><dt>Periode</dt><dd style={{ fontSize: 18 }}>{periodeLabel}</dd></div>
        <div className="stat"><dt>Dosen tercatat</dt><dd>{no}</dd></div>
        <div className="stat"><dt>Total sesi</dt><dd>{rows.length}</dd></div>
        <div className="stat"><dt>Total jam</dt><dd>{jamTot}</dd></div>
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Rekapitulasi jam mengajar</h2>
          <div className="right">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "var(--ink)",
                marginRight: "8px"
              }}
            >
              <option value="all">Semua Bulan</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "var(--ink)"
              }}
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="report-actions" style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" onClick={handleDownloadPdf} disabled={exportingPdf}>
                {exportingPdf ? "Menyiapkan PDF..." : "Unduh PDF"}
              </button>
              <button className="btn btn-sm btn-p" onClick={handleDownloadExcel}>Unduh XLSX</button>
            </div>
          </div>
          <p>Disusun dari berita acara yang sudah diisi. Tidak ada angka yang diketik ulang di halaman ini.</p>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>No</th><th>Dosen</th><th>Tanggal</th><th>Mulai</th><th>Selesai</th>
                <th>Durasi</th><th>Jam</th><th>Mata kuliah</th><th>Metode</th><th>Kelas</th>
              </tr>
            </thead>
            <tbody>
              {body.length ? body : (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <b>Belum ada pertemuan pada periode ini</b>
                      Rekap terbentuk otomatis setelah PJ mengisi berita acara.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
