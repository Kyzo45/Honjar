"use client";

import { useApp } from "@/context/AppContext";
import { fmtTgl } from "@/lib/format";
import type { KuliahRow, MataKuliah } from "@/lib/types";

const HARI_URUT = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Pertemuan yang sudah terisi tapi tanggal/jamnya tidak sama dengan jadwal induk
// mata kuliah — dihitung langsung dari data pertemuan, bukan daftar tetap.
function hitungMenyimpang(m: MataKuliah): number {
  return m.rows.filter((r) => {
    if (r.tipe !== "kuliah" || !r.topik || !r.tgl || !r.jam) return false;
    const hariAsli = HARI_URUT[new Date(r.tgl + "T00:00").getDay()];
    return hariAsli !== m.hari || r.jam[0] !== m.jamMulai || r.jam[1] !== m.jamSelesai;
  }).length;
}

// Tanggal input pertemuan paling akhir untuk satu mata kuliah, atau null kalau
// belum ada satupun pertemuan yang diisi.
function inputTerakhir(m: MataKuliah): string | null {
  const isFilledKuliahRow = (r: (typeof m.rows)[number]): r is KuliahRow & { tgl: string } =>
    r.tipe === "kuliah" && Boolean(r.topik) && Boolean(r.tgl);
  const tanggal = m.rows.filter(isFilledKuliahRow).map((r) => r.tgl);
  if (tanggal.length === 0) return null;
  return tanggal.reduce((a, b) => (a > b ? a : b));
}

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
              const menyimpang = hitungMenyimpang(m);
              const terakhir = inputTerakhir(m);
              const anom =
                menyimpang > 0 ? <span className="tag t-wait">{menyimpang} pertemuan menyimpang</span> :
                isi === 0 ? <span className="tag t-off">Belum ada input</span> :
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
                  <td className="num" style={{ fontSize: 12.5 }}>{terakhir ? fmtTgl(terakhir).split(", ")[1] : "—"}</td>
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
