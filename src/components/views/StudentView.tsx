"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { MataKuliah, Row, KuliahRow } from "@/lib/types";

export default function StudentView() {
  const { courses, user, submitPresensiMandiri } = useApp();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [pinCode, setPinCode] = useState("");
  const [pinTargetKe, setPinTargetKe] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingPin, setSubmittingPin] = useState(false);

  // Cari mata kuliah yang sedang aktif terpilih, default ke yang pertama
  const activeCourse = useMemo(() => {
    if (courses.length === 0) return null;
    return courses.find((c) => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  // Set default selected id if not set
  if (courses.length > 0 && selectedCourseId === null) {
    setSelectedCourseId(courses[0].id);
  }

  // Hitung statistik absensi mahasiswa
  const stats = useMemo(() => {
    if (!activeCourse || !user?.nim) return { hadir: 0, sakit: 0, izin: 0, tanpa: 0, total: 0 };
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let tanpa = 0;
    let total = 0;

    activeCourse.rows.forEach((r) => {
      if (r.tipe === "kuliah" && r.topik) {
        total++;
        const absent = r.absents?.find((a) => a.nim === user.nim);
        if (absent) {
          if (absent.status === "sakit") sakit++;
          else if (absent.status === "izin") izin++;
          else if (absent.status === "tanpa") tanpa++;
        } else {
          hadir++;
        }
      }
    });

    return { hadir, sakit, izin, tanpa, total };
  }, [activeCourse, user]);

  const handlePinSubmit = async (e: React.FormEvent, ke: number) => {
    e.preventDefault();
    if (!activeCourse || !user?.nim) return;
    if (pinCode.trim().length !== 6) {
      setMessage({ type: "error", text: "PIN harus terdiri dari 6 karakter" });
      return;
    }

    setMessage(null);
    setSubmittingPin(true);

    const res = await submitPresensiMandiri(activeCourse.id, ke, pinCode);
    setSubmittingPin(false);

    if (res.success) {
      setMessage({ type: "success", text: `Berhasil melakukan presensi mandiri pada Sesi ${ke}!` });
      setPinCode("");
      setPinTargetKe(null);
    } else {
      setMessage({ type: "error", text: res.error || "Gagal memasukkan PIN presensi" });
    }
  };

  if (courses.length === 0) {
    return (
      <div className="student-view-empty">
        <p>Anda belum terdaftar di mata kuliah apa pun (KRS kosong).</p>
      </div>
    );
  }

  return (
    <div className="student-view">
      {/* KIRI: Daftar Mata Kuliah */}
      <div className="student-left">
        <p className="section-label">Mata Kuliah Anda (KRS)</p>
        <div className="student-course-list">
          {courses.map((c) => (
            <button
              key={c.id}
              className={`student-course-card ${activeCourse?.id === c.id ? "active" : ""}`}
              onClick={() => {
                setSelectedCourseId(c.id);
                setPinTargetKe(null);
                setMessage(null);
              }}
            >
              <div className="card-header-mhs">
                <span className="code-badge">{c.kode}</span>
                <span className="class-badge">Kelas {c.kelas}</span>
              </div>
              <h4>{c.nama}</h4>
              <p className="schedule">{c.hari}, {c.jamMulai} - {c.jamSelesai} ({c.ruangan})</p>
              <p className="info">{c.sks} SKS · Koordinator: {c.koor}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KANAN: Detail & Daftar Sesi */}
      {activeCourse && (
        <div className="student-right">
          <div className="student-course-header">
            <h3>{activeCourse.nama}</h3>
            <p className="subtext">{activeCourse.kode} · Kelas {activeCourse.kelas} · {activeCourse.sks} SKS</p>

            {/* Statistik */}
            <div className="student-stats-row">
              <div className="stat-card hadir">
                <span className="count">{stats.hadir}</span>
                <span className="lbl">Hadir</span>
              </div>
              <div className="stat-card sakit">
                <span className="count">{stats.sakit}</span>
                <span className="lbl">Sakit</span>
              </div>
              <div className="stat-card izin">
                <span className="count">{stats.izin}</span>
                <span className="lbl">Izin</span>
              </div>
              <div className="stat-card tanpa">
                <span className="count">{stats.tanpa}</span>
                <span className="lbl">Alfa / Tanpa Ket.</span>
              </div>
              <div className="stat-card total">
                <span className="count">{stats.total}</span>
                <span className="lbl">Sesi Terlaksana</span>
              </div>
            </div>
          </div>

          {message && (
            <div className={`student-message ${message.type}`}>
              {message.text}
              <button onClick={() => setMessage(null)} className="close-btn">&times;</button>
            </div>
          )}

          {/* Sesi List */}
          <div className="student-sessions">
            <p className="section-label">Daftar Pertemuan & Status Kehadiran</p>
            <div className="sessions-list-mhs">
              {activeCourse.rows.map((r) => {
                if (r.tipe === "uts" || r.tipe === "uas") {
                  return (
                    <div key={`session-${r.ke}`} className="session-row-mhs exam">
                      <div className="sess-badge">Sesi {r.ke}</div>
                      <div className="sess-content">
                        <strong>{r.tipe.toUpperCase()} (Ujian Semester)</strong>
                      </div>
                      <div className="sess-status">
                        <span className="status-badge exam">Ujian</span>
                      </div>
                    </div>
                  );
                }

                // Kuliah
                const isFilled = !!r.topik;
                const absent = r.absents?.find((a) => a.nim === user?.nim);
                const isAbsent = !!absent;

                return (
                  <div key={`session-${r.ke}`} className={`session-row-mhs ${isFilled ? "filled" : "empty"}`}>
                    <div className="sess-badge">Sesi {r.ke}</div>
                    <div className="sess-content">
                      {isFilled ? (
                        <>
                          <div className="sess-topik"><strong>Topik:</strong> {r.topik}</div>
                          <div className="sess-details">
                            <span>📅 {r.tgl}</span>
                            <span>⏰ {r.jam?.[0]} - {r.jam?.[1]}</span>
                            <span>👤 {r.dosen}</span>
                          </div>
                        </>
                      ) : (
                        <div className="empty-text">Belum Terlaksana</div>
                      )}
                    </div>

                    <div className="sess-status">
                      {isFilled ? (
                        isAbsent ? (
                          <span className={`status-badge ${absent.status}`}>
                            {absent.status === "sakit" ? "Sakit 🟡" : absent.status === "izin" ? "Izin 🔵" : "Alfa 🔴"}
                          </span>
                        ) : (
                          <span className="status-badge hadir">Hadir 🟢</span>
                        )
                      ) : r.isAbsenAktif ? (
                        pinTargetKe === r.ke ? (
                          <form onSubmit={(e) => handlePinSubmit(e, r.ke)} className="pin-form-inline">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="KODE PIN"
                              value={pinCode}
                              onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                              autoFocus
                            />
                            <button type="submit" disabled={submittingPin}>Kirim</button>
                            <button type="button" onClick={() => setPinTargetKe(null)} className="cancel">Batal</button>
                          </form>
                        ) : (
                          <button
                            onClick={() => {
                              setPinTargetKe(r.ke);
                              setMessage(null);
                            }}
                            className="btn-absen-mandiri"
                          >
                            Presensi Mandiri ⚡
                          </button>
                        )
                      ) : (
                        <span className="status-badge pending">Belum Buka</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
