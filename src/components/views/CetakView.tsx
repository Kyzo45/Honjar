"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { fmtTgl } from "@/lib/format";

interface CoursePageProps {
  m: any;
}

function CoursePage({ m }: CoursePageProps) {
  return (
    <div className="page">
      <div className="page-kop">
        <img src="/logo-yayasan.jpeg" alt="Logo Yayasan" className="page-kop-logo" />
        <div className="page-kop-text">
          <b>YAYASAN KARTIKA EKA PAKSI</b>
          <b style={{ color: "var(--ink)", fontSize: "11px", fontWeight: "700" }}>UNIVERSITAS JENDERAL ACHMAD YANI (UNJANI)</b>
          <b>FAKULTAS ILMU DAN TEKNOLOGI KESEHATAN (FITKes)</b>
          <b>PROGRAM STUDI TEKNOLOGI LABORATORIUM MEDIS (D4)</b>
          <span>Kampus: Jl. Terusan Jenderal Sudirman-Cimahi Tlp.(022 ) 6631622–6631623</span>
        </div>
        <img src="/logo-unjani.png" alt="Logo Unjani" className="page-kop-logo" />
      </div>
      <h4 style={{ margin: "14px 0 10px", fontWeight: "700" }}>Berita Acara Kuliah</h4>
      <div className="page-meta">
        <div>
          <b>Mata kuliah</b> : {m.nama} ({m.tipe})<br />
          <b>Jadwal</b> : {m.hari}, {m.jamMulai}–{m.jamSelesai} ({m.ruangan})<br />
          <b>Koordinator</b> : {m.koor}
        </div>
        <div>
          <b>Tingkat / semester</b> : {m.kelas} / Semester {m.semester}<br />
          <b>Semester / T.A.</b> : Genap 2025/2026<br />
          <b>Dosen</b> : {m.dosen.join(" · ")}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 22 }}>Ke</th>
            <th style={{ width: 74 }}>Hari, tanggal</th>
            <th style={{ width: 70 }}>Jam</th>
            <th style={{ width: 40 }}>Hadir</th>
            <th>Pokok bahasan</th>
            <th style={{ width: 96 }}>Dosen</th>
            <th style={{ width: 40 }}>Hadir</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r: any) => {
            if (r.tipe !== "kuliah") {
              return (
                <tr key={r.ke}>
                  <td colSpan={7} style={{ textAlign: "center", letterSpacing: ".2em", background: "#F2F0EA", fontWeight: "600" }}>
                    {r.tipe.toUpperCase()}
                  </td>
                </tr>
              );
            }
            if (!r.topik) {
              return (
                <tr key={r.ke} style={{ height: "22px" }}>
                  <td>{r.ke}</td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              );
            }
            return (
              <tr key={r.ke}>
                <td>{r.ke}</td>
                <td>{fmtTgl(r.tgl!)}</td>
                <td>{r.jam![0]}–{r.jam![1]}</td>
                <td>{r.hadir}</td>
                <td>
                  {r.topik}
                  <br />
                  <i style={{ color: "#6B7488", fontSize: "8.5px" }}>{r.metode}</i>
                </td>
                <td>{r.dosen}</td>
                <td className="cek">✓</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CetakView() {
  const { courses } = useApp();
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || 1);
  const [printAll, setPrintAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const m = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleExportSingle = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.querySelector(".pdfbox");
      if (!element) return;
      
      const pageElement = element.querySelector(".page");
      if (!pageElement) return;

      const clone = pageElement.cloneNode(true) as HTMLElement;
      clone.style.boxShadow = "none";
      clone.style.margin = "0";
      clone.style.maxWidth = "100%";
      clone.style.width = "100%";
      clone.style.minWidth = "initial";
      clone.style.padding = "0";

      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `Berita_Acara_${m.nama.replace(/\s+/g, "_")}_Kelas_${m.kelas}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error("Gagal mengunduh PDF:", err);
      alert("Gagal mengunduh PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (exporting) return;
    setExporting(true);
    setPrintAll(true);
    
    // Tunggu React me-render semua halaman
    setTimeout(async () => {
      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const element = document.querySelector(".pdfbox");
        if (!element) return;
        
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.background = "none";
        clone.style.padding = "0";
        clone.style.boxShadow = "none";

        const pages = clone.querySelectorAll(".page");
        pages.forEach((p: any) => {
          p.style.boxShadow = "none";
          p.style.margin = "0";
          p.style.maxWidth = "100%";
          p.style.width = "100%";
          p.style.minWidth = "initial";
          p.style.padding = "0";
          p.style.pageBreakAfter = "always";
          p.style.breakAfter = "page";
        });

        const opt = {
          margin:       [15, 15, 15, 15],
          filename:     `Berita_Acara_Semua_Kelas.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2.2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: ['css', 'legacy'] }
        };

        await html2pdf().set(opt).from(clone).save();
      } catch (err) {
        console.error("Gagal mengunduh semua PDF:", err);
        alert("Gagal mengunduh semua PDF");
      } finally {
        setPrintAll(false);
        setExporting(false);
      }
    }, 400);
  };

  if (!m) {
    return (
      <section className="view">
        <div className="panel">
          <div className="panel-h">
            <h2>Pratinjau berita acara</h2>
          </div>
          <div className="empty-state">
            <b>Tidak ada data kelas</b>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <div className="panel">
        <div className="panel-h">
          <h2>Pratinjau berita acara</h2>
          <div className="right">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
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
              disabled={exporting}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.kelas} — {c.nama} ({c.tipe})
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={handleExportAll} disabled={exporting}>
              {exporting && printAll ? "Mengunduh..." : "Unduh semua kelas"}
            </button>
            <button className="btn btn-sm btn-p" onClick={handleExportSingle} disabled={exporting}>
              {exporting && !printAll ? "Mengunduh..." : "Unduh PDF"}
            </button>
          </div>
          <p>Kolom tanda tangan diganti kolom kehadiran dosen, sesuai kesepakatan dengan program studi.</p>
        </div>
        <div className="pdfbox">
          {printAll ? (
            courses.map((c) => <CoursePage key={c.id} m={c} />)
          ) : (
            <CoursePage m={m} />
          )}
        </div>
      </div>
    </section>
  );
}
