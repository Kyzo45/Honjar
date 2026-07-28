"use client";

import { useApp } from "@/context/AppContext";
import { fmtTgl } from "@/lib/format";

export default function CetakView() {
  const { courses } = useApp();
  const m = courses[0];

  return (
    <section className="view">
      <div className="panel">
        <div className="panel-h">
          <h2>Pratinjau berita acara</h2>
          <div className="right">
            <button className="btn btn-sm">Unduh semua kelas</button>
            <button className="btn btn-sm btn-p">Unduh PDF</button>
          </div>
          <p>Kolom tanda tangan diganti kolom kehadiran dosen, sesuai kesepakatan dengan program studi.</p>
        </div>
        <div className="pdfbox">
          <div className="page">
            <div className="page-kop">
              <b>UNIVERSITAS JENDERAL ACHMAD YANI</b>
              <span>Fakultas Ilmu dan Teknologi Kesehatan · Program Studi Teknologi Laboratorium Medik (D4)</span>
            </div>
            <h4>Berita Acara Kuliah</h4>
            <div className="page-meta">
              <div>
                <b>Mata kuliah</b> : {m.nama}<br />
                <b>Koordinator</b> : {m.koor}<br />
                <b>Pengampu</b> : {m.dosen.join(" · ")}
              </div>
              <div>
                <b>Tingkat / semester</b> : {m.kelas} / 2<br />
                <b>Semester / T.A.</b> : Genap 2025/2026<br />
                <b>Mahasiswa terdaftar</b> : {m.mhs} orang
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 22 }}>Ke</th><th style={{ width: 74 }}>Hari, tanggal</th>
                  <th style={{ width: 70 }}>Jam</th><th style={{ width: 40 }}>Hadir</th>
                  <th>Pokok bahasan</th><th style={{ width: 96 }}>Dosen</th><th style={{ width: 40 }}>Hadir</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r) => {
                  if (r.tipe !== "kuliah") {
                    return (
                      <tr key={r.ke}>
                        <td colSpan={7} style={{ textAlign: "center", letterSpacing: ".2em", background: "#F2F0EA" }}>
                          {r.tipe.toUpperCase()}
                        </td>
                      </tr>
                    );
                  }
                  if (!r.topik) {
                    return (
                      <tr key={r.ke}>
                        <td>{r.ke}</td><td></td><td></td><td></td><td></td><td></td><td></td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={r.ke}>
                      <td>{r.ke}</td><td>{fmtTgl(r.tgl!)}</td>
                      <td>{r.jam![0]}–{r.jam![1]}</td><td>{r.hadir}</td>
                      <td>{r.topik}<br /><i style={{ color: "#6B7488" }}>{r.metode}</i></td>
                      <td>{r.dosen}</td><td className="cek">✓</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ fontSize: 8.5, color: "#47536B", margin: "9px 0 0" }}>
              Dokumen dihasilkan otomatis oleh SIBAK · 27 Juli 2026 · verifikasi: sibak.unjani.ac.id/v/8F3K2Q
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
