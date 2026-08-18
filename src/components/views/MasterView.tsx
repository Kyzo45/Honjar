"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import CourseFormModal from "@/components/CourseFormModal";
import type { MataKuliah } from "@/lib/types";

export default function MasterView() {
  const { courses, addCourse, updateCourse, deleteCourse, semesterFilter } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<MataKuliah | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
        m.pj.toLowerCase().includes(q) ||
        m.dosen.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [courses, query, semesterFilter]);

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
          <h2>Mata kuliah dan penugasan</h2>
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
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>Tambah mata kuliah</button>
          </div>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Mata kuliah</th>
                <th>Tipe</th>
                <th>SKS</th>
                <th>Smtr</th>
                <th>Kelas</th>
                <th>Jadwal</th>
                <th>Koordinator</th>
                <th>Dosen</th>
                <th>Penanggung Jawab</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((m) => (
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
                    <button className="btn btn-sm" onClick={() => setEditingCourse(m)}>Ubah</button>{" "}
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
              {filteredCourses.length === 0 && (
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
          key={editingCourse.id}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSubmit={(input) => updateCourse(editingCourse.id, input)}
        />
      )}
    </section>
  );
}
