"use client";

import { useEffect, useRef, useState } from "react";
import type { Mahasiswa, NewMahasiswaInput } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewMahasiswaInput) => Promise<{ success: boolean; error?: string }>;
  mahasiswa?: Mahasiswa;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function MahasiswaFormModal({ onClose, onSubmit, mahasiswa }: Props) {
  const [nim, setNim] = useState(mahasiswa?.nim || "");
  const [nama, setNama] = useState(mahasiswa?.nama || "");
  const [angkatan, setAngkatan] = useState(mahasiswa?.angkatan || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nimRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nimRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};

    if (!nim.trim()) next.nim = "NIM wajib diisi";
    else if (!/^\d+$/.test(nim)) next.nim = "NIM harus berupa angka";
    else if (nim.length > 15) next.nim = "NIM maksimal 15 digit";

    if (!nama.trim()) next.nama = "Nama wajib diisi";
    else if (nama.trim().length > 100) next.nama = "Nama maksimal 100 karakter";

    if (angkatan && !/^\d+$/.test(angkatan)) next.angkatan = "Angkatan harus berupa angka";
    else if (angkatan.length > 4) next.angkatan = "Angkatan maksimal 4 digit";

    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const result = await onSubmit({
        nim: nim.trim(),
        nama: nama.trim(),
        angkatan: angkatan.trim(),
      });
      if (!result.success) {
        setServerError(result.error || "Gagal menyimpan data mahasiswa");
        return;
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan tak terduga saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const borderFor = (key: string) => (errors[key] ? { borderColor: "var(--rose)" } : undefined);
  const ErrorText = ({ field }: { field: string }) =>
    errors[field] ? (
      <span style={{ color: "var(--rose)", fontSize: "11px", fontWeight: 400, marginTop: "2px", marginBottom: 0 }}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mhsTitle" style={{ maxWidth: "420px" }}>
        <div className="sheet-h">
          <span className="step">{mahasiswa ? "Ubah" : "Baru"}</span>
          <div>
            <h2 id="mhsTitle">{mahasiswa ? "Ubah mahasiswa" : "Tambah mahasiswa"}</h2>
            <p>NIM wajib diisi dan harus unik. Kepesertaan mata kuliah diatur terpisah lewat menu Daftar Kelas.</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-b">
          <fieldset>
            <legend>Identitas mahasiswa</legend>
            <div className="row c2">
              <label className="f"><span>NIM <em>· angka, maks 15 digit</em></span>
                <input ref={nimRef} type="text" inputMode="numeric" value={nim} placeholder="2250391001"
                  disabled={Boolean(mahasiswa)}
                  maxLength={15}
                  style={borderFor("nim")}
                  onChange={(e) => setNim(onlyDigits(e.target.value).slice(0, 15))} />
                <ErrorText field="nim" />
              </label>
              <label className="f"><span>Angkatan <em>· angka, maks 4 digit</em></span>
                <input type="text" inputMode="numeric" value={angkatan} placeholder="2022"
                  maxLength={4}
                  style={borderFor("angkatan")}
                  onChange={(e) => setAngkatan(onlyDigits(e.target.value).slice(0, 4))} />
                <ErrorText field="angkatan" />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nama Mahasiswa <em>· maks 100 karakter</em></span>
                <input type="text" value={nama} placeholder="Nama lengkap mahasiswa"
                  maxLength={100}
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value.slice(0, 100))} />
                <ErrorText field="nama" />
              </label>
            </div>
          </fieldset>
          {serverError && (
            <p style={{ color: "var(--rose)", fontSize: "12px", margin: "4px 0 0" }}>{serverError}</p>
          )}
        </div>

        <div className="sheet-f">
          <span className="hint">Satu mahasiswa bisa terdaftar di banyak mata kuliah sekaligus.</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : mahasiswa ? "Simpan Perubahan" : "Simpan Mahasiswa"}
          </button>
        </div>
      </div>
    </div>
  );
}
