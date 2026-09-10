"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { MataKuliah } from "@/lib/types";

function courseIsi(m: MataKuliah): number {
  return m.rows.filter((r) => r.tipe === "kuliah" && r.topik).length;
}

function CourseCard({ m }: { m: MataKuliah }) {
  const { selectCourse } = useApp();
  const isi = courseIsi(m);
  const status = isi >= 14 ? "t-done" : isi > 0 ? "t-wait" : "t-none";
  const label = isi >= 14 ? "Lengkap" : isi > 0 ? "Berjalan" : "Kosong";
  const typeStatus = m.tipe === "Teori" ? "t-stamp" : "t-wait";

  return (
    <button className="mk" onClick={() => selectCourse(m.id)}>
      <div className="mk-top">
        <div>
          <h3>{m.nama}</h3>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
            <span className="kode">{m.kode} · {m.sks} · Kelas {m.kelas}</span>
            <span className={`tag ${typeStatus}`} style={{ transform: "scale(0.85)", transformOrigin: "left" }}>{m.tipe}</span>
          </div>
        </div>
        <span className={`tag ${status}`}>{label}</span>
      </div>
      <p className="who" style={{ margin: "6px 0 2px" }}>
        <b>Dosen Koor: {m.koor}</b>
        <br />
        Dosen: {m.dosen.join(" · ")}
      </p>
      <div className="sched" style={{ fontSize: "12px", color: "var(--ink-2)", display: "flex", flexWrap: "wrap", gap: "10px", margin: "6px 0" }}>
        <span>📅 {m.hari}, {m.jamMulai}–{m.jamSelesai}</span>
        <span>📍 {m.ruangan}</span>
      </div>
      <div className="strip" style={{ margin: "8px 0" }}>
        {m.rows.map((r) =>
          r.tipe !== "kuliah" ? (
            <i key={r.ke} className="e" title="Ujian" />
          ) : r.topik ? (
            <i key={r.ke} className="f" />
          ) : (
            <i key={r.ke} />
          )
        )}
      </div>
      <div className="mk-foot">
        <span><span className="num">{isi}</span>/14 pertemuan</span>
        <span className="kode">Semester {m.semester}</span>
      </div>
    </button>
  );
}

export default function MkView() {
  const { courses, semesterFilter, role } = useApp();
  const total = courses.reduce((sum, m) => sum + courseIsi(m), 0);
  const totalSks = courses.reduce((sum, m) => sum + (parseInt(m.sks) || 0), 0);
  const belumDiisi = courses.reduce(
    (sum, m) => sum + m.rows.filter((r) => r.tipe === "kuliah" && !r.topik).length,
    0
  );
  const [query, setQuery] = useState("");

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((m) => {
      if (semesterFilter !== "all" && m.semester !== semesterFilter) return false;
      if (!q) return true;
      return (
        m.kode.toLowerCase().includes(q) ||
        m.nama.toLowerCase().includes(q) ||
        m.kelas.toLowerCase().includes(q) ||
        m.koor.toLowerCase().includes(q) ||
        m.dosen.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [courses, query, semesterFilter]);

  // Kumpulkan detail kelas yang belum terisi untuk banner PJ
  const tunggakanPJ = useMemo(() => {
    if (role !== "pj") return [];
    return courses
      .map((m) => {
        const unfilled = m.rows.filter((r) => r.tipe === "kuliah" && !r.topik).length;
        return unfilled > 0 ? { nama: m.nama, kelas: m.kelas, unfilled } : null;
      })
      .filter(Boolean) as { nama: string; kelas: string; unfilled: number }[];
  }, [courses, role]);

  return (
    <section className="view">
      {/* Banner pengingat berita acara — hanya tampil untuk PJ yang memiliki tunggakan */}
      {role === "pj" && tunggakanPJ.length > 0 && (
        <div style={{
          background: "color-mix(in srgb, var(--amber) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
          borderRadius: "var(--r)",
          padding: "14px 18px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "20px", lineHeight: 1.3 }}>⚠️</span>
          <div>
            <b style={{ color: "var(--ink-1)", fontSize: "14px" }}>
              Anda memiliki {tunggakanPJ.reduce((s, t) => s + t.unfilled, 0)} pertemuan yang belum diisi berita acaranya:
            </b>
            <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "13px", color: "var(--ink-2)" }}>
              {tunggakanPJ.map((t) => (
                <li key={t.nama + t.kelas}>
                  {t.nama} <span style={{ color: "var(--ink-3)" }}>(Kelas {t.kelas})</span>{" "}
                  — <b style={{ color: "var(--rose)" }}>{t.unfilled} pertemuan</b>
                </li>
              ))}
            </ul>
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--ink-3)" }}>
              Batas pengisian maksimal 1 bulan setelah tanggal perkuliahan. Klik kartu mata kuliah untuk mengisi.
            </p>
          </div>
        </div>
      )}

      <div className="cards">
        <div className="stat"><dt>Pertemuan tercatat</dt><dd>{total}<small>/{courses.length * 14}</small></dd></div>
        <div className="stat"><dt>Pertemuan belum diisi</dt><dd>{belumDiisi}</dd></div>
        <div className="stat"><dt>Total SKS diampu</dt><dd>{totalSks}<small> SKS</small></dd></div>
        <div className="stat"><dt>Batas input mundur</dt><dd>7<small> hari</small></dd></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Kelas yang Anda pegang</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Cari kode, nama, kelas, dosen..."
          style={{
            padding: "6px 10px",
            fontSize: "12.5px",
            borderRadius: "var(--r)",
            border: "1px solid var(--rule)",
            background: "var(--paper)",
            minWidth: "220px"
          }}
        />
      </div>
      <div className="grid-mk">
        {filteredCourses.map((m) => (
          <CourseCard key={m.id} m={m} />
        ))}
        {filteredCourses.length === 0 && (
          <p style={{ color: "var(--ink-3)", padding: "24px 0" }}>
            {courses.length === 0
              ? "Belum ada mata kuliah."
              : query
                ? `Tidak ada mata kuliah yang cocok dengan "${query}".`
                : "Tidak ada mata kuliah pada semester ini."}
          </p>
        )}
      </div>
    </section>
  );
}
