"use client";

import { useApp } from "@/context/AppContext";
import type { MataKuliah } from "@/lib/types";

function courseIsi(m: MataKuliah): number {
  return m.rows.filter((r) => r.tipe === "kuliah" && r.topik).length;
}

function CourseCard({ m }: { m: MataKuliah }) {
  const { selectCourse } = useApp();
  const isi = courseIsi(m);
  const status = isi >= 14 ? "t-done" : isi > 0 ? "t-wait" : "t-none";
  const label = isi >= 14 ? "Lengkap" : isi > 0 ? "Berjalan" : "Kosong";
  const typeStatus = m.tipe === "Teori" ? "t-stamp" : "t-wait";

  return (
    <button className="mk" onClick={() => selectCourse(m.id)}>
      <div className="mk-top">
        <div>
          <h3>{m.nama}</h3>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
            <span className="kode">{m.kode} · {m.sks} · Kelas {m.kelas}</span>
            <span className={`tag ${typeStatus}`} style={{ transform: "scale(0.85)", transformOrigin: "left" }}>{m.tipe}</span>
          </div>
        </div>
        <span className={`tag ${status}`}>{label}</span>
      </div>
      <p className="who" style={{ margin: "6px 0 2px" }}>
        <b>Dosen Koor: {m.koor}</b>
        <br />
        Dosen: {m.dosen.join(" · ")}
      </p>
      <div className="sched" style={{ fontSize: "12px", color: "var(--ink-2)", display: "flex", flexWrap: "wrap", gap: "10px", margin: "6px 0" }}>
        <span>📅 {m.hari}, {m.jamMulai}–{m.jamSelesai}</span>
        <span>📍 {m.ruangan}</span>
      </div>
      <div className="strip" style={{ margin: "8px 0" }}>
        {m.rows.map((r) =>
          r.tipe !== "kuliah" ? (
            <i key={r.ke} className="e" title="Ujian" />
          ) : r.topik ? (
            <i key={r.ke} className="f" />
          ) : (
            <i key={r.ke} />
          )
        )}
      </div>
      <div className="mk-foot">
        <span><span className="num">{isi}</span>/14 pertemuan</span>
        <span className="kode">Semester {m.semester}</span>
      </div>
    </button>
  );
}

export default function MkView() {
  const { courses } = useApp();
  const total = courses.reduce((sum, m) => sum + courseIsi(m), 0);
  const totalSks = courses.reduce((sum, m) => sum + (parseInt(m.sks) || 0), 0);

  return (
    <section className="view">
      <div className="cards">
        <div className="stat"><dt>Pertemuan tercatat</dt><dd>{total}<small>/{courses.length * 14}</small></dd></div>
        <div className="stat"><dt>Belum diisi minggu ini</dt><dd>2</dd></div>
        <div className="stat"><dt>Total SKS diampu</dt><dd>{totalSks}<small> SKS</small></dd></div>
        <div className="stat"><dt>Batas input mundur</dt><dd>7<small> hari</small></dd></div>
      </div>
      <p className="eyebrow">Kelas yang Anda pegang</p>
      <div className="grid-mk">
        {courses.map((m) => (
          <CourseCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}
