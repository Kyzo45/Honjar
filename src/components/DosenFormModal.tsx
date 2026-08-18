"use client";

import { useEffect, useRef, useState } from "react";
import type { Dosen, NewDosenInput, StatusDosen } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewDosenInput) => Promise<{ success: boolean; error?: string }>;
  dosen?: Dosen;
}

const STATUS_OPTIONS: { value: StatusDosen; label: string }[] = [
  { value: "tetap", label: "Dosen Tetap" },
  { value: "luar", label: "Dosen Luar" },
];

export default function DosenFormModal({ onClose, onSubmit, dosen }: Props) {
  const [nid, setNid] = useState(dosen?.nid || "");
  const [nama, setNama] = useState(dosen?.nama || "");
  const [status, setStatus] = useState<StatusDosen>(dosen?.status || "tetap");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nidRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const nextErrors: Record<string, boolean> = {
      nid: !nid.trim(),
      nama: !nama.trim(),
    };
    setErrors(nextErrors);
    setServerError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    const result = await onSubmit({ nid: nid.trim(), nama: nama.trim(), status });
    setSaving(false);
    if (!result.success) {
      setServerError(result.error || "Gagal menyimpan data dosen");
      return;
    }
    onClose();
  };

  const borderFor = (key: string) => (errors[key] ? { borderColor: "var(--rose)" } : undefined);

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="dfTitle" style={{ maxWidth: "420px" }}>
        <div className="sheet-h">
          <span className="step">{dosen ? "Ubah" : "Baru"}</span>
          <div>
            <h2 id="dfTitle">{dosen ? "Ubah dosen" : "Tambah dosen"}</h2>
            <p>{dosen ? "Perbarui NID atau nama dosen." : "NID wajib diisi dan harus unik, mencegah data dosen ganda."}</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-b">
          <fieldset>
            <legend>Identitas dosen</legend>
            <div className="row">
              <label className="f"><span>NID (Nomor Induk Dosen)</span>
                <input ref={nidRef} type="text" value={nid} placeholder="DSN0001"
                  style={borderFor("nid")}
                  onChange={(e) => setNid(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nama lengkap beserta gelar</span>
                <input type="text" value={nama} placeholder="Dr. Nama Dosen, M.Kes."
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Status Dosen</span>
                <div className="seg" role="group">
                  {STATUS_OPTIONS.map((o) => (
                    <button key={o.value} type="button" aria-pressed={status === o.value} onClick={() => setStatus(o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </fieldset>
          {serverError && (
            <p style={{ color: "var(--rose)", fontSize: "12px", margin: "4px 0 0" }}>{serverError}</p>
          )}
        </div>

        <div className="sheet-f">
          <span className="hint">NID dipakai sebagai kunci utama untuk membedakan dosen.</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : dosen ? "Simpan Perubahan" : "Simpan Dosen"}
          </button>
        </div>
      </div>
    </div>
  );
}
