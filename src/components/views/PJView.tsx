"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import PJFormModal from "@/components/PJFormModal";
import type { PJUser } from "@/lib/types";
import { formatWAUrl } from "@/lib/format";

const DEFAULT_WA_MSG = (pj: PJUser) =>
  `Halo Sdr/i *${pj.nama}*,\n\nSaya dari Admin Prodi TLM UNJANI menghubungi Anda terkait tugas sebagai Penanggung Jawab kelas.\n\nTerima kasih. 🙏\n_— Admin Prodi TLM UNJANI_`;

export default function PJView() {
  const { pjList, addPJ, updatePJ, deletePJ } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingPJ, setEditingPJ] = useState<PJUser | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const filteredPJ = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pjList;
    return pjList.filter(
      (p) =>
        p.nim.toLowerCase().includes(q) ||
        p.nama.toLowerCase().includes(q) ||
        p.angkatan.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
    );
  }, [pjList, query]);

  const handleDelete = async (p: PJUser) => {
    if (!confirm(`Hapus Penanggung Jawab "${p.nama}" (NIM ${p.nim})? Mata kuliah yang di-PJ-kan ke akun ini akan jadi tanpa PJ.`)) return;
    setDeletingId(p.id);
    await deletePJ(p.id);
    setDeletingId(null);
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <h2>Daftar Penanggung Jawab</h2>
          <p>Akun mahasiswa yang menjadi Penanggung Jawab kelas. Username selalu mengikuti NIM.</p>
          <div className="right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Cari NIM, nama, angkatan..."
              style={{
                padding: "6px 10px",
                fontSize: "12.5px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                minWidth: "220px"
              }}
            />
            <button className="btn btn-sm btn-p" onClick={() => setShowForm(true)}>＋ Tambah PJ</button>
          </div>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>NIM</th>
                <th>Nama Mahasiswa</th>
                <th>Angkatan</th>
                <th>Nomor HP</th>
                <th>Username</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPJ.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.nim}</td>
                  <td><b>{p.nama}</b></td>
                  <td>{p.angkatan || "—"}</td>
                  <td>{p.noHp || "—"}</td>
                  <td className="num">{p.username}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <a
                      href={formatWAUrl(p.noHp, DEFAULT_WA_MSG(p))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ textDecoration: "none", marginRight: "4px" }}
                      title={p.noHp ? `Chat WA: ${p.noHp}` : "Kirim WA (tanpa nomor HP)"}
                    >
                      💬
                    </a>
                    <button className="btn btn-sm" onClick={() => setEditingPJ(p)}>Ubah</button>{" "}
                    <button
                      className="btn btn-sm"
                      style={{ color: "var(--rose)" }}
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p)}
                    >
                      {deletingId === p.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPJ.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
                    {pjList.length === 0 ? "Belum ada Penanggung Jawab." : `Tidak ada PJ yang cocok dengan "${query}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <PJFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(input) => addPJ(input)}
        />
      )}

      {editingPJ && (
        <PJFormModal
          pj={editingPJ}
          onClose={() => setEditingPJ(null)}
          onSubmit={(input) => updatePJ(editingPJ.id, input)}
        />
      )}
    </section>
  );
}
