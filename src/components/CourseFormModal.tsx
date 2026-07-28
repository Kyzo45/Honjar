"use client";

import { useEffect, useRef, useState } from "react";
import type { NewCourseInput } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewCourseInput) => void;
}

export default function CourseFormModal({ onClose, onSubmit }: Props) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [sks, setSks] = useState("");
  const [kelas, setKelas] = useState("");
  const [mhs, setMhs] = useState("");
  const [koor, setKoor] = useState("");
  const [dosenText, setDosenText] = useState("");
  const [pj, setPj] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const kodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    kodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = () => {
    const nextErrors: Record<string, boolean> = {
      kode: !kode.trim(),
      nama: !nama.trim(),
      kelas: !kelas.trim(),
      mhs: !mhs || Number(mhs) <= 0,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    onSubmit({
      kode: kode.trim(),
      nama: nama.trim(),
      kelas: kelas.trim(),
      sks: sks.trim() || "—",
      koor: koor.trim() || "—",
      dosenText,
      mhs: Number(mhs),
      pj: pj.trim() || "—",
    });
  };

  const borderFor = (key: string) => (errors[key] ? { borderColor: "var(--rose)" } : undefined);

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cfTitle">
        <div className="sheet-h">
          <span className="step">Baru</span>
          <div>
            <h2 id="cfTitle">Tambah mata kuliah</h2>
            <p>Dibuat sebagai berita acara kosong, siap diisi PJ terkait.</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-b">
          <fieldset>
            <legend>Identitas mata kuliah</legend>
            <div className="row c3">
              <label className="f"><span>Kode mata kuliah</span>
                <input ref={kodeRef} type="text" value={kode} placeholder="TLM2120"
                  style={borderFor("kode")}
                  onChange={(e) => setKode(e.target.value)} />
              </label>
              <label className="f"><span>SKS</span>
                <input type="text" value={sks} placeholder="2 (1T/1P)"
                  onChange={(e) => setSks(e.target.value)} />
              </label>
              <label className="f"><span>Kelas</span>
                <input type="text" value={kelas} placeholder="1C"
                  style={borderFor("kelas")}
                  onChange={(e) => setKelas(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nama mata kuliah</span>
                <input type="text" value={nama} placeholder="Contoh: Imunoserologi"
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value)} />
              </label>
            </div>
            <div className="row c2">
              <label className="f"><span>Jumlah mahasiswa</span>
                <input type="number" min={0} value={mhs} placeholder="48"
                  style={borderFor("mhs")}
                  onChange={(e) => setMhs(e.target.value)} />
              </label>
              <label className="f"><span>Penanggung Jawab <em>· dosen PJ</em></span>
                <input type="text" value={pj} placeholder="Nama PJ"
                  onChange={(e) => setPj(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Pengajar</legend>
            <div className="row c2">
              <label className="f"><span>Koordinator</span>
                <input type="text" value={koor} placeholder="Nama koordinator"
                  onChange={(e) => setKoor(e.target.value)} />
              </label>
              <label className="f"><span>Pengampu <em>· pisahkan dengan koma</em></span>
                <input type="text" value={dosenText} placeholder="Dosen A, Dosen B"
                  onChange={(e) => setDosenText(e.target.value)} />
              </label>
            </div>
          </fieldset>
        </div>

        <div className="sheet-f">
          <span className="hint">Berita acara 16 pertemuan dibuat otomatis, kosong.</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit}>Simpan mata kuliah</button>
        </div>
      </div>
    </div>
  );
}
