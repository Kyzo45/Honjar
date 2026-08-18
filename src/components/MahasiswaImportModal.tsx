"use client";

import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { ImportMahasiswaRow } from "@/lib/types";

interface Props {
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  update: "Perbarui",
  error: "Error",
};

const STATUS_CLASS: Record<string, string> = {
  baru: "t-done",
  update: "t-wait",
  error: "t-off",
};

export default function MahasiswaImportModal({ onClose }: Props) {
  const { importMahasiswaPreview, importMahasiswaCommit } = useApp();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportMahasiswaRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setRows(null);
    setLoading(true);
    const res = await importMahasiswaPreview(file);
    setLoading(false);
    if (res.success && res.rows) {
      setRows(res.rows);
    } else {
      setError(res.error || "Gagal membaca berkas Excel");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const errorCount = rows?.filter((r) => r.status === "error").length || 0;
  const baruCount = rows?.filter((r) => r.status === "baru").length || 0;
  const updateCount = rows?.filter((r) => r.status === "update").length || 0;
  const validRows = rows?.filter((r) => r.status !== "error") || [];

  const handleConfirm = async () => {
    if (!rows) return;
    setCommitting(true);
    setError(null);
    const res = await importMahasiswaCommit(rows);
    setCommitting(false);
    if (res.success) {
      setResult({ inserted: res.inserted || 0, updated: res.updated || 0 });
    } else {
      setError(res.error || "Gagal menyimpan hasil impor");
    }
  };

  const reset = () => {
    setFileName(null);
    setRows(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="impTitle" style={{ maxWidth: "640px" }}>
        <div className="sheet-h">
          <span className="step">Impor</span>
          <div>
            <h2 id="impTitle">Unggah data mahasiswa</h2>
            <p>Berkas Excel dengan kolom NIM, Nama, dan Angkatan. Baris diperiksa dulu sebelum disimpan.</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-b">
          {result ? (
            <div style={{ textAlign: "center", padding: "24px 8px" }}>
              <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>Impor selesai</p>
              <p style={{ color: "var(--ink-3)", margin: 0 }}>
                {result.inserted} mahasiswa baru ditambahkan, {result.updated} data diperbarui.
              </p>
            </div>
          ) : (
            <>
              <fieldset>
                <legend>Berkas Excel</legend>
                <div className="row">
                  <label className="f">
                    <span>Pilih berkas .xlsx</span>
                    <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} />
                  </label>
                </div>
                {loading && <p className="hint" style={{ margin: "4px 0 0" }}>Membaca {fileName}…</p>}
                {error && <p style={{ color: "var(--rose)", fontSize: "12px", margin: "4px 0 0" }}>{error}</p>}
              </fieldset>

              {rows && (
                <fieldset>
                  <legend>Pratinjau ({rows.length} baris)</legend>
                  <div className="att-sum" style={{ marginBottom: "10px" }}>
                    <span className="tag t-done">{baruCount} baru</span>{" "}
                    <span className="tag t-wait">{updateCount} perbarui</span>{" "}
                    {errorCount > 0 && <span className="tag t-off">{errorCount} error (diabaikan)</span>}
                  </div>
                  <div className="scroll" style={{ maxHeight: "320px" }}>
                    <table className="plain">
                      <thead>
                        <tr>
                          <th>NIM</th>
                          <th>Nama</th>
                          <th>Angkatan</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={`${r.nim}-${i}`}>
                            <td className="num">{r.nim || "—"}</td>
                            <td>{r.nama || "—"}</td>
                            <td>{r.angkatan || "—"}</td>
                            <td>
                              <span className={`tag ${STATUS_CLASS[r.status]}`} style={{ fontSize: "10.5px" }} title={r.pesan}>
                                {STATUS_LABEL[r.status]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </fieldset>
              )}
            </>
          )}
        </div>

        <div className="sheet-f">
          {result ? (
            <>
              <span className="hint">Data sudah tersimpan.</span>
              <button className="btn btn-p" onClick={onClose}>Tutup</button>
            </>
          ) : (
            <>
              <span className="hint">{rows ? `${validRows.length} baris siap disimpan.` : "Belum ada berkas dipilih."}</span>
              {rows && <button className="btn" onClick={reset}>Pilih berkas lain</button>}
              <button className="btn" onClick={onClose}>Batal</button>
              <button className="btn btn-p" onClick={handleConfirm} disabled={!rows || validRows.length === 0 || committing}>
                {committing ? "Menyimpan..." : "Konfirmasi Impor"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
