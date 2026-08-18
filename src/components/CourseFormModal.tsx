"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { ImportMahasiswaRow, MataKuliah, NewCourseInput } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: NewCourseInput) => Promise<{ success: boolean; error?: string }>;
  course?: MataKuliah;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function CourseFormModal({ onClose, onSubmit, course }: Props) {
  const { dosenList, pjList, courses, importMahasiswaPreview } = useApp();

  const [kode, setKode] = useState(course?.kode || "");
  const [nama, setNama] = useState(course?.nama || "");
  const [sks, setSks] = useState(course?.sks || "");
  const [kelas, setKelas] = useState(course?.kelas || "");
  const [koor, setKoor] = useState(course?.koor || "");
  const [dosenPengampu, setDosenPengampu] = useState<string[]>(course?.dosen || []);
  const [pjId, setPjId] = useState<number | null>(course?.pjId ?? null);
  const [pjNama, setPjNama] = useState(course?.pj && course.pj !== "—" ? course.pj : "");

  // New Fields
  const [tipe, setTipe] = useState<"Teori" | "Praktikum">(course?.tipe || "Teori");
  const [semester, setSemester] = useState(course?.semester ? course.semester.toString() : "2");
  const [hari, setHari] = useState(course?.hari || "Senin");
  const [jamMulai, setJamMulai] = useState(course?.jamMulai || "07:00");
  const [jamSelesai, setJamSelesai] = useState(course?.jamSelesai || "08:40");
  const [ruangan, setRuangan] = useState(course?.ruangan || "R.301");

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const kodeRef = useRef<HTMLInputElement>(null);

  // Kombobox koordinator dosen
  const [koorPickerOpen, setKoorPickerOpen] = useState(false);
  const [koorSearch, setKoorSearch] = useState("");
  const koorPickerRef = useRef<HTMLDivElement>(null);

  // Kombobox dosen pengampu (multi-pilih)
  const [dosenPickerOpen, setDosenPickerOpen] = useState(false);
  const [dosenSearch, setDosenSearch] = useState("");
  const dosenPickerRef = useRef<HTMLDivElement>(null);

  // Kombobox Penanggung Jawab
  const [pjPickerOpen, setPjPickerOpen] = useState(false);
  const [pjSearch, setPjSearch] = useState("");
  const pjPickerRef = useRef<HTMLDivElement>(null);

  // Roster awal mahasiswa — input manual, upload Excel, dan/atau salin dari mata
  // kuliah lain, dikirim bersama form ini hanya saat membuat mata kuliah baru.
  // Untuk mata kuliah yang sudah ada, roster dikelola lewat menu Daftar Kelas.
  const [newRoster, setNewRoster] = useState<{ nim: string; nama: string; angkatan: string }[]>([]);
  const [rNim, setRNim] = useState("");
  const [rNama, setRNama] = useState("");
  const [rAngkatan, setRAngkatan] = useState("");
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportMahasiswaRow[] | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kombobox "salin roster dari mata kuliah lain"
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [copySearch, setCopySearch] = useState("");
  const copyPickerRef = useRef<HTMLDivElement>(null);

  // Dialog sukses setelah simpan — ditampilkan sebagai pengganti isi form ini
  const [savedSummary, setSavedSummary] = useState<{
    kode: string; nama: string; kelas: string; hari: string; jamMulai: string; jamSelesai: string; roster: { nim: string; nama: string; angkatan: string }[]; isNew: boolean;
  } | null>(null);

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (koorPickerRef.current && !koorPickerRef.current.contains(e.target as Node)) {
        setKoorPickerOpen(false);
      }
      if (dosenPickerRef.current && !dosenPickerRef.current.contains(e.target as Node)) {
        setDosenPickerOpen(false);
      }
      if (pjPickerRef.current && !pjPickerRef.current.contains(e.target as Node)) {
        setPjPickerOpen(false);
      }
      if (copyPickerRef.current && !copyPickerRef.current.contains(e.target as Node)) {
        setCopyPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const koorOptions = useMemo(
    () => dosenList.filter((d) => d.nama.toLowerCase().includes(koorSearch.toLowerCase())),
    [dosenList, koorSearch]
  );

  const dosenOptions = useMemo(
    () =>
      dosenList.filter(
        (d) => !dosenPengampu.includes(d.nama) && d.nama.toLowerCase().includes(dosenSearch.toLowerCase())
      ),
    [dosenList, dosenPengampu, dosenSearch]
  );

  const pjOptions = useMemo(
    () =>
      pjList.filter(
        (p) =>
          p.nama.toLowerCase().includes(pjSearch.toLowerCase()) ||
          p.nim.toLowerCase().includes(pjSearch.toLowerCase())
      ),
    [pjList, pjSearch]
  );

  const pickKoor = (nama: string) => {
    setKoor(nama);
    setKoorPickerOpen(false);
    setKoorSearch("");
  };

  const pickPJ = (p: { id: number; nama: string }) => {
    setPjId(p.id);
    setPjNama(p.nama);
    setPjPickerOpen(false);
    setPjSearch("");
  };

  const addDosenPengampu = (nama: string) => {
    setDosenPengampu((prev) => [...prev, nama]);
    setDosenSearch("");
  };
  const removeDosenPengampu = (nama: string) => {
    setDosenPengampu((prev) => prev.filter((d) => d !== nama));
  };

  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Mata kuliah lain yang punya roster, untuk fitur "salin dari mata kuliah lain"
  const copyOptions = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.roster.length > 0 &&
          (c.nama.toLowerCase().includes(copySearch.toLowerCase()) ||
            c.kode.toLowerCase().includes(copySearch.toLowerCase()) ||
            c.kelas.toLowerCase().includes(copySearch.toLowerCase()))
      ),
    [courses, copySearch]
  );

  const copyRosterFrom = (c: MataKuliah) => {
    setNewRoster((prev) => {
      const map = new Map(prev.map((r) => [r.nim, r]));
      c.roster.forEach((m) => map.set(m.nim, { nim: m.nim, nama: m.nama, angkatan: m.angkatan || "" }));
      return Array.from(map.values());
    });
    setCopyPickerOpen(false);
    setCopySearch("");
  };

  const addManualRosterRow = () => {
    const nim = onlyDigits(rNim).slice(0, 15);
    const nm = rNama.trim();
    if (!nim) { setRosterError("NIM wajib diisi"); return; }
    if (!nm) { setRosterError("Nama wajib diisi"); return; }
    if (newRoster.some((r) => r.nim === nim)) { setRosterError("NIM ini sudah ada di daftar"); return; }
    setNewRoster((prev) => [...prev, { nim, nama: nm, angkatan: onlyDigits(rAngkatan).slice(0, 4) }]);
    setRNim(""); setRNama(""); setRAngkatan("");
    setRosterError(null);
  };
  const removeRosterRow = (nim: string) => setNewRoster((prev) => prev.filter((r) => r.nim !== nim));

  const onRosterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportError(null);
    setImportRows(null);
    const res = await importMahasiswaPreview(file);
    setImportLoading(false);
    if (res.success && res.rows) {
      setImportRows(res.rows);
    } else {
      setImportError(res.error || "Gagal membaca berkas Excel");
    }
  };

  const useImportedRosterRows = () => {
    if (!importRows) return;
    const valid = importRows.filter((r) => r.status !== "error");
    setNewRoster((prev) => {
      const map = new Map(prev.map((r) => [r.nim, r]));
      valid.forEach((r) => map.set(r.nim, { nim: r.nim, nama: r.nama, angkatan: r.angkatan }));
      return Array.from(map.values());
    });
    setImportRows(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, boolean> = {
      kode: !kode.trim(),
      nama: !nama.trim(),
      kelas: !kelas.trim(),
      semester: !semester || Number(semester) <= 0,
      hari: !hari.trim(),
      ruangan: !ruangan.trim(),
      jamSelesai: !jamMulai || !jamSelesai || jamSelesai <= jamMulai,
    };
    setErrors(nextErrors);
    setServerError(nextErrors.jamSelesai ? "Jam selesai harus setelah jam mulai" : null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    try {
      const result = await onSubmit({
        kode: kode.trim(),
        nama: nama.trim(),
        kelas: kelas.trim(),
        sks: sks.trim() || "—",
        koor: koor.trim() || "—",
        dosen: dosenPengampu,
        pjId,
        tipe,
        semester: Number(semester),
        hari: hari.trim(),
        jamMulai,
        jamSelesai,
        ruangan: ruangan.trim(),
        newRoster: !course && newRoster.length > 0 ? newRoster : undefined,
      });

      if (!result.success) {
        setServerError(result.error || "Gagal menyimpan mata kuliah");
        return;
      }
      setSavedSummary({
        kode: kode.trim(),
        nama: nama.trim(),
        kelas: kelas.trim(),
        hari: hari.trim(),
        jamMulai,
        jamSelesai,
        roster: course ? course.roster.map((m) => ({ nim: m.nim, nama: m.nama, angkatan: m.angkatan || "" })) : newRoster,
        isNew: !course,
      });
    } catch (err: any) {
      // Jaga-jaga: tombol tidak boleh macet meski terjadi error tak terduga
      setServerError(err?.message || "Terjadi kesalahan tak terduga saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const borderFor = (key: string) => (errors[key] ? { borderColor: "var(--rose)" } : undefined);

  // Setelah simpan berhasil, tampilkan ringkasan mata kuliah + mahasiswa alih-alih
  // menutup modal langsung — supaya jelas siapa saja yang barusan masuk.
  if (savedSummary) {
    return (
      <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cfSuccessTitle" style={{ maxWidth: "480px" }}>
          <div className="sheet-h">
            <span className="step">Tersimpan</span>
            <div>
              <h2 id="cfSuccessTitle">Mata kuliah tersimpan</h2>
              <p>{savedSummary.kode} · {savedSummary.nama} · Kelas {savedSummary.kelas} · {savedSummary.hari} {savedSummary.jamMulai}–{savedSummary.jamSelesai}</p>
            </div>
            <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
          </div>
          <div className="sheet-b">
            <fieldset>
              <legend>{savedSummary.roster.length} mahasiswa terdaftar</legend>
              {savedSummary.isNew && savedSummary.roster.length > 0 && (
                <p className="hint" style={{ margin: "0 0 10px" }}>
                  Semua mahasiswa berikut baru ditambahkan bersama mata kuliah ini.
                </p>
              )}
              <div className="scroll" style={{ maxHeight: "320px" }}>
                <table className="plain">
                  <thead><tr><th>NIM</th><th>Nama</th><th>Angkatan</th></tr></thead>
                  <tbody>
                    {savedSummary.roster.map((m) => (
                      <tr key={m.nim}>
                        <td className="num">{m.nim}</td>
                        <td><b>{m.nama}</b></td>
                        <td>{m.angkatan || "—"}</td>
                      </tr>
                    ))}
                    {savedSummary.roster.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--ink-3)", padding: "16px" }}>Belum ada mahasiswa di mata kuliah ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </fieldset>
          </div>
          <div className="sheet-f">
            <span className="hint">Kelola roster lengkap lewat menu Daftar Kelas.</span>
            <button className="btn btn-p" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    );
  }

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
              <label className="f"><span>Kelas <em>· label saja, roster diatur terpisah</em></span>
                <input type="text" value={kelas} placeholder="1C"
                  style={borderFor("kelas")}
                  onChange={(e) => setKelas(e.target.value)} />
              </label>
            </div>
            <div className="row c2">
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
            </div>
            <div className="row">
              <label className="f"><span>Nama mata kuliah</span>
                <input type="text" value={nama} placeholder="Contoh: Imunoserologi"
                  style={borderFor("nama")}
                  onChange={(e) => setNama(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="f"><span>Penanggung Jawab (PJ Mahasiswa) <em>· satu PJ, bisa diganti</em></span>
                <div className="combo" ref={pjPickerRef}>
                  {pjId && !pjPickerOpen ? (
                    <div className="absent-list">
                      <div className="absent-row">
                        <div className="who"><b>{pjNama}</b></div>
                        <button type="button" className="btn btn-sm" onClick={() => setPjPickerOpen(true)}>Ganti</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button type="button" className="combo-trigger" onClick={() => setPjPickerOpen((o) => !o)}>
                        <i>🔍</i> {pjId ? "Cari pengganti PJ…" : "Pilih Penanggung Jawab…"}
                      </button>
                      {pjPickerOpen && (
                        <div className="combo-panel">
                          <input
                            className="combo-search"
                            autoFocus
                            placeholder="Cari NIM atau nama PJ"
                            value={pjSearch}
                            onChange={(e) => setPjSearch(e.target.value)}
                          />
                          <div className="combo-list">
                            {pjOptions.length === 0 ? (
                              <div className="combo-empty">
                                {pjList.length === 0 ? "Belum ada data Penanggung Jawab" : "Tidak ditemukan"}
                              </div>
                            ) : (
                              pjOptions.map((p) => (
                                <button type="button" key={p.id} className="combo-item" onClick={() => pickPJ(p)}>
                                  <span className="nim">{p.nim}</span>{p.nama}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Mahasiswa</legend>
            {course ? (
              <p className="hint" style={{ margin: 0 }}>
                {course.mhs} mahasiswa terdaftar di mata kuliah ini. Tambah/keluarkan mahasiswa lewat menu <b>Daftar Kelas</b>.
              </p>
            ) : (
              <>
                <p className="hint" style={{ margin: "0 0 10px" }}>
                  Opsional — bisa juga diisi belakangan lewat Daftar Kelas.
                </p>
                <div className="row c3">
                  <label className="f"><span>NIM</span>
                    <input type="text" inputMode="numeric" value={rNim} placeholder="2250391001"
                      onChange={(e) => setRNim(onlyDigits(e.target.value).slice(0, 15))} />
                  </label>
                  <label className="f"><span>Nama</span>
                    <input type="text" value={rNama} placeholder="Nama mahasiswa"
                      onChange={(e) => setRNama(e.target.value)} />
                  </label>
                  <label className="f"><span>Angkatan</span>
                    <input type="text" inputMode="numeric" value={rAngkatan} placeholder="2022"
                      onChange={(e) => setRAngkatan(onlyDigits(e.target.value).slice(0, 4))} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: "8px", margin: "2px 0 4px", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-sm" onClick={addManualRosterRow}>+ Tambah baris</button>
                  <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>⇪ Upload Excel</button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onRosterFile} />
                  <div className="combo" ref={copyPickerRef} style={{ display: "inline-block" }}>
                    <button type="button" className="btn btn-sm" onClick={() => setCopyPickerOpen((o) => !o)}>📋 Salin dari mata kuliah lain</button>
                    {copyPickerOpen && (
                      <div className="combo-panel">
                        <input
                          className="combo-search"
                          autoFocus
                          placeholder="Cari kode, nama, atau kelas mata kuliah"
                          value={copySearch}
                          onChange={(e) => setCopySearch(e.target.value)}
                        />
                        <div className="combo-list">
                          {copyOptions.length === 0 ? (
                            <div className="combo-empty">Tidak ada mata kuliah dengan mahasiswa yang cocok</div>
                          ) : (
                            copyOptions.map((c) => (
                              <button type="button" key={c.id} className="combo-item" onClick={() => copyRosterFrom(c)}>
                                <span className="nim">{c.kelas}</span>{c.nama} · {c.roster.length} mahasiswa
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {rosterError && <p style={{ color: "var(--rose)", fontSize: "11px", margin: "0 0 6px" }}>{rosterError}</p>}
                {importLoading && <p className="hint" style={{ margin: "0 0 6px" }}>Membaca berkas…</p>}
                {importError && <p style={{ color: "var(--rose)", fontSize: "11px", margin: "0 0 6px" }}>{importError}</p>}
                {importRows && (
                  <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r)", padding: "10px", margin: "0 0 10px" }}>
                    <p className="hint" style={{ margin: "0 0 6px" }}>
                      {importRows.filter((r) => r.status !== "error").length} baris valid dari {importRows.length} baris terbaca.
                    </p>
                    <div className="scroll" style={{ maxHeight: "160px" }}>
                      <table className="plain">
                        <thead><tr><th>NIM</th><th>Nama</th><th>Angkatan</th><th>Status</th></tr></thead>
                        <tbody>
                          {importRows.map((r, i) => (
                            <tr key={`${r.nim}-${i}`}>
                              <td className="num">{r.nim || "—"}</td>
                              <td>{r.nama || "—"}</td>
                              <td>{r.angkatan || "—"}</td>
                              <td><span className={`tag ${r.status === "error" ? "t-off" : "t-done"}`} style={{ fontSize: "10px" }}>{r.status === "error" ? "Error" : "OK"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button type="button" className="btn btn-sm btn-p" onClick={useImportedRosterRows}>
                        Gunakan {importRows.filter((r) => r.status !== "error").length} baris ini
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => { setImportRows(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Batal</button>
                    </div>
                  </div>
                )}
                {newRoster.length > 0 ? (
                  <div className="absent-list">
                    {newRoster.map((r) => (
                      <div className="absent-row" key={r.nim}>
                        <div className="who"><b>{r.nama}</b><span>{r.nim}{r.angkatan ? ` · Angkatan ${r.angkatan}` : ""}</span></div>
                        <button type="button" className="rm" aria-label="Hapus" onClick={() => removeRosterRow(r.nim)}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="absent-empty">Belum ada mahasiswa ditambahkan.</p>
                )}
              </>
            )}
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
                <input type="time" value={jamMulai} style={borderFor("jamSelesai")}
                  onChange={(e) => setJamMulai(e.target.value)} />
              </label>
              <label className="f"><span>Jam Selesai</span>
                <input type="time" value={jamSelesai} style={borderFor("jamSelesai")}
                  onChange={(e) => setJamSelesai(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Pengajar</legend>

            <label className="f"><span>Dosen Koordinator <em>· satu dosen, bisa diganti</em></span>
              <div className="combo" ref={koorPickerRef}>
                {koor && !koorPickerOpen ? (
                  <div className="absent-list">
                    <div className="absent-row">
                      <div className="who"><b>{koor}</b></div>
                      <button type="button" className="btn btn-sm" onClick={() => setKoorPickerOpen(true)}>Ganti</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" className="combo-trigger" onClick={() => setKoorPickerOpen((o) => !o)}>
                      <i>🔍</i> {koor ? "Cari pengganti koordinator…" : "Pilih koordinator dosen…"}
                    </button>
                    {koorPickerOpen && (
                      <div className="combo-panel">
                        <input
                          className="combo-search"
                          autoFocus
                          placeholder="Cari nama dosen"
                          value={koorSearch}
                          onChange={(e) => setKoorSearch(e.target.value)}
                        />
                        <div className="combo-list">
                          {koorOptions.length === 0 ? (
                            <div className="combo-empty">Tidak ditemukan</div>
                          ) : (
                            koorOptions.map((d) => (
                              <button type="button" key={d.id} className="combo-item" onClick={() => pickKoor(d.nama)}>
                                <span className="nim">{d.nid}</span>{d.nama}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </label>

            <label className="f"><span>Dosen Pengampu <em>· bisa lebih dari satu</em></span>
              <div className="combo" ref={dosenPickerRef}>
                <button type="button" className="combo-trigger" onClick={() => setDosenPickerOpen((o) => !o)}>
                  <i>🔍</i> Cari dan tambah dosen pengampu…
                </button>
                {dosenPickerOpen && (
                  <div className="combo-panel">
                    <input
                      className="combo-search"
                      autoFocus
                      placeholder="Cari nama dosen"
                      value={dosenSearch}
                      onChange={(e) => setDosenSearch(e.target.value)}
                    />
                    <div className="combo-list">
                      {dosenOptions.length === 0 ? (
                        <div className="combo-empty">
                          {dosenList.length === dosenPengampu.length ? "Semua dosen sudah dipilih" : "Tidak ditemukan"}
                        </div>
                      ) : (
                        dosenOptions.map((d) => (
                          <button type="button" key={d.id} className="combo-item" onClick={() => addDosenPengampu(d.nama)}>
                            <span className="nim">{d.nid}</span>{d.nama}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>

            {dosenPengampu.length > 0 ? (
              <div className="absent-list">
                {dosenPengampu.map((nama) => (
                  <div className="absent-row" key={nama}>
                    <div className="who">
                      <b>{nama}</b>
                    </div>
                    <button type="button" className="rm" aria-label="Hapus" onClick={() => removeDosenPengampu(nama)}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="absent-empty">Belum ada dosen pengampu yang dipilih.</p>
            )}
          </fieldset>
          {serverError && (
            <p style={{ color: "var(--rose)", fontSize: "12px", margin: "8px 0 0" }}>{serverError}</p>
          )}
        </div>

        <div className="sheet-f">
          <span className="hint">{course ? "Perubahan langsung memengaruhi rekapitulasi." : "Berita acara 16 pertemuan dibuat otomatis, kosong."}</span>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : course ? "Simpan Perubahan" : "Simpan mata kuliah"}
          </button>
        </div>
      </div>
    </div>
  );
}
