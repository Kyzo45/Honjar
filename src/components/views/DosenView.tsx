"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import DosenFormModal from "@/components/DosenFormModal";
import type { Dosen } from "@/lib/types";

export default function DosenView() {
  const { dosenList, addDosen, updateDosen, deleteDosen } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingDosen, setEditingDosen] = useState<Dosen | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const filteredDosen = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dosenList;
    return dosenList.filter(
      (d) =>
        d.nid.toLowerCase().includes(q) ||
        d.nama.toLowerCase().includes(q) ||
        (d.status === "tetap" ? "dosen tetap" : "dosen luar").includes(q)
    );
  }, [dosenList, query]);

  const handleDelete = async (d: Dosen) => {
    if (!confirm(`Hapus dosen "${d.nama}" (NID ${d.nid})? Penugasan dosen ini pada mata kuliah akan ikut terhapus.`)) return;
    setDeletingId(d.id);
    await deleteDosen(d.id);
    setDeletingId(null);
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <h2>Daftar dosen</h2>
          <p>Data induk dosen pengajar. NID adalah kunci utama sehingga dosen dengan penulisan nama yang mirip tidak tercatat ganda.</p>
          <div className="right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Cari NID atau nama dosen..."
              style={{
                padding: "6px 10px",
                fontSize: "12.5px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                minWidth: "220px"
              }}
            />
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>＋ Tambah dosen</button>
          </div>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>NID</th>
                <th>Nama dosen</th>
                <th>Status Dosen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDosen.map((d) => (
                <tr key={d.id}>
                  <td className="num">{d.nid}</td>
                  <td><b>{d.nama}</b></td>
                  <td>
                    <span className={`tag ${d.status === "tetap" ? "t-stamp" : "t-wait"}`} style={{ fontSize: "10.5px" }}>
                      {d.status === "tetap" ? "Tetap" : "Luar"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm" onClick={() => setEditingDosen(d)}>Ubah</button>{" "}
                    <button
                      className="btn btn-sm"
                      style={{ color: "var(--rose)" }}
                      disabled={deletingId === d.id}
                      onClick={() => handleDelete(d)}
                    >
                      {deletingId === d.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDosen.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
                    {dosenList.length === 0 ? "Belum ada data dosen." : `Tidak ada dosen yang cocok dengan "${query}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <DosenFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(input) => addDosen(input)}
        />
      )}

      {editingDosen && (
        <DosenFormModal
          dosen={editingDosen}
          onClose={() => setEditingDosen(null)}
          onSubmit={(input) => updateDosen(editingDosen.id, input)}
        />
      )}
    </section>
  );
}
