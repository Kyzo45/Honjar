"use client";

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { ROLE, TITLE } from "@/lib/roles";
import type { KuliahRow, MataKuliah, NewCourseInput, Role, ViewId, UserSession } from "@/lib/types";

interface EditingTarget {
  courseId: number;
  ke: number;
}

interface AppState {
  role: Role;
  view: ViewId;
  courses: MataKuliah[];
  curMK: MataKuliah;
  title: string;
  sub: string;
  editing: EditingTarget | null;
  editingRow: KuliahRow | null;
  lecturers: string[];
  loading: boolean;
  user: UserSession | null;
  setRole: (r: Role) => void;
  go: (v: ViewId) => void;
  selectCourse: (id: number) => void;
  openSheet: (courseId: number, ke: number) => void;
  closeSheet: () => void;
  saveRow: (courseId: number, ke: number, patch: Partial<KuliahRow>) => void;
  addCourse: (input: NewCourseInput) => void;
  updateCourse: (id: number, input: NewCourseInput) => void;
  addLecturer: (name: string) => void;
  deleteLecturer: (name: string) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_MK: MataKuliah = {
  id: 0,
  kode: "—",
  nama: "Memuat mata kuliah...",
  kelas: "—",
  sks: "—",
  koor: "—",
  dosen: [],
  mhs: 0,
  pj: "—",
  rows: [],
  tipe: "Teori",
  semester: 2,
  hari: "—",
  jamMulai: "00:00",
  jamSelesai: "00:00",
  ruangan: "—"
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<MataKuliah[]>([]);
  const [lecturers, setLecturers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);
  const [role, setRoleState] = useState<Role>("pj");
  const [view, setView] = useState<ViewId>("mk");
  const [curMkId, setCurMkId] = useState<number>(1);
  const [editing, setEditing] = useState<EditingTarget | null>(null);

  // 1. Muat data awal dari API MySQL/Postgres
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [resC, resL] = await Promise.all([
          fetch("/api/courses").then((r) => r.json()),
          fetch("/api/lecturers").then((r) => r.json())
        ]);
        if (Array.isArray(resC)) setCourses(resC);
        if (Array.isArray(resL)) setLecturers(resL);
      } catch (err) {
        console.error("Gagal mengambil data dari database:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const curMK = useMemo(
    () => courses.find((c) => c.id === curMkId) ?? courses[0] ?? DEFAULT_MK,
    [courses, curMkId]
  );

  const go = (v: ViewId) => setView(v);

  const setRole = (r: Role) => {
    setRoleState(r);
    go(ROLE[r].go);
  };

  const selectCourse = (id: number) => {
    setCurMkId(id);
    go("ledger");
  };

  const openSheet = (courseId: number, ke: number) => setEditing({ courseId, ke });
  const closeSheet = () => setEditing(null);

  const editingRow: KuliahRow | null = editing
    ? ((courses.find((c) => c.id === editing.courseId)?.rows.find(
        (r) => r.ke === editing.ke
      ) as KuliahRow | undefined) ?? null)
    : null;

  // 2. Simpan Sesi & Absen ke Database
  const saveRow = async (courseId: number, ke: number, patch: Partial<KuliahRow>) => {
    // Optimistic Update
    setCourses((prev) =>
      prev.map((c) =>
        c.id !== courseId
          ? c
          : {
              ...c,
              rows: c.rows.map((r) =>
                r.ke === ke && r.tipe === "kuliah" ? { ...r, ...patch } : r
              ),
            }
      )
    );
    setEditing(null);

    try {
      const res = await fetch("/api/sessions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, ke, patch })
      });
      const data = await res.json();
      if (data.success) {
        // Sync mhs hadir terhitung dari server
        setCourses((prev) =>
          prev.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  rows: c.rows.map((r) =>
                    r.ke === ke && r.tipe === "kuliah" ? { ...r, hadir: data.hadir } : r
                  ),
                }
          )
        );
      }
    } catch (err) {
      console.error("Gagal sinkronisasi simpan pertemuan:", err);
    }
  };

  // 3. Tambah MK ke Database
  const addCourse = async (input: NewCourseInput) => {
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(fresh)) setCourses(fresh);
      }
    } catch (err) {
      console.error("Gagal menambahkan mata kuliah:", err);
    }
  };

  // 3b. Ubah MK ke Database
  const updateCourse = async (id: number, input: NewCourseInput) => {
    // Optimistic Update
    setCourses((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              kode: input.kode,
              nama: input.nama,
              kelas: input.kelas,
              sks: input.sks,
              koor: input.koor,
              dosen: input.dosenText.split(",").map((s) => s.trim()).filter(Boolean),
              mhs: input.mhs,
              pj: input.pj,
              tipe: input.tipe,
              semester: input.semester,
              hari: input.hari,
              jamMulai: input.jamMulai,
              jamSelesai: input.jamSelesai,
              ruangan: input.ruangan,
            }
      )
    );

    try {
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input })
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(fresh)) setCourses(fresh);
      }
    } catch (err) {
      console.error("Gagal memperbarui mata kuliah:", err);
    }
  };

  // 4. Tambah Dosen ke Database
  const addLecturer = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/lecturers").then((r) => r.json());
        if (Array.isArray(fresh)) setLecturers(fresh);
      }
    } catch (err) {
      console.error("Gagal menambahkan dosen:", err);
    }
  };

  // 4b. Hapus Dosen dari Database
  const deleteLecturer = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/lecturers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        setLecturers((prev) => prev.filter((l) => l !== trimmed));
        const freshCourses = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(freshCourses)) setCourses(freshCourses);
      }
    } catch (err) {
      console.error("Gagal menghapus dosen:", err);
    }
  };

  // 5. Fungsi Login autentikasi PostgreSQL
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setRoleState(data.user.role);
        
        // Fetch courses khusus untuk mahasiswa jika dia mahasiswa
        const coursesUrl = data.user.role === "mahasiswa" ? `/api/courses?nim=${data.user.nim}` : "/api/courses";
        const freshCourses = await fetch(coursesUrl).then((r) => r.json());
        if (Array.isArray(freshCourses)) setCourses(freshCourses);

        // Arahkan halaman awal berdasarkan peran
        if (data.user.role === "admin") {
          setView("honor");
        } else {
          setView("mk");
        }
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error("Login request failed:", err);
      return { success: false, error: "Gagal terhubung ke server autentikasi" };
    }
  };

  // 6. Fungsi Logout
  const logout = () => {
    setUser(null);
    setView("mk");
    // Reload all courses
    fetch("/api/courses")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res)) setCourses(res);
      });
  };

  const [title, sub] = view === "ledger"
    ? [curMK.nama, `${curMK.kode} · Kelas ${curMK.kelas} · Dosen PJ ${curMK.pj}`]
    : TITLE[view] || ["", ""];

  const value: AppState = {
    role, view, courses, curMK, title, sub,
    editing, editingRow, lecturers, loading, user,
    setRole, go, selectCourse, openSheet, closeSheet, saveRow, addCourse, updateCourse, addLecturer, deleteLecturer,
    login, logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
