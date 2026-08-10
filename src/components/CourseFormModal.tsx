"use client";

import { useEffect, useRef, useState } from "react";
import type { MataKuliah, NewCourseInput } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewCourseInput) => void;
  course?: MataKuliah;
}

export default function CourseFormModal({ onClose, onSubmit, course }: Props) {
  const [kode, setKode] = useState(course?.kode || "");
  const [nama, setNama] = useState(course?.nama || "");
  const [sks, setSks] = useState(course?.sks || "");
  const [kelas, setKelas] = useState(course?.kelas || "");
  const [mhs, setMhs] = useState(course?.mhs ? course.mhs.toString() : "");
  const [koor, setKoor] = useState(course?.koor || "");
  const [dosenText, setDosenText] = useState(course?.dosen.join(", ") || "");
  const [pj, setPj] = useState(course?.pj || "");
  
  // New Fields
  const [tipe, setTipe] = useState<"Teori" | "Praktikum">(course?.tipe || "Teori");
  const [semester, setSemester] = useState(course?.semester ? course.semester.toString() : "2");
  const [hari, setHari] = useState(course?.hari || "Senin");
  const [jamMulai, setJamMulai] = useState(course?.jamMulai || "07:00");
  const [jamSelesai, setJamSelesai] = useState(course?.jamSelesai || "08:40");
  const [ruangan, setRuangan] = useState(course?.ruangan || "R.301");

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
      semester: !semester || Number(semester) <= 0,
      hari: !hari.trim(),
      ruangan: !ruangan.trim(),
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
      tipe,
      semester: Number(semester),
      hari: hari.trim(),
      jamMulai,
      jamSelesai,
      ruangan: ruangan.trim(),
    });
  };

  const borderFor = (key: string) => (errors[key] ? { borderColor: "var(--rose)" } : undefined);

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cfTitle">
        <div className="sheet-h">
          <span className="step">{course ? "Ubah" : "Baru"}</span>
          <div>
            <h2 id="cfTitle">{course ? "Ubah mata kuliah" : "Tambah mata kuliah"}</h2>
            <p>{course ? "Perbarui informasi jadwal, pengajar, atau PJ." : "Dibuat sebagai berita acara kosong, siap diisi PJ terkait."}</p>
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
            <div className="row c3">
              <label className="f"><span>Tipe Mata Kuliah</span>
                <select value={tipe} onChange={(e) => setTipe(e.target.value as "Teori" | "Praktikum")}>
                  <option value="Teori">Teori</option>
                  <option value="Praktikum">Praktikum</option>
                </select>
              </label>
              <label className="f"><span>Semester</span>
                <input type="number" min={1} value={semester} style={borderFor("semester")}
                  onChange={(e) => setSemester(e.target.value)} />
              </label>
              <label className="f"><span>Jumlah mahasiswa</span>
                <input type="number" min={0} value={mhs} placeholder="48"
                  style={borderFor("mhs")}
                  onChange={(e) => setMhs(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Nama mata kuliah</span>
                <input type="text" value={nama} placeholder="Contoh: Imunoserologi"
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Penanggung Jawab (PJ Mahasiswa)</span>
                <input type="text" value={pj} placeholder="Nama PJ Kelas"
                  onChange={(e) => setPj(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Jadwal Kuliah</legend>
            <div className="row c2">
              <label className="f"><span>Hari</span>
                <select value={hari} onChange={(e) => setHari(e.target.value)}>
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                  <option value="Minggu">Minggu</option>
                </select>
              </label>
              <label className="f"><span>Ruangan</span>
                <input type="text" value={ruangan} placeholder="R.301 / Lab. Hematologi"
                  style={borderFor("ruangan")}
                  onChange={(e) => setRuangan(e.target.value)} />
              </label>
            </div>
            <div className="row c2">
              <label className="f"><span>Jam Mulai</span>
                <input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
              </label>
              <label className="f"><span>Jam Selesai</span>
                <input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Pengajar</legend>
            <div className="row c2">
              <label className="f"><span>Koordinator Dosen</span>
                <input type="text" value={koor} placeholder="Nama koordinator dosen"
                  onChange={(e) => setKoor(e.target.value)} />
              </label>
              <label className="f"><span>Dosen Pengampu <em>· pisahkan dengan koma</em></span>
                <input type="text" value={dosenText} placeholder="Dosen A, Dosen B"
                  onChange={(e) => setDosenText(e.target.value)} />
              </label>
            </div>
          </fieldset>
        </div>

        <div className="sheet-f">
          <span className="hint">{course ? "Perubahan langsung memengaruhi rekapitulasi." : "Berita acara 16 pertemuan dibuat otomatis, kosong."}</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit}>{course ? "Simpan Perubahan" : "Simpan mata kuliah"}</button>
        </div>
      </div>
    </div>
  );
}
