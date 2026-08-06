"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { fmtTgl, jamAjar, menit } from "@/lib/format";

interface HonorRow {
  dsn: string; tgl: string; a: string; b: string;
  mnt: number; jam: number; mk: string; met: string; kls: string;
}

const MONTH_NAMES: Record<string, string> = {
  all: "Semua Bulan",
  "02": "Februari 2026",
  "03": "Maret 2026",
  "04": "April 2026",
  "05": "Mei 2026",
};

export default function HonorView() {
  const { courses } = useApp();
  const [selectedMonth, setSelectedMonth] = useState("all");

  const rows: HonorRow[] = [];
  courses.forEach((m) => {
    m.rows.forEach((r) => {
      if (r.tipe !== "kuliah" || !r.topik) return;
      if (r.kehadiran === "batal") return;
      if (r.tgl) {
        const parts = r.tgl.split("-");
        const monthNum = parts[1]; // "02", "03", etc.
        if (selectedMonth !== "all" && monthNum !== selectedMonth) return;
      }
      const mnt = menit(r.jam![0], r.jam![1]);
      rows.push({
        dsn: r.dosen!, tgl: r.tgl!, a: r.jam![0], b: r.jam![1],
        mnt, jam: jamAjar(mnt), mk: m.nama, met: r.metode!, kls: m.kelas,
      });
    });
  });
  rows.sort((x, y) => x.dsn.localeCompare(y.dsn) || x.tgl.localeCompare(y.tgl) || x.a.localeCompare(y.a));

  let last: string | null = null, no = 0, jamTot = 0;
  const body: React.ReactNode[] = [];
  rows.forEach((r, i) => {
    jamTot += r.jam;
    if (r.dsn !== last) {
      no++; last = r.dsn;
      const sub = rows.filter((x) => x.dsn === r.dsn);
      body.push(
        <tr className="group" key={`g-${i}`}>
          <td colSpan={10}>
            {no}. {r.dsn}
            <span>{sub.length} sesi · {sub.reduce((a, b) => a + b.jam, 0)} jam</span>
          </td>
        </tr>
      );
    }
    body.push(
      <tr key={i}>
        <td></td>
        <td style={{ color: "var(--ink-2)" }}>{r.dsn}</td>
        <td className="num" style={{ fontSize: 12.5 }}>{fmtTgl(r.tgl).split(", ")[1]}</td>
        <td className="num">{r.a}</td><td className="num">{r.b}</td>
        <td className="num">{r.mnt}</td><td className="num"><b>{r.jam}</b></td>
        <td>{r.mk}</td><td>{r.met}</td><td className="num">{r.kls}</td>
      </tr>
    );
  });

  return (
    <section className="view">
      <div className="cards">
        <div className="stat"><dt>Periode</dt><dd style={{ fontSize: 18 }}>{MONTH_NAMES[selectedMonth]}</dd></div>
        <div className="stat"><dt>Dosen tercatat</dt><dd>{no}</dd></div>
        <div className="stat"><dt>Total sesi</dt><dd>{rows.length}</dd></div>
        <div className="stat"><dt>Total jam</dt><dd>{jamTot}</dd></div>
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Rekapitulasi jam mengajar</h2>
          <div className="right">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "var(--ink)"
              }}
            >
              <option value="all">Semua Bulan</option>
              <option value="02">Februari 2026</option>
              <option value="03">Maret 2026</option>
              <option value="04">April 2026</option>
              <option value="05">Mei 2026</option>
            </select>
            <button className="btn btn-sm">Kunci periode</button>
            <button className="btn btn-sm btn-p">Unduh XLSX</button>
          </div>
          <p>Disusun dari berita acara yang sudah diisi. Tidak ada angka yang diketik ulang di halaman ini.</p>
        </div>
        <div className="scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>No</th><th>Dosen</th><th>Tanggal</th><th>Mulai</th><th>Selesai</th>
                <th>Durasi</th><th>Jam</th><th>Mata kuliah</th><th>Metode</th><th>Kelas</th>
              </tr>
            </thead>
            <tbody>
              {body.length ? body : (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <b>Belum ada pertemuan pada periode ini</b>
                      Rekap terbentuk otomatis setelah PJ mengisi berita acara.
                    </div>
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
