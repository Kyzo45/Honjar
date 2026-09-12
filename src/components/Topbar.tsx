"use client";

import { useApp } from "@/context/AppContext";

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const formatSemesterLabel = (semester: number | "all") => {
  if (semester === "all") return "Ganjil/Genap 2025/2026 · Semua semester";
  const period = semester % 2 === 0 ? "Genap" : "Ganjil";
  return `${period} 2025/2026 · Semester ${semester}`;
};

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
            <option value="all">{formatSemesterLabel("all")}</option>
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s} value={s}>{formatSemesterLabel(s)}</option>
            ))}
          </select>
        ) : (
          <span className="term">2025/2026</span>
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
