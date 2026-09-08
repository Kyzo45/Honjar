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
    () => [...courses].sort((a, b) => a.nama.localeCompare(b.nama)),
    [courses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.kode.toLowerCase().includes(q) ||
        c.kelas.toLowerCase().includes(q)
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
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Kelas</th>
                <th>Jumlah mahasiswa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(c.id)}>
                  <td><b>{c.nama}</b> <span style={{ color: "var(--ink-3)", fontSize: "11.5px" }}>{c.kode}</span></td>
                  <td>{c.kelas}</td>
                  <td className="num">{c.roster.length}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>Lihat detail</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "24px" }}>
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
  const { mahasiswaList, addToRoster, removeFromRoster } = useApp();
  const [showAddNew, setShowAddNew] = useState(false);
  const [newNim, setNewNim] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newAngkatan, setNewAngkatan] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busyNim, setBusyNim] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const nimRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rosterNimSet = useMemo(() => new Set(course.roster.map((m) => m.nim)), [course.roster]);
  const notInRoster = useMemo(
    () =>
      mahasiswaList.filter(
        (m) => !rosterNimSet.has(m.nim) && (m.nama.toLowerCase().includes(search.toLowerCase()) || m.nim.includes(search))
      ),
    [mahasiswaList, rosterNimSet, search]
  );

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const handleAddExisting = async (nim: string) => {
    setBusyNim(nim);
    await addToRoster(course.id, { nim });
    setBusyNim(null);
    setPickerOpen(false);
    setSearch("");
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
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Hari</th>
                <th>Jam</th>
                <th>Ruangan</th>
                <th>Koordinator</th>
                <th>Dosen Pengampu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{course.hari}</td>
                <td>{course.jamMulai}–{course.jamSelesai}</td>
                <td>{course.ruangan}</td>
                <td>{course.koor}</td>
                <td>{course.dosen.length > 0 ? course.dosen.join(", ") : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Mahasiswa"
        subtitle="Tambah atau keluarkan mahasiswa dari mata kuliah ini."
        right={
          <div style={{ display: "flex", gap: "8px" }}>
            <div className="combo" ref={pickerRef}>
              <button type="button" className="btn btn-sm" onClick={() => setPickerOpen((o) => !o)}>
                🔍 Pilih mahasiswa lain
              </button>
              {pickerOpen && (
                <div className="combo-panel" style={{ right: 0, left: "auto" }}>
                  <input
                    className="combo-search"
                    autoFocus
                    placeholder="Cari nama atau NIM"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="combo-list">
                    {notInRoster.length === 0 ? (
                      <div className="combo-empty">Tidak ada mahasiswa lain yang cocok</div>
                    ) : (
                      notInRoster.map((m) => (
                        <button type="button" key={m.nim} className="combo-item" onClick={() => handleAddExisting(m.nim)}>
                          <span className="nim">{m.nim}</span>{m.nama}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="btn btn-sm btn-p" onClick={() => { setShowAddNew((o) => !o); setTimeout(() => nimRef.current?.focus(), 0); }}>＋ Mahasiswa baru</button>
          </div>
        }
      >
        {showAddNew && (
          <div style={{ padding: "0 20px 16px" }}>
            <div className="row c3">
              <label className="f"><span>NIM</span>
                <input ref={nimRef} type="text" inputMode="numeric" value={newNim} placeholder="2250391001"
                  onChange={(e) => setNewNim(onlyDigits(e.target.value).slice(0, 15))} />
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
              {course.roster.map((m) => (
                <tr key={m.nim}>
                  <td className="num">{m.nim}</td>
                  <td><b>{m.nama}</b></td>
                  <td>{m.angkatan || "—"}</td>
                  <td style={{ textAlign: "right" }}>
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
              ))}
              {course.roster.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "20px" }}>
                    Belum ada mahasiswa di mata kuliah ini.
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
