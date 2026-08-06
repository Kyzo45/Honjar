"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import CourseFormModal from "@/components/CourseFormModal";

export default function MasterView() {
  const { courses, addCourse, lecturers, addLecturer } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [newLecName, setNewLecName] = useState("");

  const handleAddLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLecName.trim()) {
      addLecturer(newLecName.trim());
      setNewLecName("");
    }
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <h2>Mata kuliah dan penugasan</h2>
          <div className="right">
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
              {courses.map((m) => (
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
                  <td style={{ textAlign: "right" }}><button className="btn btn-sm">Ubah</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: "600px" }}>
        <div className="panel-h">
          <h2>Daftar Dosen Aktif</h2>
          <p>Dosen dalam daftar ini akan muncul sebagai pilihan pengajar saat PJ mengisi berita acara.</p>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <form onSubmit={handleAddLecturer} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Nama Lengkap Dosen beserta Gelar..."
              value={newLecName}
              onChange={(e) => setNewLecName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)"
              }}
            />
            <button type="submit" className="btn btn-p">＋ Tambah Dosen</button>
          </form>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {lecturers.map((lec) => (
              <span key={lec} className="tag t-done" style={{ padding: "6px 12px", fontSize: "12px" }}>
                {lec}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <CourseFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(input) => { addCourse(input); setShowForm(false); }}
        />
      )}
    </section>
  );
}
