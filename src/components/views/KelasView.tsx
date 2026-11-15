"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import type { AbsentRecord, MataKuliah } from "@/lib/types";

const STATUS_SYMBOL: Record<string, string> = { sakit: "S", izin: "I", tanpa: "✕" };
const STATUS_LABEL: Record<string, string> = { sakit: "Sakit", izin: "Izin", tanpa: "Tanpa keterangan" };

// Panel yang bisa dilipat/dibuka — dipakai untuk tiap bagian di detail kelas
// (Jadwal, Mahasiswa, Presensi, Surat) supaya tidak perlu scroll jauh kalau
// sebagian besar tidak sedang dibutuhkan.
function SectionPanel({
  title, subtitle, defaultOpen = true, right, children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel">
      <div className="panel-h">
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="panel-chevron" style={{ transform: open ? "rotate(90deg)" : "none" }}>▸</span>
          <h2>{title}</h2>
        </button>
        {subtitle && <p>{subtitle}</p>}
        {right && (
          <div className="right" onClick={(e) => e.stopPropagation()}>
            {right}
          </div>
        )}
      </div>
      {open && children}
    </div>
  );
}

export default function KelasView() {
  const { courses } = useApp();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          a.semester - b.semester ||
          a.nama.localeCompare(b.nama) ||
          a.kelas.localeCompare(b.kelas) ||
          (a.tipe === "Teori" ? -1 : 1)
      ),
    [courses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.kode.toLowerCase().includes(q) ||
        c.kelas.toLowerCase().includes(q) ||
        c.pj.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const selected = selectedId ? courses.find((c) => c.id === selectedId) : null;
  if (selectedId && selected) {
    return <KelasDetail course={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="panel">
        <div className="panel-h">
          <h2>Daftar kelas</h2>
          <p>Roster mahasiswa per mata kuliah. Klik satu baris untuk melihat jadwal dan mengelola pesertanya.</p>
          <div className="right">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Cari mata kuliah atau kelas..."
              style={{
                padding: "6px 10px",
                fontSize: "12.5px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                minWidth: "220px"
              }}
            />
          </div>
        </div>
        <div className="scroll-hint">
          <span>👉 Geser tabel ke samping untuk melihat angkatan & tombol ⭐ Jadikan PJ</span>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Kelas</th>
                <th>PJ</th>
                <th>Jumlah mahasiswa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(c.id)}>
                  <td><b>{c.nama}</b> <span style={{ color: "var(--ink-3)", fontSize: "11.5px" }}>{c.kode}</span></td>
                  <td>{c.kelas}</td>
                  <td>{c.pj || "—"}</td>
                  <td className="num">{c.roster.length}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>Lihat detail</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
                    {sorted.length === 0 ? "Belum ada mata kuliah." : "Tidak ada mata kuliah yang cocok dengan pencarian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function KelasDetail({ course, onBack }: { course: MataKuliah; onBack: () => void }) {
  const { courses, mahasiswaList, pjList, updateCourse, addPJ, addToRoster, addBatchToRoster, removeFromRoster, importMahasiswaPreview, showToast } = useApp();
  const [showAddNew, setShowAddNew] = useState(false);
  const [newNim, setNewNim] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newAngkatan, setNewAngkatan] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pencarian mahasiswa khusus di dalam kelas ini
  const [rosterSearch, setRosterSearch] = useState("");
  const [busyNim, setBusyNim] = useState<string | null>(null);
  const nimRef = useRef<HTMLInputElement>(null);

  // Salin dari mata kuliah lain
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [copySearch, setCopySearch] = useState("");
  const copyPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (copyPickerRef.current && !copyPickerRef.current.contains(e.target as Node)) {
        setCopyPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rosterNimSet = useMemo(() => new Set(course.roster.map((m) => m.nim)), [course.roster]);

  // Mahasiswa di kelas ini yang cocok dengan pencarian
  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return course.roster;
    return course.roster.filter(
      (m) => m.nama.toLowerCase().includes(q) || m.nim.includes(q)
    );
  }, [course.roster, rosterSearch]);

  const copyOptions = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    return courses.filter(
      (c) =>
        c.id !== course.id &&
        c.roster.length > 0 &&
        (!q ||
          c.nama.toLowerCase().includes(q) ||
          c.kode.toLowerCase().includes(q) ||
          c.kelas.toLowerCase().includes(q))
    );
  }, [courses, course.id, copySearch]);

  const handleCopyFromCourse = async (sourceCourse: MataKuliah) => {
    if (sourceCourse.roster.length === 0) return;
    const missing = sourceCourse.roster.filter((m) => !rosterNimSet.has(m.nim));
    if (missing.length === 0) {
      showToast("error", `Semua mahasiswa dari ${sourceCourse.nama} (${sourceCourse.kelas}) sudah terdaftar di kelas ini.`);
      setCopyPickerOpen(false);
      return;
    }
    setSaving(true);
    await addBatchToRoster(course.id, missing);
    setSaving(false);
    setCopyPickerOpen(false);
    setCopySearch("");
  };

  const onUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await importMahasiswaPreview(file);
      if (res.success && res.rows) {
        const valid = res.rows
          .filter((r) => r.status !== "error" && r.nim)
          .map((r) => ({ nim: r.nim, nama: r.nama, angkatan: r.angkatan }));
        if (valid.length === 0) {
          showToast("error", "Tidak ada baris data mahasiswa yang valid pada berkas Excel.");
          return;
        }
        await addBatchToRoster(course.id, valid);
      } else {
        showToast("error", res.error || "Gagal membaca berkas Excel");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Gagal mengunggah berkas Excel");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const handleNimInput = (val: string) => {
    const digits = onlyDigits(val).slice(0, 15);
    setNewNim(digits);
    // Jika NIM ini sudah ada di database kampus, otomatis isi Nama dan Angkatan
    const found = mahasiswaList.find((m) => m.nim === digits);
    if (found) {
      setNewNama(found.nama);
      setNewAngkatan(found.angkatan || "");
    }
  };

  const handleAddNew = async () => {
    const nim = onlyDigits(newNim).slice(0, 15);
    const nama = newNama.trim();
    if (!nim) { setAddError("NIM wajib diisi"); return; }
    if (!nama) { setAddError("Nama wajib diisi"); return; }
    setAddError(null);
    setSaving(true);
    const result = await addToRoster(course.id, { nim, nama, angkatan: onlyDigits(newAngkatan).slice(0, 4) });
    setSaving(false);
    if (!result.success) {
      setAddError(result.error || "Gagal menambahkan mahasiswa");
      return;
    }
    setNewNim(""); setNewNama(""); setNewAngkatan("");
    setShowAddNew(false);
  };

  const handleSetPj = async (m: { nim: string; nama: string; angkatan?: string }) => {
    setBusyNim(m.nim);
    try {
      // 1. Cek apakah mahasiswa ini sudah punya akun login PJ
      let pjUser = pjList.find((p) => p.nim === m.nim || p.username === m.nim);
      let targetPjId = pjUser?.id;

      if (!targetPjId) {
        // Otomatis buat akun PJ dengan default password adalah NIM mahasiswa
        const createRes = await addPJ({
          nim: m.nim,
          nama: m.nama,
          angkatan: m.angkatan || "",
          noHp: "",
          password: m.nim,
        });
        if (!createRes.success) {
          showToast("error", createRes.error || "Gagal membuat akun login PJ untuk mahasiswa ini.");
          setBusyNim(null);
          return;
        }
        const freshPj = await fetch("/api/pj").then((r) => r.json()).catch(() => []);
        const newlyCreated = Array.isArray(freshPj)
          ? freshPj.find((p: any) => p.nim === m.nim || p.username === m.nim)
          : null;
        targetPjId = newlyCreated?.id;
      }

      if (!targetPjId) {
        showToast("error", "Gagal menetapkan PJ: ID pengguna tidak ditemukan.");
        setBusyNim(null);
        return;
      }

      const res = await updateCourse(course.id, {
        kode: course.kode,
        nama: course.nama,
        kelas: course.kelas,
        sks: course.sks,
        koor: course.koor,
        dosen: course.dosen,
        tipe: course.tipe,
        semester: course.semester,
        hari: course.hari,
        jamMulai: course.jamMulai,
        jamSelesai: course.jamSelesai,
        ruangan: course.ruangan,
        tahunAjaran: course.tahunAjaran,
        pjId: targetPjId,
        pjIds: [targetPjId],
      });

      if (res.success) {
        showToast("success", `${m.nama} berhasil ditetapkan sebagai PJ untuk ${course.nama} (${course.kelas}).`);
      } else {
        showToast("error", res.error || "Gagal memperbarui PJ mata kuliah.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Terjadi kesalahan saat menetapkan PJ.");
    } finally {
      setBusyNim(null);
    }
  };

  const removeFromCourse = async (nim: string, nama: string) => {
    if (!confirm(`Keluarkan "${nama}" dari mata kuliah ini?`)) return;
    setBusyNim(nim);
    await removeFromRoster(course.id, nim);
    setBusyNim(null);
  };

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <button className="btn btn-sm" onClick={onBack}>← Kembali ke Daftar kelas</button>
      </div>

      <SectionPanel
        title={course.nama}
        subtitle={<>{course.kode} · Kelas {course.kelas} · {course.roster.length} mahasiswa</>}
      >
        <div className="scroll-hint">
          <span>👉 Geser tabel ke samping untuk melihat angkatan & tombol ⭐ Jadikan PJ</span>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Hari</th>
                <th>Jam</th>
                <th>Ruangan</th>
                <th>Koordinator</th>
                <th>Dosen Pengampu</th>
                <th>PJ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{course.hari}</td>
                <td>{course.jamMulai}–{course.jamSelesai}</td>
                <td>{course.ruangan}</td>
                <td>{course.koor}</td>
                <td>{course.dosen.length > 0 ? course.dosen.join(", ") : "—"}</td>
                <td>{course.pj || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Mahasiswa"
        subtitle={
          <>
            Daftar mahasiswa peserta mata kuliah ini.{" "}
            {rosterSearch ? (
              <b>(Menampilkan {filteredRoster.length} dari {course.roster.length} mahasiswa)</b>
            ) : (
              <span>(Total {course.roster.length} mahasiswa)</span>
            )}
          </>
        }
        right={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Kolom cari mahasiswa khusus di dalam kelas ini */}
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="🔍 Cari nama atau NIM di kelas ini..."
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                minWidth: "220px",
              }}
            />

            {/* Salin dari mata kuliah lain */}
            <div className="combo" ref={copyPickerRef}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setCopyPickerOpen((o) => !o)}
                title="Salin seluruh peserta mahasiswa dari kelas atau mata kuliah lain dalam satu klik"
              >
                📋 Salin dari Kelas Lain
              </button>
              {copyPickerOpen && (
                <div className="combo-panel" style={{ right: 0, left: "auto", minWidth: "320px" }}>
                  <input
                    className="combo-search"
                    autoFocus
                    placeholder="Cari nama atau kelas mata kuliah..."
                    value={copySearch}
                    onChange={(e) => setCopySearch(e.target.value)}
                  />
                  <div className="combo-list">
                    {copyOptions.length === 0 ? (
                      <div className="combo-empty">Tidak ada mata kuliah lain dengan peserta mahasiswa</div>
                    ) : (
                      copyOptions.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          className="combo-item"
                          onClick={() => handleCopyFromCourse(c)}
                          style={{ justifyContent: "space-between" }}
                        >
                          <span>
                            <span className="nim">{c.kelas}</span>
                            <b>{c.nama}</b> ({c.tipe})
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                            {c.roster.length} mhs
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Excel Roster */}
            <button
              type="button"
              className="btn btn-sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Unggah berkas Excel daftar mahasiswa untuk dimasukkan langsung ke kelas ini"
            >
              {uploading ? "Membaca..." : "⇪ Upload Excel"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={onUploadExcel}
            />

            <button
              className="btn btn-sm btn-p"
              onClick={() => { setShowAddNew((o) => !o); setTimeout(() => nimRef.current?.focus(), 0); }}
            >
              ＋ Tambah Mahasiswa
            </button>
          </div>
        }
      >
        {showAddNew && (
          <div style={{ padding: "0 20px 16px" }}>
            <div className="row c3">
              <label className="f"><span>NIM <em>(auto-fill jika terdaftar)</em></span>
                <input ref={nimRef} type="text" inputMode="numeric" value={newNim} placeholder="2250391001"
                  onChange={(e) => handleNimInput(e.target.value)} />
              </label>
              <label className="f"><span>Nama</span>
                <input type="text" value={newNama} placeholder="Nama mahasiswa"
                  onChange={(e) => setNewNama(e.target.value)} />
              </label>
              <label className="f"><span>Angkatan</span>
                <input type="text" inputMode="numeric" value={newAngkatan} placeholder="2022"
                  onChange={(e) => setNewAngkatan(onlyDigits(e.target.value).slice(0, 4))} />
              </label>
            </div>
            {addError && <p style={{ color: "var(--rose)", fontSize: "11px", margin: "4px 0" }}>{addError}</p>}
            <button className="btn btn-sm btn-p" onClick={handleAddNew} disabled={saving}>{saving ? "Menyimpan..." : "Tambahkan"}</button>{" "}
            <button className="btn btn-sm" onClick={() => setShowAddNew(false)}>Batal</button>
          </div>
        )}

        <div className="scroll-hint">
          <span>👉 Geser tabel ke samping untuk melihat angkatan & tombol ⭐ Jadikan PJ</span>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>NIM</th>
                <th>Nama</th>
                <th>Angkatan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((m) => {
                const pjUser = pjList.find((p) => p.nim === m.nim || p.username === m.nim);
                const isCurrentPj = Boolean(
                  (pjUser && course.pjIds?.includes(pjUser.id)) ||
                  (pjUser && course.pjId === pjUser.id) ||
                  (course.pj && course.pj.toLowerCase().includes(m.nama.toLowerCase()))
                );

                return (
                  <tr key={m.nim}>
                    <td className="num">{m.nim}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <b>{m.nama}</b>
                        {isCurrentPj && (
                          <span
                            className="tag t-stamp"
                            style={{
                              fontSize: "10.5px",
                              background: "#FEF3C7",
                              color: "#92400E",
                              border: "1px solid #FCD34D",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            ⭐ PJ Kelas
                          </span>
                        )}
                      </span>
                    </td>
                    <td>{m.angkatan || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {!isCurrentPj ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busyNim === m.nim}
                          onClick={() => handleSetPj(m)}
                          title={`Jadikan ${m.nama} sebagai Penanggung Jawab (PJ) mata kuliah ini`}
                          style={{ marginRight: "6px" }}
                        >
                          ⭐ Jadikan PJ
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--verd)", marginRight: "8px", fontWeight: "bold" }}>
                          ✓ PJ Aktif
                        </span>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ color: "var(--rose)" }}
                        disabled={busyNim === m.nim}
                        onClick={() => removeFromCourse(m.nim, m.nama)}
                      >
                        {busyNim === m.nim ? "Memproses..." : "Keluarkan"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRoster.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "20px" }}>
                    {course.roster.length === 0
                      ? "Belum ada mahasiswa di mata kuliah ini. Gunakan 'Salin dari Kelas Lain' atau 'Upload Excel' di atas."
                      : `Tidak ada mahasiswa di kelas ini yang cocok dengan pencarian "${rosterSearch}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <PresensiPanel course={course} />
      <SuratPanel course={course} />
    </section>
  );
}

// Simbol kehadiran per (mahasiswa, pertemuan) — diturunkan langsung dari
// course.rows[].absents, bukan query terpisah, karena datanya memang sudah
// lengkap dibawa oleh /api/courses.
function attendanceCell(course: MataKuliah, nim: string): { ke: number; symbol: string; cls: string; title: string; fileUrl?: string }[] {
  return course.rows.map((r) => {
    if (r.tipe !== "kuliah") return { ke: r.ke, symbol: "—", cls: "att-none", title: r.tipe.toUpperCase() };
    if (!r.topik) return { ke: r.ke, symbol: "—", cls: "att-none", title: "Belum diisi" };
    const absent = r.absents?.find((a) => a.nim === nim);
    if (!absent) return { ke: r.ke, symbol: "✓", cls: "att-hadir", title: "Hadir" };
    return {
      ke: r.ke,
      symbol: STATUS_SYMBOL[absent.status] || "✕",
      cls: absent.status === "tanpa" ? "att-tanpa" : "att-izin",
      title: STATUS_LABEL[absent.status] || absent.status,
      fileUrl: absent.fileUrl,
    };
  });
}

function PresensiPanel({ course }: { course: MataKuliah }) {
  const kes = course.rows.map((r) => r.ke).sort((a, b) => a - b);

  return (
    <SectionPanel
      title="Daftar presensi"
      subtitle="Terhubung otomatis dengan berita acara yang diisi PJ. Kolom S/I yang berwarna bisa diklik untuk melihat surat."
      defaultOpen={false}
    >
      <div className="scroll">
        <table className="plain att-table">
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "var(--paper)" }}>Nama</th>
              {kes.map((ke) => {
                const r = course.rows.find((row) => row.ke === ke);
                return <th key={ke} style={{ textAlign: "center" }}>{r?.tipe === "uts" ? "UTS" : r?.tipe === "uas" ? "UAS" : `P${ke}`}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {course.roster.map((m) => {
              const cells = attendanceCell(course, m.nim);
              return (
                <tr key={m.nim}>
                  <td style={{ position: "sticky", left: 0, background: "var(--panel)", whiteSpace: "nowrap" }}><b>{m.nama}</b></td>
                  {cells.map((c) => (
                    <td key={c.ke} className={`att-cell ${c.cls}`} title={c.title}>
                      {c.fileUrl ? (
                        <a href={c.fileUrl} target="_blank" rel="noreferrer" title={`${c.title} · lihat surat`}>{c.symbol}</a>
                      ) : (
                        c.symbol
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {course.roster.length === 0 && (
              <tr>
                <td colSpan={kes.length + 1} style={{ textAlign: "center", color: "var(--ink-3)", padding: "20px" }}>
                  Belum ada mahasiswa di mata kuliah ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ padding: "0 20px 16px", margin: 0 }}>
        ✓ Hadir · S Sakit · I Izin · ✕ Tanpa keterangan · — Belum diisi / UTS / UAS
      </p>
    </SectionPanel>
  );
}

function SuratPanel({ course }: { course: MataKuliah }) {
  const surat = useMemo(() => {
    const list: { ke: number; nim: string; nama: string; status: string; a: AbsentRecord }[] = [];
    course.rows.forEach((r) => {
      if (r.tipe !== "kuliah" || !r.absents) return;
      r.absents.forEach((a) => {
        if (!a.fileUrl) return;
        const nama = course.roster.find((m) => m.nim === a.nim)?.nama || a.nim;
        list.push({ ke: r.ke, nim: a.nim, nama, status: a.status, a });
      });
    });
    return list.sort((x, y) => x.ke - y.ke || x.nama.localeCompare(y.nama));
  }, [course]);

  return (
    <SectionPanel
      title="Surat izin/sakit terlampir"
      subtitle="Semua berkas bukti yang diunggah PJ untuk mata kuliah ini, per pertemuan."
      defaultOpen={false}
    >
      <div className="scroll">
        <table className="plain">
          <thead>
            <tr>
              <th>Pertemuan</th>
              <th>Nama</th>
              <th>Keterangan</th>
              <th>Berkas</th>
            </tr>
          </thead>
          <tbody>
            {surat.map((s) => (
              <tr key={`${s.ke}-${s.nim}`}>
                <td className="num">Ke-{s.ke}</td>
                <td><b>{s.nama}</b></td>
                <td>
                  <span className={`tag ${s.status === "sakit" ? "t-wait" : "t-stamp"}`} style={{ fontSize: "10.5px" }}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </td>
                <td>
                  <a href={s.a.fileUrl} target="_blank" rel="noreferrer">📎 {s.a.fileName || "Lihat berkas"}</a>
                </td>
              </tr>
            ))}
            {surat.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "20px" }}>
                  Belum ada surat yang diunggah untuk mata kuliah ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}
