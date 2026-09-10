"use client";

import { useEffect, useRef } from "react";
import type { MataKuliah, PJUser, ReminderTarget } from "@/lib/types";
import { formatWAUrl } from "@/lib/format";

function buildTargets(courses: MataKuliah[], pjList: PJUser[]): ReminderTarget[] {
  const map = new Map<number, ReminderTarget>();

  for (const m of courses) {
    if (!m.pjId) continue;
    const filled = m.rows.filter((r) => r.tipe === "kuliah" && r.topik).length;
    const unfilled = m.rows.filter((r) => r.tipe === "kuliah" && !r.topik).length;
    if (unfilled === 0) continue;

    const pj = pjList.find((p) => p.id === m.pjId);
    if (!pj) continue;

    if (!map.has(m.pjId)) {
      map.set(m.pjId, {
        pjId: m.pjId,
        pjNama: pj.nama,
        noHp: pj.noHp || "",
        courses: [],
      });
    }
    map.get(m.pjId)!.courses.push({
      kode: m.kode,
      nama: m.nama,
      kelas: m.kelas,
      filledCount: filled,
      unfilledCount: unfilled,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const totalA = a.courses.reduce((s, c) => s + c.unfilledCount, 0);
    const totalB = b.courses.reduce((s, c) => s + c.unfilledCount, 0);
    return totalB - totalA; // urut dari paling banyak tunggakan
  });
}

function buildWAMessage(target: ReminderTarget): string {
  const courseLines = target.courses
    .map((c) => `  • ${c.nama} (Kelas ${c.kelas}) — ${c.unfilledCount} pertemuan belum diisi`)
    .join("\n");
  return (
    `Halo Sdr/i *${target.pjNama}*,\n\n` +
    `Anda memiliki berita acara kuliah yang belum lengkap di sistem *HONJAR UNJANI*:\n\n` +
    `${courseLines}\n\n` +
    `Mohon segera mengisi berita acara melalui sistem HONJAR. Batas pengisian maksimal 1 bulan setelah tanggal perkuliahan.\n\n` +
    `Terima kasih. 🙏\n_— Admin Prodi TLM D4 UNJANI_`
  );
}

interface Props {
  courses: MataKuliah[];
  pjList: PJUser[];
  onClose: () => void;
}

export default function ReminderModal({ courses, pjList, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const targets = buildTargets(courses, pjList);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openWA = (target: ReminderTarget) => {
    const msg = buildWAMessage(target);
    window.open(formatWAUrl(target.noHp, msg), "_blank", "noopener,noreferrer");
  };

  const handleBroadcast = () => {
    for (const t of targets) {
      const msg = buildWAMessage(t);
      window.open(formatWAUrl(t.noHp, msg), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={modalRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminderTitle"
        style={{ maxWidth: "560px" }}
      >
        {/* Header */}
        <div className="sheet-h">
          <span className="step">Pengingat</span>
          <div>
            <h2 id="reminderTitle">Kirim Pengingat ke Penanggung Jawab</h2>
            <p>
              {targets.length === 0
                ? "Semua Penanggung Jawab sudah melengkapi berita acaranya."
                : `${targets.length} Penanggung Jawab memiliki tunggakan pengisian berita acara.`}
            </p>
          </div>
          <button className="iconbtn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="sheet-b">
          {targets.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "var(--ink-3)",
              fontSize: "14px"
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
              <b style={{ color: "var(--ink-1)" }}>Semua berita acara sudah lengkap!</b>
              <p style={{ margin: "6px 0 0" }}>Tidak ada Penanggung Jawab yang perlu diingatkan.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {targets.map((t) => {
                const totalUnfilled = t.courses.reduce((s, c) => s + c.unfilledCount, 0);
                const hasHp = t.noHp && t.noHp.trim().length > 0;
                return (
                  <div key={t.pjId} style={{
                    border: "1px solid var(--rule)",
                    borderRadius: "var(--r)",
                    padding: "14px 16px",
                    background: "var(--surface)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                        <b style={{ fontSize: "14px" }}>{t.pjNama}</b>
                        <span className="tag t-off" style={{ fontSize: "11px" }}>
                          {totalUnfilled} pertemuan belum diisi
                        </span>
                      </div>
                      {hasHp ? (
                        <p style={{ fontSize: "12px", color: "var(--ink-3)", margin: "0 0 8px" }}>
                          📱 {t.noHp}
                        </p>
                      ) : (
                        <p style={{ fontSize: "12px", color: "var(--rose)", margin: "0 0 8px" }}>
                          ⚠️ Nomor HP belum diisi — kirim WA tetap dapat dilakukan tanpa nomor
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {t.courses.map((c) => (
                          <div key={c.kode} style={{ fontSize: "12px", color: "var(--ink-2)" }}>
                            · {c.nama} <span style={{ color: "var(--ink-3)" }}>(Kelas {c.kelas})</span>
                            {" "}— <span style={{ color: "var(--rose)" }}>{c.unfilledCount} belum</span>
                            {" / "}
                            <span style={{ color: "var(--verd)" }}>{c.filledCount} sudah</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Aksi */}
                    <button
                      className="btn btn-sm"
                      onClick={() => openWA(t)}
                      style={{
                        whiteSpace: "nowrap",
                        background: "var(--verd)",
                        color: "#fff",
                        border: "none",
                        flexShrink: 0,
                      }}
                    >
                      💬 Kirim WA
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sheet-f">
          <span className="hint">
            {targets.length > 0
              ? "Pesan WA dihasilkan otomatis berdasarkan data tunggakan."
              : ""}
          </span>
          <button className="btn" onClick={onClose}>Tutup</button>
          {targets.length > 0 && (
            <button
              className="btn btn-p"
              onClick={handleBroadcast}
              title="Buka tab WA untuk semua PJ yang memiliki tunggakan"
            >
              💬 Kirim ke Semua ({targets.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
