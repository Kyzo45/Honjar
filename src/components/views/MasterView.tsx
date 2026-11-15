"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import CourseFormModal from "@/components/CourseFormModal";
import type { MataKuliah } from "@/lib/types";

const DAY_ORDER: Record<string, number> = {
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
  Minggu: 7,
};

type SortField = "semester" | "nama" | "kode" | "tipe" | "sks" | "kelas" | "hari" | "koor" | "pj";
type SortOrder = "asc" | "desc";

export default function MasterView() {
  const { courses, addCourse, updateCourse, deleteCourse, semesterFilter, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<MataKuliah | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("semester");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch("/api/courses/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: semesterFilter === "all" ? "all" : semesterFilter,
          courses: sortedCourses.map((course) => ({
            kode: course.kode,
            nama: course.nama,
            tipe: course.tipe,
            sks: course.sks,
            semester: course.semester,
            kelas: course.kelas,
            hari: course.hari,
            jamMulai: course.jamMulai,
            jamSelesai: course.jamSelesai,
            ruangan: course.ruangan,
            koor: course.koor,
            dosen: course.dosen,
            pj: course.pj,
          })),
        }),
      });
      if (!response.ok) throw new Error("Gagal membuat laporan Excel");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Daftar_Mata_Kuliah_Semester_${semesterFilter === "all" ? "Semua" : semesterFilter}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("success", "Daftar mata kuliah berhasil diunduh.");
    } catch (error) {
      console.error("Gagal mengunduh daftar mata kuliah Excel:", error);
      showToast("error", "Gagal mengunduh daftar mata kuliah Excel.");
    } finally {
      setExporting(false);
    }
  };

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
        m.pj.toLowerCase().includes(q) ||
        m.dosen.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [courses, query, semesterFilter]);

  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "semester":
          cmp = a.semester - b.semester;
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          if (cmp === 0) cmp = a.kelas.localeCompare(b.kelas);
          if (cmp === 0) cmp = (a.tipe === "Teori" ? 0 : 1) - (b.tipe === "Teori" ? 0 : 1);
          break;
        case "nama":
          cmp = a.nama.localeCompare(b.nama);
          if (cmp === 0) cmp = a.semester - b.semester;
          if (cmp === 0) cmp = a.kelas.localeCompare(b.kelas);
          if (cmp === 0) cmp = (a.tipe === "Teori" ? 0 : 1) - (b.tipe === "Teori" ? 0 : 1);
          break;
        case "kode":
          cmp = a.kode.localeCompare(b.kode);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          if (cmp === 0) cmp = a.kelas.localeCompare(b.kelas);
          break;
        case "tipe":
          cmp = (a.tipe === "Teori" ? 0 : 1) - (b.tipe === "Teori" ? 0 : 1);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          if (cmp === 0) cmp = a.kelas.localeCompare(b.kelas);
          break;
        case "sks":
          cmp = (Number(a.sks) || 0) - (Number(b.sks) || 0);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          break;
        case "kelas":
          cmp = a.kelas.localeCompare(b.kelas);
          if (cmp === 0) cmp = a.semester - b.semester;
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          break;
        case "hari":
          const dayA = DAY_ORDER[a.hari] || 99;
          const dayB = DAY_ORDER[b.hari] || 99;
          cmp = dayA - dayB;
          if (cmp === 0) cmp = a.jamMulai.localeCompare(b.jamMulai);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          break;
        case "koor":
          cmp = a.koor.localeCompare(b.koor);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          break;
        case "pj":
          cmp = a.pj.localeCompare(b.pj);
          if (cmp === 0) cmp = a.nama.localeCompare(b.nama);
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredCourses, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderHeader = (field: SortField, label: string, style?: React.CSSProperties) => {
    const isActive = sortField === field;
    return (
      <th
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", ...style }}
        onClick={() => handleSort(field)}
        title={`Klik untuk mengurutkan berdasarkan ${label} (${isActive && sortOrder === "asc" ? "menurun" : "menaik"})`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {label}
          <span style={{ fontSize: "11px", color: isActive ? "var(--ink-1)" : "var(--ink-4)", fontWeight: isActive ? "bold" : "normal" }}>
            {isActive ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        </span>
      </th>
    );
  };

  const handleDuplicate = (m: MataKuliah) => {
    setIsDuplicating(true);
    setEditingCourse(m);
  };

  const handleDelete = async (m: MataKuliah) => {
    if (!confirm(`Hapus mata kuliah "${m.nama}" (${m.kode} · Kelas ${m.kelas})? Seluruh berita acara dan data terkait akan ikut terhapus.`)) return;
    setDeletingId(m.id);
    await deleteCourse(m.id);
    setDeletingId(null);
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <div>
            <h2>
              Mata kuliah dan penugasan{" "}
              <span style={{ fontSize: "13px", fontWeight: "normal", color: "var(--ink-3)" }}>
                ({sortedCourses.length} kelas)
              </span>
            </h2>
            {(sortField !== "semester" || sortOrder !== "asc") && (
              <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--ink-3)" }}>
                Diurutkan berdasarkan <b>{sortField}</b> ({sortOrder === "asc" ? "A-Z / naik" : "Z-A / turun"}) ·{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSortField("semester");
                    setSortOrder("asc");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "11.5px",
                    padding: 0,
                  }}
                >
                  Reset ke urutan standar (Semester · Nama · Kelas)
                </button>
              </p>
            )}
          </div>
          <div className="right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
            <button className="btn btn-sm" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? "Menyiapkan..." : "Unduh Excel"}
            </button>
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>Tambah mata kuliah</button>
          </div>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                {renderHeader("kode", "Kode")}
                {renderHeader("nama", "Mata kuliah")}
                {renderHeader("tipe", "Tipe")}
                {renderHeader("sks", "SKS")}
                {renderHeader("semester", "Smtr", { textAlign: "center" })}
                {renderHeader("kelas", "Kelas")}
                {renderHeader("hari", "Jadwal")}
                {renderHeader("koor", "Koordinator")}
                <th>Dosen</th>
                {renderHeader("pj", "Penanggung Jawab")}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedCourses.map((m) => (
                <tr key={m.id}>
                  <td className="num">{m.kode}</td>
                  <td><b>{m.nama}</b></td>
                  <td><span className={`tag ${m.tipe === "Teori" ? "t-stamp" : "t-wait"}`} style={{ fontSize: "10.5px" }}>{m.tipe}</span></td>
                  <td className="num">{m.sks}</td>
                  <td className="num" style={{ textAlign: "center" }}>{m.semester}</td>
                  <td>{m.kelas}</td>
                  <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                    <b>{m.hari}</b><br />
                    {m.jamMulai}–{m.jamSelesai}<br />
                    <span style={{ color: "var(--ink-3)" }}>📍 {m.ruangan}</span>
                  </td>
                  <td>{m.koor}</td>
                  <td style={{ color: "var(--ink-2)", fontSize: "12px" }}>
                    {m.dosen.map((d, i) => <span key={d}>{i > 0 && <br />}{d}</span>)}
                  </td>
                  <td>{m.pj}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      className="btn btn-sm"
                      title="Salin dan buat kelas atau tipe baru dari mata kuliah ini"
                      onClick={() => handleDuplicate(m)}
                    >
                      Duplikat
                    </button>{" "}
                    <button className="btn btn-sm" onClick={() => { setIsDuplicating(false); setEditingCourse(m); }}>Ubah</button>{" "}
                    <button
                      className="btn btn-sm"
                      style={{ color: "var(--rose)" }}
                      disabled={deletingId === m.id}
                      onClick={() => handleDelete(m)}
                    >
                      {deletingId === m.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
              {sortedCourses.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
                    {courses.length === 0
                      ? "Belum ada mata kuliah."
                      : query
                        ? `Tidak ada mata kuliah yang cocok dengan "${query}".`
                        : "Tidak ada mata kuliah pada semester ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <CourseFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(input) => addCourse(input)}
        />
      )}

      {editingCourse && (
        <CourseFormModal
          key={`${editingCourse.id}-${isDuplicating ? "dup" : "edit"}`}
          course={editingCourse}
          isDuplicate={isDuplicating}
          onClose={() => {
            setEditingCourse(null);
            setIsDuplicating(false);
          }}
          onSubmit={(input) => {
            if (isDuplicating) {
              return addCourse(input);
            }
            return updateCourse(editingCourse.id, input);
          }}
        />
      )}
    </section>
  );
}
