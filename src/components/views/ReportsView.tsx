"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { jamAjar, menit } from "@/lib/format";

type ReportKind = "courses" | "lecturers" | "attendance";

interface LecturerSummary {
  nama: string;
  sesi: number;
  jam: number;
  mataKuliah: Set<string>;
}

interface StudentSummary {
  nim: string;
  nama: string;
  kelas: string;
  kuliah: number;
  hadir: number;
  sakit: number;
  izin: number;
  tanpa: number;
}

const REPORTS: { id: ReportKind; label: string }[] = [
  { id: "courses", label: "Realisasi kuliah" },
  { id: "lecturers", label: "Beban dosen" },
  { id: "attendance", label: "Presensi mahasiswa" },
];

export default function ReportsView() {
  const { courses, showToast } = useApp();
  const [report, setReport] = useState<ReportKind>("courses");
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

  const courseRows = useMemo(() => filteredCourses.map((course) => {
    const sessions = course.rows.filter((row) => row.tipe === "kuliah");
    const filled = sessions.filter((row) => row.topik && row.kehadiran !== "batal");
    const canceled = sessions.filter((row) => row.kehadiran === "batal").length;
    const deviation = filled.filter((row) => {
      if (!row.tgl || !row.jam) return false;
      const day = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date(`${row.tgl}T00:00`).getDay()];
      return day !== course.hari || row.jam[0] !== course.jamMulai || row.jam[1] !== course.jamSelesai;
    }).length;
    return { course, terisi: filled.length, total: sessions.length, canceled, deviation };
  }).sort((a, b) => a.course.nama.localeCompare(b.course.nama) || a.course.kelas.localeCompare(b.course.kelas)), [filteredCourses]);

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

  const attendanceRows = useMemo(() => {
    const summaries = new Map<string, StudentSummary>();
    filteredCourses.forEach((course) => {
      const sessions = course.rows.filter((row) => row.tipe === "kuliah" && row.topik && row.kehadiran !== "batal");
      course.roster.forEach((student) => {
        const key = `${student.nim}:${course.kelas}`;
        const summary = summaries.get(key) ?? {
          nim: student.nim, nama: student.nama, kelas: course.kelas,
          kuliah: 0, hadir: 0, sakit: 0, izin: 0, tanpa: 0,
        };
        sessions.forEach((session) => {
          summary.kuliah += 1;
          const absent = session.tipe === "kuliah" ? session.absents?.find((item) => item.nim === student.nim) : undefined;
          if (absent) summary[absent.status] += 1;
          else summary.hadir += 1;
        });
        summaries.set(key, summary);
      });
    });
    return Array.from(summaries.values()).sort((a, b) => b.tanpa - a.tanpa || b.izin + b.sakit - a.izin - a.sakit || a.nama.localeCompare(b.nama));
  }, [filteredCourses]);

  const reportLabel = REPORTS.find((item) => item.id === report)?.label || "Laporan akademik";

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

  const renderReport = () => {
    if (report === "courses") {
      return (
        <table className="plain">
          <thead><tr><th>Mata kuliah</th><th>Kelas</th><th>Semester</th><th>Koordinator</th><th>Realisasi</th><th>Progres</th><th>Batal</th><th>Anomali jadwal</th></tr></thead>
          <tbody>{courseRows.map(({ course, terisi, total, canceled, deviation }) => (
            <tr key={course.id}>
              <td><b>{course.nama}</b><br /><span className="num" style={{ color: "var(--ink-3)", fontSize: 11 }}>{course.kode}</span></td>
              <td>{course.kelas}</td><td>{course.semester}</td><td>{course.koor}</td>
              <td className="num">{terisi}/{total}</td>
              <td><span className="num">{total ? Math.round(terisi / total * 100) : 0}%</span><div className="bar"><i style={{ width: `${total ? terisi / total * 100 : 0}%` }} /></div></td>
              <td>{canceled}</td><td>{deviation}</td>
            </tr>
          ))}{courseRows.length === 0 && <EmptyRow columns={8} />}</tbody>
        </table>
      );
    }

    if (report === "lecturers") {
      return (
        <table className="plain">
          <thead><tr><th>No</th><th>Dosen</th><th>Jumlah sesi</th><th>Total jam ajar</th><th>Mata kuliah diampu</th></tr></thead>
          <tbody>{lecturerRows.map((lecturer, index) => (
            <tr key={lecturer.nama}><td>{index + 1}</td><td><b>{lecturer.nama}</b></td><td className="num">{lecturer.sesi}</td><td className="num">{lecturer.jam}</td><td>{Array.from(lecturer.mataKuliah).join(", ")}</td></tr>
          ))}{lecturerRows.length === 0 && <EmptyRow columns={5} />}</tbody>
        </table>
      );
    }

    return (
      <table className="plain">
        <thead><tr><th>Mahasiswa</th><th>NIM</th><th>Kelas</th><th>Sesi tercatat</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Tanpa keterangan</th><th>Kehadiran</th></tr></thead>
        <tbody>{attendanceRows.map((student, index) => (
          <tr key={`${student.nim}-${student.kelas}-${index}`}>
            <td><b>{student.nama}</b></td><td className="num">{student.nim}</td><td>{student.kelas}</td><td className="num">{student.kuliah}</td>
            <td>{student.hadir}</td><td>{student.sakit}</td><td>{student.izin}</td><td>{student.tanpa}</td>
            <td className="num">{student.kuliah ? Math.round(student.hadir / student.kuliah * 100) : 0}%</td>
          </tr>
        ))}{attendanceRows.length === 0 && <EmptyRow columns={9} />}</tbody>
      </table>
    );
  };

  const totals = useMemo(() => ({
    classes: filteredCourses.length,
    sessions: courseRows.reduce((sum, row) => sum + row.terisi, 0),
    lecturers: lecturerRows.length,
    students: attendanceRows.length,
  }), [filteredCourses.length, courseRows, lecturerRows.length, attendanceRows.length]);

  return (
    <section className="view">
      <div className="cards">
        <div className="stat"><dt>Mata kuliah</dt><dd>{totals.classes}</dd></div>
        <div className="stat"><dt>Sesi terlaksana</dt><dd>{totals.sessions}</dd></div>
        <div className="stat"><dt>Dosen aktif</dt><dd>{totals.lecturers}</dd></div>
        <div className="stat"><dt>Mahasiswa terlapor</dt><dd>{totals.students}</dd></div>
      </div>
      <div className="panel academic-report-print">
        <div className="panel-h report-controls">
          <div className="report-tabs" role="tablist" aria-label="Jenis laporan">
            {REPORTS.map((item) => (
              <button key={item.id} className={`btn btn-sm ${report === item.id ? "btn-p" : ""}`} role="tab" aria-selected={report === item.id} onClick={() => setReport(item.id)}>{item.label}</button>
            ))}
          </div>
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
