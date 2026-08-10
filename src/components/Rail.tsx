"use client";

import { useApp } from "@/context/AppContext";
import type { ViewId } from "@/lib/types";

function NavButton({ go, icon, label, badge }: { go: ViewId; icon: string; label: string; badge?: string }) {
  const { view, go: navigate, setMenuOpen } = useApp();
  return (
    <button className="nav" data-go={go} aria-current={view === go} onClick={() => { navigate(go); setMenuOpen(false); }}>
      <i>{icon}</i>
      {label}
      {badge && <em>{badge}</em>}
    </button>
  );
}

export default function Rail() {
  const { role, user, logout, menuOpen, setMenuOpen } = useApp();

  const roleLabel = role === "admin" ? "Admin Prodi" : "Penanggung Jawab";

  return (
    <nav className="rail" data-open={menuOpen}>
      <div className="brand">
        <b>Honjar</b>
        <span>TLM&nbsp;D4</span>
      </div>

      {role === "pj" && (
        <div className="rail-group">
          <p className="rail-label">Pengisian</p>
          <NavButton go="mk" icon="▤" label="Mata kuliah saya" />
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
        <div className="profile-info">
          <p className="profile-name">{user?.nama || "User"}</p>
          <span className="profile-role">{roleLabel}</span>
        </div>
        <button onClick={() => { logout(); setMenuOpen(false); }} className="btn-logout">
          <i>⎋</i> Keluar / Logout
        </button>
      </div>
    </nav>
  );
}
