"use client";

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { ROLE, TITLE } from "@/lib/roles";
import type { Dosen, ImportMahasiswaRow, KuliahRow, Mahasiswa, MataKuliah, NewCourseInput, NewDosenInput, NewMahasiswaInput, NewPJInput, PJUser, Role, ToastMessage, ToastType, ViewId, UserSession } from "@/lib/types";

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
  dosenList: Dosen[];
  pjList: PJUser[];
  mahasiswaList: Mahasiswa[];
  loading: boolean;
  user: UserSession | null;
  setRole: (r: Role) => void;
  go: (v: ViewId) => void;
  selectCourse: (id: number) => void;
  openSheet: (courseId: number, ke: number) => void;
  closeSheet: () => void;
  saveRow: (courseId: number, ke: number, patch: Partial<KuliahRow>) => void;
  uploadBukti: (file: File) => Promise<{ success: boolean; url?: string; originalName?: string; error?: string }>;
  addCourse: (input: NewCourseInput) => Promise<{ success: boolean; error?: string }>;
  updateCourse: (id: number, input: NewCourseInput) => Promise<{ success: boolean; error?: string }>;
  deleteCourse: (id: number) => Promise<{ success: boolean; error?: string }>;
  addDosen: (input: NewDosenInput) => Promise<{ success: boolean; error?: string }>;
  updateDosen: (id: number, input: NewDosenInput) => Promise<{ success: boolean; error?: string }>;
  deleteDosen: (id: number) => Promise<{ success: boolean; error?: string }>;
  addPJ: (input: NewPJInput) => Promise<{ success: boolean; error?: string }>;
  updatePJ: (id: number, input: NewPJInput) => Promise<{ success: boolean; error?: string }>;
  deletePJ: (id: number) => Promise<{ success: boolean; error?: string }>;
  addMahasiswa: (input: NewMahasiswaInput) => Promise<{ success: boolean; error?: string }>;
  updateMahasiswa: (nim: string, input: NewMahasiswaInput) => Promise<{ success: boolean; error?: string }>;
  deleteMahasiswa: (nim: string) => Promise<{ success: boolean; error?: string }>;
  importMahasiswaPreview: (file: File) => Promise<{ success: boolean; rows?: ImportMahasiswaRow[]; error?: string }>;
  importMahasiswaCommit: (rows: ImportMahasiswaRow[]) => Promise<{ success: boolean; inserted?: number; updated?: number; error?: string }>;
  addToRoster: (courseId: number, input: { nim: string; nama?: string; angkatan?: string }) => Promise<{ success: boolean; error?: string }>;
  removeFromRoster: (courseId: number, nim: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  semesterFilter: number | "all";
  setSemesterFilter: (s: number | "all") => void;
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string) => void;
  dismissToast: (id: number) => void;
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
  roster: [],
  pj: "—",
  pjId: null,
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
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const lecturers = useMemo(() => dosenList.map((d) => d.nama), [dosenList]);
  const [pjList, setPjList] = useState<PJUser[]>([]);
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);
  const [role, setRoleState] = useState<Role>("pj");
  const [view, setView] = useState<ViewId>("mk");
  const [curMkId, setCurMkId] = useState<number>(1);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<number | "all">("all");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Notifikasi ringan untuk hasil tiap proses CRUD (berhasil/gagal), tampil di
  // pojok layar dan hilang otomatis. Dipanggil dari dalam fungsi CRUD di bawah
  // supaya konsisten di semua tempat tanpa perlu diulang tiap komponen.
  const showToast = (type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // 1. Muat data awal dari API MySQL/Postgres
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [resC, resL, resPJ, resM] = await Promise.all([
          fetch("/api/courses").then((r) => r.json()),
          fetch("/api/lecturers").then((r) => r.json()),
          fetch("/api/pj").then((r) => r.json()),
          fetch("/api/mahasiswa").then((r) => r.json())
        ]);
        if (Array.isArray(resC)) setCourses(resC);
        if (Array.isArray(resL)) setDosenList(resL);
        if (Array.isArray(resPJ)) setPjList(resPJ);
        if (Array.isArray(resM)) setMahasiswaList(resM);
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

  const go = (v: ViewId) => {
    setView(v);
    setMenuOpen(false);
  };

  const setRole = (r: Role) => {
    setRoleState(r);
    go(ROLE[r].go);
    setMenuOpen(false);
  };

  const selectCourse = (id: number) => {
    setCurMkId(id);
    go("ledger");
    setMenuOpen(false);
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
        showToast("success", "Pertemuan berhasil disimpan.");
      } else {
        // Server menolak (mis. validasi tanggal/jam) — batalkan pembaruan optimistik
        // dengan menarik ulang data asli, dan beri tahu penggunanya.
        showToast("error", data.error || "Gagal menyimpan pertemuan");
        const fresh = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(fresh)) setCourses(fresh);
      }
    } catch (err) {
      console.error("Gagal sinkronisasi simpan pertemuan:", err);
      showToast("error", "Gagal terhubung ke server");
    }
  };

  // 2b. Unggah berkas bukti sakit/izin (dipakai SheetModal saat mengisi kehadiran mahasiswa)
  const uploadBukti = async (file: File): Promise<{ success: boolean; url?: string; originalName?: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/bukti", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        return { success: true, url: data.url, originalName: data.originalName };
      }
      showToast("error", data.error || "Gagal mengunggah berkas");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal mengunggah berkas bukti:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 3. Tambah MK ke Database
  const addCourse = async (input: NewCourseInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        const [fresh, freshM] = await Promise.all([
          fetch("/api/courses").then((r) => r.json()),
          fetch("/api/mahasiswa").then((r) => r.json())
        ]);
        if (Array.isArray(fresh)) setCourses(fresh);
        if (Array.isArray(freshM)) setMahasiswaList(freshM);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menambahkan mata kuliah:", err);
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 3b. Ubah MK ke Database
  const updateCourse = async (id: number, input: NewCourseInput): Promise<{ success: boolean; error?: string }> => {
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
              dosen: input.dosen,
              pj: pjList.find((p) => p.id === input.pjId)?.nama || "—",
              pjId: input.pjId,
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
        const [fresh, freshM] = await Promise.all([
          fetch("/api/courses").then((r) => r.json()),
          fetch("/api/mahasiswa").then((r) => r.json())
        ]);
        if (Array.isArray(fresh)) setCourses(fresh);
        if (Array.isArray(freshM)) setMahasiswaList(freshM);
        return { success: true };
      }
      // Gagal di server: tarik ulang data asli supaya optimistic update tidak nyangkut salah
      const fresh = await fetch("/api/courses").then((r) => r.json());
      if (Array.isArray(fresh)) setCourses(fresh);
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal memperbarui mata kuliah:", err);
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 3c. Hapus MK dari Database
  const deleteCourse = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
        showToast("success", "Mata kuliah berhasil dihapus.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menghapus mata kuliah");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menghapus mata kuliah:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4. Tambah Dosen ke Database
  const addDosen = async (input: NewDosenInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/lecturers").then((r) => r.json());
        if (Array.isArray(fresh)) setDosenList(fresh);
        showToast("success", "Dosen berhasil ditambahkan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menambahkan dosen");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menambahkan dosen:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4b. Ubah Dosen di Database
  const updateDosen = async (id: number, input: NewDosenInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/lecturers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input })
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/lecturers").then((r) => r.json());
        if (Array.isArray(fresh)) setDosenList(fresh);
        showToast("success", "Perubahan dosen berhasil disimpan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal mengubah dosen");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal mengubah dosen:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4c. Hapus Dosen dari Database
  const deleteDosen = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/lecturers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setDosenList((prev) => prev.filter((d) => d.id !== id));
        const freshCourses = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(freshCourses)) setCourses(freshCourses);
        showToast("success", "Dosen berhasil dihapus.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menghapus dosen");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menghapus dosen:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4d. Tambah PJ ke Database
  const addPJ = async (input: NewPJInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/pj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/pj").then((r) => r.json());
        if (Array.isArray(fresh)) setPjList(fresh);
        showToast("success", "Penanggung Jawab berhasil ditambahkan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menambahkan PJ");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menambahkan PJ:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4e. Ubah PJ di Database
  const updatePJ = async (id: number, input: NewPJInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/pj", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input })
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch("/api/pj").then((r) => r.json());
        if (Array.isArray(fresh)) setPjList(fresh);
        showToast("success", "Perubahan Penanggung Jawab berhasil disimpan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal mengubah PJ");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal mengubah PJ:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4f. Hapus PJ dari Database
  const deletePJ = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/pj", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setPjList((prev) => prev.filter((p) => p.id !== id));
        showToast("success", "Penanggung Jawab berhasil dihapus.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menghapus PJ");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menghapus PJ:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4g. Tambah Mahasiswa ke Database
  const addMahasiswa = async (input: NewMahasiswaInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/mahasiswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await res.json();
      if (data.success) {
        const [fresh, freshC] = await Promise.all([
          fetch("/api/mahasiswa").then((r) => r.json()),
          fetch("/api/courses").then((r) => r.json())
        ]);
        if (Array.isArray(fresh)) setMahasiswaList(fresh);
        if (Array.isArray(freshC)) setCourses(freshC);
        showToast("success", "Mahasiswa berhasil ditambahkan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menambahkan mahasiswa");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menambahkan mahasiswa:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4h. Ubah Mahasiswa di Database
  const updateMahasiswa = async (nim: string, input: NewMahasiswaInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/mahasiswa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, nim })
      });
      const data = await res.json();
      if (data.success) {
        const [fresh, freshC] = await Promise.all([
          fetch("/api/mahasiswa").then((r) => r.json()),
          fetch("/api/courses").then((r) => r.json())
        ]);
        if (Array.isArray(fresh)) setMahasiswaList(fresh);
        if (Array.isArray(freshC)) setCourses(freshC);
        showToast("success", "Perubahan mahasiswa berhasil disimpan.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal mengubah mahasiswa");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal mengubah mahasiswa:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4i. Hapus Mahasiswa dari Database
  const deleteMahasiswa = async (nim: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/mahasiswa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (data.success) {
        setMahasiswaList((prev) => prev.filter((m) => m.nim !== nim));
        const freshCourses = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(freshCourses)) setCourses(freshCourses);
        showToast("success", "Mahasiswa berhasil dihapus.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menghapus mahasiswa");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menghapus mahasiswa:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4j. Unggah Excel mahasiswa — parsing saja, belum ditulis ke database
  const importMahasiswaPreview = async (file: File): Promise<{ success: boolean; rows?: ImportMahasiswaRow[]; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/mahasiswa/import-preview", { method: "POST", body: formData });
      const data = await res.json();
      if (data.rows) {
        return { success: true, rows: data.rows };
      }
      return { success: false, error: data.error || "Gagal membaca berkas Excel" };
    } catch (err) {
      console.error("Gagal membaca berkas Excel mahasiswa:", err);
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4k. Konfirmasi hasil impor Excel mahasiswa — baru ditulis ke database di sini
  const importMahasiswaCommit = async (rows: ImportMahasiswaRow[]): Promise<{ success: boolean; inserted?: number; updated?: number; error?: string }> => {
    try {
      const res = await fetch("/api/mahasiswa/import-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const data = await res.json();
      if (data.success) {
        const [fresh, freshC] = await Promise.all([
          fetch("/api/mahasiswa").then((r) => r.json()),
          fetch("/api/courses").then((r) => r.json())
        ]);
        if (Array.isArray(fresh)) setMahasiswaList(fresh);
        if (Array.isArray(freshC)) setCourses(freshC);
        return { success: true, inserted: data.inserted, updated: data.updated };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menyimpan hasil impor mahasiswa:", err);
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4l. Tambahkan mahasiswa (baru atau sudah ada) ke roster satu mata kuliah
  const addToRoster = async (courseId: number, input: { nim: string; nama?: string; angkatan?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/courses/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, ...input })
      });
      const data = await res.json();
      if (data.success) {
        const [freshC, freshM] = await Promise.all([
          fetch("/api/courses").then((r) => r.json()),
          fetch("/api/mahasiswa").then((r) => r.json())
        ]);
        if (Array.isArray(freshC)) setCourses(freshC);
        if (Array.isArray(freshM)) setMahasiswaList(freshM);
        showToast("success", "Mahasiswa berhasil ditambahkan ke mata kuliah.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal menambahkan mahasiswa ke mata kuliah");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal menambahkan mahasiswa ke mata kuliah:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
    }
  };

  // 4m. Keluarkan mahasiswa dari roster satu mata kuliah
  const removeFromRoster = async (courseId: number, nim: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/courses/roster", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, nim })
      });
      const data = await res.json();
      if (data.success) {
        const freshC = await fetch("/api/courses").then((r) => r.json());
        if (Array.isArray(freshC)) setCourses(freshC);
        showToast("success", "Mahasiswa berhasil dikeluarkan dari mata kuliah.");
        return { success: true };
      }
      showToast("error", data.error || "Gagal mengeluarkan mahasiswa dari mata kuliah");
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Gagal mengeluarkan mahasiswa dari mata kuliah:", err);
      showToast("error", "Gagal terhubung ke server");
      return { success: false, error: "Gagal terhubung ke server" };
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
        
        // Fetch courses khusus: mahasiswa lihat kelas KRS-nya, PJ lihat mata kuliah yang dia tanggung jawabkan
        const coursesUrl =
          data.user.role === "mahasiswa"
            ? `/api/courses?nim=${data.user.nim}`
            : data.user.role === "pj"
              ? `/api/courses?pjId=${data.user.id}`
              : "/api/courses";
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
    editing, editingRow, lecturers, dosenList, pjList, mahasiswaList, loading, user,
    setRole, go, selectCourse, openSheet, closeSheet, saveRow, uploadBukti, addCourse, updateCourse, deleteCourse, addDosen, updateDosen, deleteDosen,
    addPJ, updatePJ, deletePJ,
    addMahasiswa, updateMahasiswa, deleteMahasiswa, importMahasiswaPreview, importMahasiswaCommit,
    addToRoster, removeFromRoster,
    login, logout, menuOpen, setMenuOpen,
    semesterFilter, setSemesterFilter,
    toasts, showToast, dismissToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
