"use client";

import { useApp } from "@/context/AppContext";

export default function Topbar() {
  const { view, title, sub, go, setMenuOpen } = useApp();

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
      <div>
        <h1>{title}</h1>
        <p className="sub">{sub}</p>
      </div>
      <div className="right">
        <span className="term">GENAP 2025/2026</span>
        {view === "ledger" && (
          <button className="btn btn-sm" onClick={() => go("mk")}>
            ← Semua mata kuliah
          </button>
        )}
      </div>
    </header>
  );
}
