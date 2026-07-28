import { IZIN } from "@/lib/data";
import type { StatusIzin } from "@/lib/types";

const SBADGE: Record<StatusIzin, [string, string]> = {
  diajukan: ["t-wait", "Menunggu"],
  disetujui: ["t-done", "Disetujui"],
  ditolak: ["t-off", "Ditolak"],
};

export default function IzinView() {
  return (
    <section className="view">
      <div className="note">
        <span>⚠</span>
        <span>
          <b>Surat keterangan dokter berisi data kesehatan.</b>
          {" "}Berkas hanya terlihat oleh mahasiswa bersangkutan, PJ, koordinator, dan admin. Tidak dilampirkan ke berita acara.
        </span>
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Pengajuan izin dan sakit</h2>
          <p>Satu pengajuan berlaku untuk semua mata kuliah pada tanggal tersebut. Mahasiswa tidak perlu mengunggah berulang.</p>
        </div>
        <table className="plain">
          <thead>
            <tr>
              <th>Mahasiswa</th><th>Tanggal</th><th>Jenis</th><th>Keterangan</th>
              <th>Bukti</th><th>Kelas terdampak</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {IZIN.map((r) => {
              const b = SBADGE[r.s];
              return (
                <tr key={r.nim + r.tgl}>
                  <td><b>{r.n}</b><br /><span className="num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.nim}</span></td>
                  <td className="num" style={{ fontSize: 12.5 }}>{r.tgl}</td>
                  <td><span className={`tag ${r.j === "Sakit" ? "t-wait" : "t-stamp"}`}>{r.j}</span></td>
                  <td style={{ maxWidth: 220 }}>{r.ket}</td>
                  <td>
                    {r.f === "—"
                      ? <span style={{ color: "var(--rose)" }}>belum diunggah</span>
                      : <a href="#" style={{ color: "var(--stamp)" }}>{r.f}</a>}
                  </td>
                  <td className="num">{r.k} kelas</td>
                  <td><span className={`tag ${b[0]}`}>{b[1]}</span></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.s === "diajukan" && (
                      <>
                        <button className="btn btn-sm">Tolak</button>{" "}
                        <button className="btn btn-sm btn-p">Setujui</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
