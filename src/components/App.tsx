"use client";

import { AppProvider, useApp } from "@/context/AppContext";
import Rail from "@/components/Rail";
import Topbar from "@/components/Topbar";
import SheetModal from "@/components/SheetModal";
import MkView from "@/components/views/MkView";
import LedgerView from "@/components/views/LedgerView";
import MonitorView from "@/components/views/MonitorView";
import HonorView from "@/components/views/HonorView";
import MasterView from "@/components/views/MasterView";
import DosenView from "@/components/views/DosenView";
import PJView from "@/components/views/PJView";
import MahasiswaView from "@/components/views/MahasiswaView";
import KelasView from "@/components/views/KelasView";
import CetakView from "@/components/views/CetakView";
import LoginView from "@/components/views/LoginView";
import ToastContainer from "@/components/Toast";

function Shell() {
  const { view, courses, editing, editingRow, user, menuOpen, setMenuOpen } = useApp();

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  const editingCourse = editing ? courses.find((c) => c.id === editing.courseId) : null;

  return (
    <>
      <div className="app">
        <Rail />
        {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}
        <div className="main">
          <Topbar />
          <div className="body">
            {view === "mk" && <MkView />}
            {view === "ledger" && <LedgerView />}
            {view === "monitor" && <MonitorView />}
            {view === "honor" && <HonorView />}
            {view === "master" && <MasterView />}
            {view === "dosen" && <DosenView />}
            {view === "pjlist" && <PJView />}
            {view === "mahasiswa" && <MahasiswaView />}
            {view === "kelas" && <KelasView />}
            {view === "cetak" && <CetakView />}
          </div>
        </div>
      </div>

      {editingCourse && editingRow && (
        <SheetModal
          key={`${editingCourse.id}-${editingRow.ke}`}
          course={editingCourse}
          row={editingRow}
        />
      )}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
