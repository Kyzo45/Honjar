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

  return (
    <button className="mk" onClick={() => selectCourse(m.id)}>
      <div className="mk-top">
        <div>
          <h3>{m.nama}</h3>
          <span className="kode">{m.kode} · {m.sks} · Kelas {m.kelas}</span>
        </div>
        <span className={`tag ${status}`}>{label}</span>
      </div>
      <p className="who">
        <b>{m.koor}</b>
        <br />
        {m.dosen.join(" · ")}
      </p>
      <div className="strip">
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
        <span><span className="num">{m.mhs}</span> mahasiswa</span>
      </div>
    </button>
  );
}

export default function MkView() {
  const { courses } = useApp();
  const total = courses.reduce((sum, m) => sum + courseIsi(m), 0);

  return (
    <section className="view">
      <div className="cards">
        <div className="stat"><dt>Pertemuan tercatat</dt><dd>{total}<small>/56</small></dd></div>
        <div className="stat"><dt>Belum diisi minggu ini</dt><dd>2</dd></div>
        <div className="stat"><dt>Izin menunggu review</dt><dd>3</dd></div>
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
