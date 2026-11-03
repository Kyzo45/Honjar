"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { fmtTgl, jamAjar, menit } from "@/lib/format";
import type { Kehadiran, Row } from "@/lib/types";

const KEHADIRAN: Record<Kehadiran, [string, string]> = {
  hadir: ["t-done", "Hadir"],
  daring: ["t-stamp", "Daring"],
  diganti: ["t-wait", "Diganti"],
  batal: ["t-off", "Tidak terlaksana"],
};

export default function LedgerView() {
  const { curMK, openSheet, addMeeting, removeExtraMeeting, deleteMeeting, user } = useApp();
  const [deletingKe, setDeletingKe] = useState<number | null>(null);
  const [addingMeeting, setAddingMeeting] = useState(false);
  const [removingMeeting, setRemovingMeeting] = useState(false);

  const handleAddMeeting = async () => {
    setAddingMeeting(true);
    const result = await addMeeting(curMK.id);
    setAddingMeeting(false);
    if (result.success && result.ke) openSheet(curMK.id, result.ke);
  };

  const handleRemoveExtraMeeting = async () => {
    if (!lastRow || !confirm(`Hapus kolom pertemuan ke-${lastRow.ke} yang masih kosong?`)) return;
    setRemovingMeeting(true);
    await removeExtraMeeting(curMK.id);
    setRemovingMeeting(false);
  };

  const handleDelete = async (ke: number) => {
    if (!confirm(`Hapus isi pertemuan ke-${ke} pada ${curMK.nama} kelas ${curMK.kelas}? Data presensi sesi ini juga akan dihapus.`)) return;
    setDeletingKe(ke);
    await deleteMeeting(curMK.id, ke);
    setDeletingKe(null);
  };

  let isi = 0, jam = 0, hadirSum = 0;
  const lastRow = curMK.rows[curMK.rows.length - 1];
  const canRemoveLastAdded = lastRow?.tipe === "kuliah" && lastRow.ke > 16 && !lastRow.topik;
  const totalPertemuan = curMK.rows.filter((r) => r.tipe === "kuliah").length;
  curMK.rows.forEach((r: Row) => {
    if (r.tipe === "kuliah" && r.topik) {
      isi++;
      const mnt = menit(r.jam![0], r.jam![1]);
      jam += jamAjar(mnt);
      hadirSum += r.hadir ?? 0;
    }
  });

  return (
    <section className="view">
      <div className="ledger-wrap">
        <div className="ledger-head">
          <span className="id">{curMK.kode}</span>
          <dl>
            <div><dt>Kelas / Semester</dt><dd>{curMK.kelas} / Semester {curMK.semester}</dd></div>
            <div><dt>Tipe Kuliah</dt><dd>{curMK.tipe}</dd></div>
            <div><dt>Jadwal</dt><dd>{curMK.hari}, {curMK.jamMulai}–{curMK.jamSelesai} ({curMK.ruangan})</dd></div>
            <div><dt>Koordinator</dt><dd>{curMK.koor}</dd></div>
            <div><dt>Dosen</dt><dd>{curMK.dosen.join(" · ")}</dd></div>
          </dl>
        </div>
        <div className="scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th className="c-no">Ke</th>
                <th className="c-tgl">Hari, tanggal</th>
                <th className="c-jam">Jam</th>
                <th className="c-hadir">Mhs hadir</th>
                <th className="c-topik">Pokok bahasan kuliah</th>
                <th className="c-dsn">Dosen</th>
                <th className="c-act"></th>
              </tr>
              <tr className="key">
                <th className="c-no">1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th></th>
              </tr>
            </thead>
            <tbody>
              {curMK.rows.map((r: Row) => {
                if (r.tipe !== "kuliah") {
                  return (
                    <tr key={r.ke} className="exam">
                      <td colSpan={7}>{r.tipe.toUpperCase()}</td>
                    </tr>
                  );
                }
                if (r.topik) {
                  const mnt = menit(r.jam![0], r.jam![1]);
                  const j = jamAjar(mnt);
                  const k = KEHADIRAN[r.kehadiran ?? "hadir"];
                  return (
                    <tr key={r.ke} className="filled">
                      <td className="c-no">{r.ke}</td>
                      <td className="c-tgl">{fmtTgl(r.tgl!)}</td>
                      <td className="c-jam">
                        <span className="num">{r.jam![0]}–{r.jam![1]}</span>
                        <span className="topik-meta">{mnt} menit · {j} jam</span>
                      </td>
                      <td className="c-hadir">
                        <span className="hadir">{r.hadir}</span>
                      </td>
                      <td className="c-topik">
                        <span className="topik">{r.topik}</span>
                        <span className="topik-meta">{r.metode}</span>
                      </td>
                      <td className="c-dsn">
                        <span className="dsn">{r.dosen}</span>
                        <span className={`tag ${k[0]}`}>{k[1]}</span>
                      </td>
                      <td className="c-act">
                        <button className="btn btn-sm" onClick={() => openSheet(curMK.id, r.ke)}>✎ Ubah</button>
                        {user?.role === "pj" && (
                          <button
                            className="btn btn-sm"
                            style={{ color: "var(--rose)", marginLeft: "4px" }}
                            disabled={deletingKe === r.ke}
                            onClick={() => handleDelete(r.ke)}
                          >
                            {deletingKe === r.ke ? "Menghapus..." : "Hapus"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={r.ke} className="empty" onClick={() => openSheet(curMK.id, r.ke)}>
                    <td className="c-no">{r.ke}</td>
                    <td className="c-topik" colSpan={5}><span className="rowadd">＋ Catat pertemuan ke-{r.ke}</span></td>
                    <td className="c-act">
                      <button className="btn btn-sm btn-p" onClick={() => openSheet(curMK.id, r.ke)}>＋ Tambah</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="ledger-foot">
          <span>Terisi <b>{isi}</b> dari {totalPertemuan} pertemuan</span>
          <span>Total jam mengajar tercatat <b>{jam}</b></span>
          <span>Rata-rata kehadiran <b>{isi ? Math.round(hadirSum / isi) + " orang" : "—"}</b></span>
          {user?.role === "pj" && (
            <>
              {canRemoveLastAdded && (
                <button className="btn btn-sm" style={{ color: "var(--rose)" }} disabled={removingMeeting || addingMeeting} onClick={handleRemoveExtraMeeting}>
                  {removingMeeting ? "Menghapus..." : `Hapus kolom ke-${lastRow.ke}`}
                </button>
              )}
              <button className="btn btn-sm btn-p" disabled={addingMeeting || removingMeeting} onClick={handleAddMeeting}>
                {addingMeeting ? "Menambahkan..." : "+ Tambah kolom pertemuan"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
