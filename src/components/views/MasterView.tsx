"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import CourseFormModal from "@/components/CourseFormModal";

export default function MasterView() {
  const { courses, addCourse } = useApp();
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="view">
      <div className="panel">
        <div className="panel-h">
          <h2>Mata kuliah dan penugasan</h2>
          <div className="right">
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>Tambah mata kuliah</button>
          </div>
        </div>
        <table className="plain">
          <thead>
            <tr>
              <th>Kode</th><th>Mata kuliah</th><th>SKS</th><th>Kelas</th>
              <th>Koordinator</th><th>Pengampu</th><th>Penanggung Jawab</th><th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((m) => (
              <tr key={m.id}>
                <td className="num">{m.kode}</td>
                <td><b>{m.nama}</b></td>
                <td>{m.sks}</td>
                <td>{m.kelas}</td>
                <td>{m.koor}</td>
                <td style={{ color: "var(--ink-2)" }}>
                  {m.dosen.map((d, i) => <span key={d}>{i > 0 && <br />}{d}</span>)}
                </td>
                <td>{m.pj}</td>
                <td style={{ textAlign: "right" }}><button className="btn btn-sm">Ubah</button></td>
              </tr>
            ))}
          </tbody>
        </table>
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
