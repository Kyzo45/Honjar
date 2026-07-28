"use client";

import { useApp } from "@/context/AppContext";

const INPUT_TERAKHIR = ["23 Mei", "26 Mei", "19 Mei", "2 Mei"];

export default function MonitorView() {
  const { courses } = useApp();

  return (
    <section className="view">
      <div className="note">
        <span>◉</span>
        <span>
          <b>Dosen tidak perlu melakukan apa pun di sini.</b>
          {" "}Rekap bulanan dikirim otomatis ke setiap dosen sebagai pemberitahuan. Tanpa sanggahan dalam 7 hari, data dianggap benar.
        </span>
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Kelengkapan berita acara</h2>
          <div className="right"><button className="btn btn-sm">Kirim pengingat ke Penanggung Jawab</button></div>
          <p>Baris bertanda kuning berarti tanggal atau jam menyimpang dari jadwal induk.</p>
        </div>
        <table className="plain">
          <thead>
            <tr>
              <th>Mata kuliah</th><th>Kelas</th><th>Penanggung Jawab</th><th>Progres</th>
              <th>Input terakhir</th><th>Anomali</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((m) => {
              const isi = m.rows.filter((r) => r.tipe === "kuliah" && r.topik).length;
              const pct = Math.round((isi / 14) * 100);
              const anom =
                m.id === 3 ? <span className="tag t-wait">1 jam menyimpang</span> :
                m.id === 4 ? <span className="tag t-off">3 minggu tanpa input</span> :
                <span style={{ color: "var(--ink-3)" }}>—</span>;
              const barColor = pct >= 80 ? "var(--verd)" : pct >= 50 ? "var(--amber)" : "var(--rose)";
              return (
                <tr key={m.id}>
                  <td><b>{m.nama}</b><br /><span className="num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.kode}</span></td>
                  <td>{m.kelas}</td>
                  <td>{m.pj}</td>
                  <td style={{ minWidth: 150 }}>
                    <span className="num" style={{ fontSize: 12 }}>{isi}/14 · {pct}%</span>
                    <div className="bar"><i style={{ width: `${pct}%`, background: barColor }} /></div>
                  </td>
                  <td className="num" style={{ fontSize: 12.5 }}>{INPUT_TERAKHIR[m.id - 1]} 2026</td>
                  <td>{anom}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
