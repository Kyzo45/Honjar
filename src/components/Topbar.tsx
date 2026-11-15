"use client";

import { useApp } from "@/context/AppContext";
import { ACADEMIC_CONFIG, getActiveSemesterNumbers, formatSemesterOptionLabel } from "@/config/academic";

export default function Topbar() {
  const { view, title, sub, go, setMenuOpen, semesterFilter, setSemesterFilter } = useApp();
  const showSemesterFilter = view === "mk" || view === "master";

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
      <div>
        <h1>{title}</h1>
        <p className="sub">{sub}</p>
      </div>
      <div className="right">
        {showSemesterFilter ? (
          <select
            className="term"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            aria-label="Filter semester mata kuliah"
          >
            <option value="all">{formatSemesterOptionLabel("all")}</option>
            {getActiveSemesterNumbers().map((s) => (
              <option key={s} value={s}>{formatSemesterOptionLabel(s)}</option>
            ))}
          </select>
        ) : (
          <span className="term">{ACADEMIC_CONFIG.tahunAjaran}</span>
        )}
        {view === "ledger" && (
          <button className="btn btn-sm" onClick={() => go("mk")}>
            ← Semua mata kuliah
          </button>
        )}
      </div>
    </header>
  );
}
