"use client";

import { useEffect, useRef, useState } from "react";
import type { NewPJInput, PJUser } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewPJInput) => Promise<{ success: boolean; error?: string }>;
  pj?: PJUser;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function PJFormModal({ onClose, onSubmit, pj }: Props) {
  const [nim, setNim] = useState(pj?.nim || "");
  const [nama, setNama] = useState(pj?.nama || "");
  const [angkatan, setAngkatan] = useState(pj?.angkatan || "");
  const [noHp, setNoHp] = useState(pj?.noHp || "");
  const [password, setPassword] = useState("");
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
    else if (nim.length > 10) next.nim = "NIM maksimal 10 digit";

    if (angkatan && !/^\d+$/.test(angkatan)) next.angkatan = "Angkatan harus berupa angka";
    else if (angkatan.length > 4) next.angkatan = "Angkatan maksimal 4 digit";

    if (!nama.trim()) next.nama = "Nama wajib diisi";
    else if (nama.trim().length > 50) next.nama = "Nama maksimal 50 karakter";

    if (noHp && !/^\d+$/.test(noHp)) next.noHp = "Nomor HP harus berupa angka";
    else if (noHp.length > 12) next.noHp = "Nomor HP maksimal 12 digit";

    if (!pj && !password.trim()) next.password = "Password wajib diisi untuk PJ baru";

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
        noHp: noHp.trim(),
        password: password.trim() || undefined,
      });
      if (!result.success) {
        setServerError(result.error || "Gagal menyimpan data PJ");
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
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pjTitle" style={{ maxWidth: "460px" }}>
        <div className="sheet-h">
          <span className="step">{pj ? "Ubah" : "Baru"}</span>
          <div>
            <h2 id="pjTitle">{pj ? "Ubah Penanggung Jawab" : "Tambah Penanggung Jawab"}</h2>
            <p>{pj ? "Username selalu mengikuti NIM." : "Username otomatis diambil dari NIM."}</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-b">
          <fieldset>
            <legend>Identitas mahasiswa</legend>
            <div className="row c2">
              <label className="f"><span>NIM <em>· angka, maks 10 digit</em></span>
                <input ref={nimRef} type="text" inputMode="numeric" value={nim} placeholder="4211001"
                  maxLength={10}
                  style={borderFor("nim")}
                  onChange={(e) => setNim(onlyDigits(e.target.value).slice(0, 10))} />
                <ErrorText field="nim" />
              </label>
              <label className="f"><span>Angkatan <em>· angka, maks 4 digit</em></span>
                <input type="text" inputMode="numeric" value={angkatan} placeholder="2021"
                  maxLength={4}
                  style={borderFor("angkatan")}
                  onChange={(e) => setAngkatan(onlyDigits(e.target.value).slice(0, 4))} />
                <ErrorText field="angkatan" />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nama Mahasiswa <em>· maks 50 karakter</em></span>
                <input type="text" value={nama} placeholder="Nama lengkap mahasiswa"
                  maxLength={50}
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value.slice(0, 50))} />
                <ErrorText field="nama" />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nomor HP <em>· angka, maks 12 digit</em></span>
                <input type="text" inputMode="numeric" value={noHp} placeholder="08xxxxxxxxxx"
                  maxLength={12}
                  style={borderFor("noHp")}
                  onChange={(e) => setNoHp(onlyDigits(e.target.value).slice(0, 12))} />
                <ErrorText field="noHp" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Akun login</legend>
            <div className="row c2">
              <label className="f"><span>Username <em>· dari NIM</em></span>
                <input type="text" value={nim || "—"} disabled style={{ color: "var(--ink-3)" }} />
              </label>
              <label className="f"><span>Password{pj && <em> · kosongkan jika tidak diubah</em>}</span>
                <input type="text" value={password} placeholder={pj ? "••••••" : "Wajib diisi"}
                  style={borderFor("password")}
                  onChange={(e) => setPassword(e.target.value)} />
                <ErrorText field="password" />
              </label>
            </div>
          </fieldset>
          {serverError && (
            <p style={{ color: "var(--rose)", fontSize: "12px", margin: "4px 0 0" }}>{serverError}</p>
          )}
        </div>

        <div className="sheet-f">
          <span className="hint">Password disimpan terenkripsi.</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : pj ? "Simpan Perubahan" : "Simpan PJ"}
          </button>
        </div>
      </div>
    </div>
  );
}
