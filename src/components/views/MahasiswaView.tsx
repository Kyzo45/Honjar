"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import MahasiswaFormModal from "@/components/MahasiswaFormModal";
import MahasiswaImportModal from "@/components/MahasiswaImportModal";
import type { Mahasiswa } from "@/lib/types";

export default function MahasiswaView() {
  const { mahasiswaList, addMahasiswa, updateMahasiswa, deleteMahasiswa } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingMhs, setEditingMhs] = useState<Mahasiswa | null>(null);
  const [deletingNim, setDeletingNim] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mahasiswaList;
    return mahasiswaList.filter(
      (m) => m.nim.toLowerCase().includes(q) || m.nama.toLowerCase().includes(q) || (m.angkatan || "").includes(q)
    );
  }, [mahasiswaList, query]);

  const handleDelete = async (m: Mahasiswa) => {
    if (!confirm(`Hapus mahasiswa "${m.nama}" (NIM ${m.nim})? Data ini akan lepas dari semua mata kuliah yang diikutinya.`)) return;
    setDeletingNim(m.nim);
    await deleteMahasiswa(m.nim);
    setDeletingNim(null);
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <h2>Data mahasiswa</h2>
          <p>Data induk mahasiswa aktif. Kepesertaan tiap mata kuliah diatur lewat menu Daftar Kelas, bukan di sini — satu mahasiswa bisa mengikuti banyak mata kuliah sekaligus.</p>
          <div className="right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Cari NIM, nama, atau angkatan..."
              style={{
                padding: "6px 10px",
                fontSize: "12.5px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                minWidth: "220px"
              }}
            />
            <button className="btn btn-sm" onClick={() => setShowImport(true)}>⇪ Unggah Excel</button>
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>＋ Tambah mahasiswa</button>
          </div>
        </div>

        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>NIM</th>
                <th>Nama Mahasiswa</th>
                <th>Angkatan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.nim}>
                  <td className="num">{m.nim}</td>
                  <td><b>{m.nama}</b></td>
                  <td>{m.angkatan || "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm" onClick={() => setEditingMhs(m)}>Ubah</button>{" "}
                    <button
                      className="btn btn-sm"
                      style={{ color: "var(--rose)" }}
                      disabled={deletingNim === m.nim}
                      onClick={() => handleDelete(m)}
                    >
                      {deletingNim === m.nim ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
                    {mahasiswaList.length === 0 ? "Belum ada data mahasiswa." : `Tidak ada mahasiswa yang cocok dengan pencarian.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <MahasiswaFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(input) => addMahasiswa(input)}
        />
      )}

      {editingMhs && (
        <MahasiswaFormModal
          mahasiswa={editingMhs}
          onClose={() => setEditingMhs(null)}
          onSubmit={(input) => updateMahasiswa(editingMhs.nim, input)}
        />
      )}

      {showImport && <MahasiswaImportModal onClose={() => setShowImport(false)} />}
    </section>
  );
}
