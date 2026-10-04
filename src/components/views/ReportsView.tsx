"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { jamAjar, menit } from "@/lib/format";

interface LecturerSummary {
  nama: string;
  sesi: number;
  jam: number;
  mataKuliah: Set<string>;
}

export default function ReportsView() {
  const { courses, showToast } = useApp();
  const [semester, setSemester] = useState("all");
  const [exporting, setExporting] = useState(false);

  const availableSemesters = useMemo(
    () => Array.from(new Set(courses.map((course) => course.semester))).sort((a, b) => a - b),
    [courses]
  );
  const filteredCourses = useMemo(
    () => semester === "all" ? courses : courses.filter((course) => course.semester === Number(semester)),
    [courses, semester]
  );

  const lecturerRows = useMemo(() => {
    const summaries = new Map<string, LecturerSummary>();
    filteredCourses.forEach((course) => course.rows.forEach((row) => {
      if (row.tipe !== "kuliah" || !row.topik || row.kehadiran === "batal" || !row.jam) return;
      const nama = row.dosen || course.koor;
      const summary = summaries.get(nama) ?? { nama, sesi: 0, jam: 0, mataKuliah: new Set<string>() };
      summary.sesi += 1;
      summary.jam += jamAjar(menit(row.jam[0], row.jam[1]));
      summary.mataKuliah.add(`${course.nama} · ${course.kelas}`);
      summaries.set(nama, summary);
    }));
    return Array.from(summaries.values()).sort((a, b) => b.jam - a.jam || a.nama.localeCompare(b.nama));
  }, [filteredCourses]);

  const reportLabel = "Beban dosen";

  const handleDownloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.querySelector(".academic-report-print");
      if (!element) throw new Error("Laporan tidak ditemukan");
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      clone.style.maxWidth = "none";
      clone.style.background = "#fff";
      clone.querySelectorAll(".report-controls").forEach((control) => control.remove());
      await html2pdf().set({
        margin: 10,
        filename: `${reportLabel.replace(/\\s+/g, "_")}_Semester_${semester === "all" ? "Semua" : semester}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(clone).save();
      showToast("success", `${reportLabel} berhasil diunduh sebagai PDF.`);
    } catch (error) {
      console.error("Gagal mengunduh laporan PDF:", error);
      showToast("error", "Gagal mengunduh laporan PDF.");
    } finally {
      setExporting(false);
    }
  };

  const renderReport = () => (
    <table className="plain">
      <thead><tr><th>No</th><th>Dosen</th><th>Jumlah sesi</th><th>Total jam ajar</th><th>Jumlah mata kuliah</th></tr></thead>
      <tbody>{lecturerRows.map((lecturer, index) => (
        <tr key={lecturer.nama}><td>{index + 1}</td><td><b>{lecturer.nama}</b></td><td className="num">{lecturer.sesi}</td><td className="num">{lecturer.jam}</td><td className="num">{lecturer.mataKuliah.size}</td></tr>
      ))}{lecturerRows.length === 0 && <EmptyRow columns={5} />}</tbody>
    </table>
  );

  const totals = useMemo(() => ({
    sessions: lecturerRows.reduce((sum, lecturer) => sum + lecturer.sesi, 0),
    hours: lecturerRows.reduce((sum, lecturer) => sum + lecturer.jam, 0),
  }), [lecturerRows]);

  return (
    <section className="view">
      <div className="cards">
        <div className="stat"><dt>Dosen aktif</dt><dd>{lecturerRows.length}</dd></div>
        <div className="stat"><dt>Total sesi</dt><dd>{totals.sessions}</dd></div>
        <div className="stat"><dt>Total jam ajar</dt><dd>{totals.hours}</dd></div>
      </div>
      <div className="panel academic-report-print">
        <div className="panel-h report-controls">
          <h2>{reportLabel}</h2>
          <div className="right">
            <select className="term" value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="Filter semester">
              <option value="all">Semua semester</option>
              {availableSemesters.map((value) => <option key={value} value={value}>Semester {value}</option>)}
            </select>
            <button className="btn btn-sm btn-p" onClick={handleDownloadPdf} disabled={exporting}>
              {exporting ? "Menyiapkan PDF..." : "Unduh PDF"}
            </button>
          </div>
          <p>{reportLabel} · {semester === "all" ? "Semua semester" : `Semester ${semester}`} · Tahun ajaran 2025/2026</p>
        </div>
        <div className="scroll">{renderReport()}</div>
      </div>
    </section>
  );
}

function EmptyRow({ columns }: { columns: number }) {
  return <tr><td colSpan={columns}><div className="empty-state"><b>Belum ada data untuk laporan ini</b>Catatan yang terisi akan dirangkum otomatis.</div></td></tr>;
}
