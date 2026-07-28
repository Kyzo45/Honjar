"use client";

import { useApp } from "@/context/AppContext";
import { ROLE } from "@/lib/roles";
import type { Role, ViewId } from "@/lib/types";

function NavButton({ go, icon, label, badge }: { go: ViewId; icon: string; label: string; badge?: string }) {
  const { view, go: navigate } = useApp();
  return (
    <button className="nav" data-go={go} aria-current={view === go} onClick={() => navigate(go)}>
      <i>{icon}</i>
      {label}
      {badge && <em>{badge}</em>}
    </button>
  );
}

const ROLE_ORDER: Role[] = ["pj", "admin"];
const ROLE_LABEL: Record<Role, string> = { pj: "Penanggung Jawab", admin: "Admin" };

export default function Rail() {
  const { role, setRole } = useApp();

  return (
    <nav className="rail">
      <div className="brand">
        <b>Honjar</b>
        <span>TLM&nbsp;D4</span>
      </div>

      {role === "pj" && (
        <div className="rail-group">
          <p className="rail-label">Pengisian</p>
          <NavButton go="mk" icon="▤" label="Mata kuliah saya" />
          <NavButton go="izin" icon="✉" label="Pengajuan izin" badge="3" />
        </div>
      )}

      {role === "admin" && (
        <div className="rail-group">
          <p className="rail-label">Administrasi</p>
          <NavButton go="monitor" icon="◉" label="Kelengkapan" />
          <NavButton go="honor" icon="∑" label="Rekap honor" />
          <NavButton go="master" icon="◫" label="Master mata kuliah" />
          <NavButton go="cetak" icon="⎙" label="Cetak berita acara" />
        </div>
      )}

      <div className="whoami">
        <p>
          Masuk sebagai
          <b>{ROLE[role].name}</b>
        </p>
        <div className="roleswap" role="group" aria-label="Ganti peran untuk demo">
          {ROLE_ORDER.map((r) => (
            <button key={r} data-role={r} aria-pressed={role === r} onClick={() => setRole(r)}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
