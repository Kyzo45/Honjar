"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { IZIN_DISETUJUI, MHS } from "@/lib/data";
import { jamAjar, menit } from "@/lib/format";
import type { Kehadiran, KuliahRow, MataKuliah, Metode, StatusMhs } from "@/lib/types";

const DOSEN_OPTIONS = [
  "Dr. Arina Novilla, M.Kes.",
  "M. Ratna Ningrum, M.Si.",
  "Taufik Gunawan, S.Tr.Kes.",
  "— dosen lain —",
];

const METODE_OPTIONS: Metode[] = ["Teori", "Praktikum", "Seminar"];

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
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  course: MataKuliah;
  row: KuliahRow;
}

export default function SheetModal({ course, row }: Props) {
  const { closeSheet, saveRow } = useApp();
  const isEdit = Boolean(row.topik);

  const [tgl, setTgl] = useState(row.tgl || todayISO());
  const [mulai, setMulai] = useState(row.jam ? row.jam[0] : "14:40");
  const [selesai, setSelesai] = useState(row.jam ? row.jam[1] : "16:20");
  const [metode, setMetode] = useState<Metode>(row.metode || "Teori");
  const [topik, setTopik] = useState(row.topik || "");
  const [dosen, setDosen] = useState(DOSEN_OPTIONS[0]);
  const [kehadiran, setKehadiran] = useState<Kehadiran>(row.kehadiran || "hadir");
  const [topikError, setTopikError] = useState(false);
  const topikRef = useRef<HTMLTextAreaElement>(null);

  const [absentList, setAbsentList] = useState<AbsentEntry[]>(() =>
    Object.entries(IZIN_DISETUJUI).map(([nim, status]) => ({ nim, status, locked: true }))
  );
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

  const available = MHS.filter(
    ({ nim, nama }) =>
      !absentList.some((a) => a.nim === nim) &&
      (nama.toLowerCase().includes(search.toLowerCase()) || nim.includes(search))
  );

  const addAbsent = (nim: string) => {
    setAbsentList((prev) => [...prev, { nim, status: "tanpa", locked: false }]);
    setSearch("");
  };
  const removeAbsent = (nim: string) => {
    setAbsentList((prev) => prev.filter((a) => a.nim !== nim || a.locked));
  };
  const setStatus = (nim: string, status: StatusMhs) => {
    setAbsentList((prev) => prev.map((a) => (a.nim === nim && !a.locked ? { ...a, status } : a)));
  };
  const setFile = (nim: string, fileName: string) => {
    setAbsentList((prev) => prev.map((a) => (a.nim === nim ? { ...a, fileName } : a)));
  };

  const handleSave = () => {
    if (!topik.trim()) {
      setTopikError(true);
      topikRef.current?.focus();
      return;
    }
    setTopikError(false);
    saveRow(course.id, row.ke, {
      tgl, jam: [mulai, selesai], topik: topik.trim(),
      metode, dosen, kehadiran,
      hadir: course.mhs - absentList.length,
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
              <label className="f"><span>Tanggal</span>
                <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
              </label>
              <label className="f"><span>Jam mulai</span>
                <input type="time" value={mulai} onChange={(e) => setMulai(e.target.value)} />
              </label>
              <label className="f"><span>Jam selesai</span>
                <input type="time" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
              </label>
            </div>
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
                  {DOSEN_OPTIONS.map((d) => <option key={d}>{d}</option>)}
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
              Nama bertanda <span className="lock">🔒</span> punya izin yang sudah disetujui dan tidak dapat diubah di sini.
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
                          {absentList.length === MHS.length ? "Semua mahasiswa sudah ditandai" : "Tidak ditemukan"}
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
                  const student = MHS.find((m) => m.nim === a.nim);
                  const needsUpload = a.status === "sakit" || a.status === "izin";
                  return (
                    <div className="absent-row" key={a.nim}>
                      <div className="who">
                        <b>{student?.nama}</b>
                        <span>{a.nim}</span>
                      </div>
                      {a.locked ? (
                        <span className="lock-badge">🔒 {STATUS_LABEL[a.status]} · sudah disetujui</span>
                      ) : (
                        <select value={a.status} onChange={(e) => setStatus(a.nim, e.target.value as StatusMhs)}>
                          <option value="tanpa">Tanpa Keterangan</option>
                          <option value="sakit">Sakit</option>
                          <option value="izin">Izin</option>
                        </select>
                      )}
                      {needsUpload && !a.locked && (
                        <label className={`upload-chip ${a.fileName ? "done" : ""}`}>
                          <input
                            type="file"
                            onChange={(e) => setFile(a.nim, e.target.files?.[0]?.name ?? "")}
                          />
                          {a.fileName ? `📎 ${a.fileName}` : `Unggah surat ${a.status === "sakit" ? "sakit" : "izin"}`}
                        </label>
                      )}
                      {!a.locked && (
                        <button type="button" className="rm" aria-label="Hapus" onClick={() => removeAbsent(a.nim)}>✕</button>
                      )}
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
