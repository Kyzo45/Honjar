"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { daysBetween, jamAjar, menit } from "@/lib/format";
import type { Kehadiran, KuliahRow, MataKuliah, Metode, StatusMhs, AbsentRecord } from "@/lib/types";

const METODE_OPTIONS: Metode[] = ["Teori", "Praktikum", "Lapangan"];

const KEHADIRAN_OPTIONS: { value: Kehadiran; label: string }[] = [
  { value: "hadir", label: "Hadir di kelas" },
  { value: "daring", label: "Mengajar daring" },
  { value: "diganti", label: "Digantikan dosen lain" },
  { value: "batal", label: "Tidak terlaksana" },
];

const STATUS_LABEL: Record<StatusMhs, string> = {
  sakit: "Sakit",
  izin: "Izin",
  tanpa: "Tanpa Keterangan",
};

interface AbsentEntry {
  nim: string;
  status: StatusMhs;
  locked: boolean;
  fileName?: string;
  fileUrl?: string;
}

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface Props {
  course: MataKuliah;
  row: KuliahRow;
}

export default function SheetModal({ course, row }: Props) {
  const { closeSheet, saveRow, uploadBukti } = useApp();
  const isEdit = Boolean(row.topik);

  // Dosen yang bisa dipilih untuk mengisi pertemuan hanya dosen koordinator
  // dan dosen pengampu mata kuliah ini, bukan seluruh daftar dosen di aplikasi.
  const courseLecturers = Array.from(new Set([course.koor, ...course.dosen].filter(Boolean)));

  // Roster mahasiswa mata kuliah ini — langsung dari peserta KRS-nya (course.roster),
  // bukan pencocokan field kelas manapun.
  const roster = course.roster;

  const [tgl, setTgl] = useState(row.tgl || todayISO());
  const [mulai, setMulai] = useState(row.jam ? row.jam[0] : "14:40");
  const [selesai, setSelesai] = useState(row.jam ? row.jam[1] : "16:20");
  const [metode, setMetode] = useState<Metode>(row.metode || "Teori");
  const [topik, setTopik] = useState(row.topik || "");

  // Set dynamic default dosen
  const [dosen, setDosen] = useState(row.dosen || courseLecturers[0] || "");
  const [kehadiran, setKehadiran] = useState<Kehadiran>(row.kehadiran || "hadir");
  const [topikError, setTopikError] = useState(false);
  const [tglError, setTglError] = useState(false);
  const [jamError, setJamError] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const topikRef = useRef<HTMLTextAreaElement>(null);

  // Load existing absents from row state instead of static dummy data
  const [absentList, setAbsentList] = useState<AbsentEntry[]>(() =>
    row.absents
      ? row.absents.map((a) => ({ nim: a.nim, status: a.status, locked: false, fileName: a.fileName, fileUrl: a.fileUrl }))
      : []
  );
  const [uploadingNim, setUploadingNim] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topikRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeSheet]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dur = Math.max(0, menit(mulai, selesai));
  const jam = jamAjar(dur);
  const absen = absentList.length;
  const aTagClass = absen === 0 ? "t-done" : absen <= 3 ? "t-wait" : "t-off";
  const aTagLabel = absen === 0 ? "Lengkap" : `${absen} tidak hadir`;

  const available = roster.filter(
    ({ nim, nama }) =>
      !absentList.some((a) => a.nim === nim) &&
      (nama.toLowerCase().includes(search.toLowerCase()) || nim.includes(search))
  );

  const addAbsent = (nim: string) => {
    setAbsentList((prev) => [...prev, { nim, status: "tanpa", locked: false }]);
    setSearch("");
  };
  const removeAbsent = (nim: string) => {
    setAbsentList((prev) => prev.filter((a) => a.nim !== nim));
  };
  const setStatus = (nim: string, status: StatusMhs) => {
    setAbsentList((prev) => prev.map((a) => (a.nim === nim ? { ...a, status } : a)));
  };
  const handleFileChange = async (nim: string, file: File | undefined) => {
    if (!file) return;
    setUploadingNim(nim);
    const res = await uploadBukti(file);
    setUploadingNim(null);
    if (res.success) {
      setAbsentList((prev) =>
        prev.map((a) => (a.nim === nim ? { ...a, fileName: res.originalName, fileUrl: res.url } : a))
      );
    }
  };

  const handleSave = () => {
    const nextTopikError = !topik.trim();

    let tglMsg: string | null = null;
    if (!tgl) tglMsg = "Tanggal wajib diisi";
    else {
      const selisih = daysBetween(tgl, todayISO()); // hari ini - tanggal dipilih
      if (selisih < 0) tglMsg = "Tanggal tidak boleh di masa depan";
      else if (selisih > 7) tglMsg = "Tanggal sudah lewat batas input 7 hari";
    }
    const nextTglError = tglMsg !== null;

    let jamMsg: string | null = null;
    if (!mulai || !selesai) jamMsg = "Jam mulai dan jam selesai wajib diisi";
    else if (menit(mulai, selesai) <= 0) jamMsg = "Jam selesai harus setelah jam mulai";
    const nextJamError = jamMsg !== null;

    setTopikError(nextTopikError);
    setTglError(nextTglError);
    setJamError(nextJamError);

    if (nextTopikError || nextTglError || nextJamError) {
      setValidationMsg(tglMsg || jamMsg || (nextTopikError ? "Pokok bahasan kuliah wajib diisi" : null));
      if (nextTopikError) topikRef.current?.focus();
      return;
    }
    setValidationMsg(null);

    const mappedAbsents: AbsentRecord[] = absentList.map((a) => ({
      nim: a.nim,
      status: a.status,
      fileName: a.fileName,
      fileUrl: a.fileUrl
    }));

    saveRow(course.id, row.ke, {
      tgl,
      jam: [mulai, selesai],
      topik: topik.trim(),
      metode,
      dosen,
      kehadiran,
      hadir: course.mhs - absentList.length,
      absents: mappedAbsents,
    });
  };

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle">
        <div className="sheet-h">
          <span className="step">Ke-{row.ke}</span>
          <div>
            <h2 id="shTitle">{isEdit ? "Ubah pertemuan" : "Catat pertemuan"}</h2>
            <p>{course.nama} · {course.kelas}</p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={closeSheet}>✕</button>
        </div>

        <div className="sheet-b">
          <fieldset>
            <legend>Waktu dan metode</legend>
            <div className="row c3">
              <label className="f"><span>Tanggal <em>· maks. 7 hari ke belakang</em></span>
                <input type="date" value={tgl}
                  style={tglError ? { borderColor: "var(--rose)" } : undefined}
                  onChange={(e) => { setTgl(e.target.value); if (tglError) { setTglError(false); setValidationMsg(null); } }} />
              </label>
              <label className="f"><span>Jam mulai</span>
                <input type="time" value={mulai}
                  style={jamError ? { borderColor: "var(--rose)" } : undefined}
                  onChange={(e) => { setMulai(e.target.value); if (jamError) { setJamError(false); setValidationMsg(null); } }} />
              </label>
              <label className="f"><span>Jam selesai</span>
                <input type="time" value={selesai}
                  style={jamError ? { borderColor: "var(--rose)" } : undefined}
                  onChange={(e) => { setSelesai(e.target.value); if (jamError) { setJamError(false); setValidationMsg(null); } }} />
              </label>
            </div>
            {validationMsg && (
              <p style={{ color: "var(--rose)", fontSize: "12px", margin: "0 0 12px" }}>{validationMsg}</p>
            )}
            <div className="row">
              <label className="f"><span>Metode</span>
                <div className="seg" role="group">
                  {METODE_OPTIONS.map((mv) => (
                    <button key={mv} type="button" aria-pressed={metode === mv} onClick={() => setMetode(mv)}>
                      {mv}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <dl className="derived">
              <div><dt>Durasi</dt><dd><span>{dur}</span> menit</dd></div>
              <div><dt>Jumlah jam</dt><dd>{jam}</dd></div>
              <p className="why">Terhitung sendiri, langsung dipakai di rekap honor. Tidak bisa diketik manual.</p>
            </dl>
          </fieldset>

          <fieldset>
            <legend>Materi dan pengajar</legend>
            <div className="row">
              <label className="f"><span>Pokok bahasan kuliah</span>
                <textarea
                  ref={topikRef}
                  value={topik}
                  placeholder="Contoh: Laju Endap Darah"
                  style={topikError ? { borderColor: "var(--rose)" } : undefined}
                  onChange={(e) => { setTopik(e.target.value); if (topikError) setTopikError(false); }}
                />
              </label>
            </div>
            <div className="row c2">
              <label className="f"><span>Dosen yang mengajar</span>
                <select value={dosen} onChange={(e) => setDosen(e.target.value)}>
                  {courseLecturers.map((d) => <option key={d} value={d}>{d}</option>)}
                  {dosen && !courseLecturers.includes(dosen) && <option value={dosen}>{dosen}</option>}
                </select>
              </label>
              <label className="f"><span>Kehadiran dosen <em>· pengganti tanda tangan</em></span>
                <select value={kehadiran} onChange={(e) => setKehadiran(e.target.value as Kehadiran)}>
                  {KEHADIRAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Kehadiran mahasiswa</legend>
            <div className="att-sum">
              <b>{course.mhs - absen}</b>
              <span>hadir dari <span className="num">{course.mhs}</span> mahasiswa</span>
              <span className={`tag ${aTagClass}`}>{aTagLabel}</span>
            </div>
            <p className="att-hint">
              Semua dianggap hadir. Tambahkan mahasiswa yang tidak hadir, lalu pilih keterangannya.
            </p>

            <label className="f"><span>Mahasiswa yang tidak hadir</span>
              <div className="combo" ref={pickerRef}>
                <button type="button" className="combo-trigger" onClick={() => setPickerOpen((o) => !o)}>
                  <i>🔍</i> Cari dan tambahkan mahasiswa…
                </button>
                {pickerOpen && (
                  <div className="combo-panel">
                    <input
                      className="combo-search"
                      autoFocus
                      placeholder="Cari nama atau NIM"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="combo-list">
                      {available.length === 0 ? (
                        <div className="combo-empty">
                          {roster.length === 0
                            ? "Kelas ini belum punya data mahasiswa"
                            : absentList.length === roster.length ? "Semua mahasiswa sudah ditandai" : "Tidak ditemukan"}
                        </div>
                      ) : (
                        available.map(({ nim, nama }) => (
                          <button type="button" key={nim} className="combo-item" onClick={() => addAbsent(nim)}>
                            <span className="nim">{nim}</span>{nama}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>

            {absentList.length > 0 ? (
              <div className="absent-list">
                {absentList.map((a) => {
                  const student = roster.find((m) => m.nim === a.nim);
                  const needsUpload = a.status === "sakit" || a.status === "izin";
                  return (
                    <div className="absent-row" key={a.nim}>
                      <div className="who">
                        <b>{student?.nama || `Mahasiswa ${a.nim} (sudah tidak terdaftar di kelas ini)`}</b>
                        <span>{a.nim}</span>
                      </div>
                      <select value={a.status} onChange={(e) => setStatus(a.nim, e.target.value as StatusMhs)}>
                        <option value="tanpa">Tanpa Keterangan</option>
                        <option value="sakit">Sakit</option>
                        <option value="izin">Izin</option>
                      </select>
                      {needsUpload && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {a.fileUrl && (
                            <a href={a.fileUrl} target="_blank" rel="noreferrer" className="upload-chip done">
                              📎 {a.fileName || "Lihat berkas"}
                            </a>
                          )}
                          <label className="upload-chip">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              onChange={(e) => handleFileChange(a.nim, e.target.files?.[0])}
                            />
                            {uploadingNim === a.nim
                              ? "Mengunggah…"
                              : a.fileUrl
                                ? "Ganti"
                                : `Unggah surat ${a.status === "sakit" ? "sakit" : "izin"}`}
                          </label>
                        </div>
                      )}
                      <button type="button" className="rm" aria-label="Hapus" onClick={() => removeAbsent(a.nim)}>✕</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="absent-empty">Semua mahasiswa dianggap hadir.</p>
            )}
          </fieldset>
        </div>

        <div className="sheet-f">
          <span className="hint">Tersimpan sebagai draf otomatis. Berfungsi tanpa sinyal.</span>
          <button className="btn" onClick={closeSheet}>Batal</button>
          <button className="btn btn-p" onClick={handleSave}>Simpan pertemuan</button>
        </div>
      </div>
    </div>
  );
}
