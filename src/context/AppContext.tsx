"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { buildInitialCourses, buildRows } from "@/lib/data";
import { ROLE, TITLE } from "@/lib/roles";
import type { KuliahRow, MataKuliah, NewCourseInput, Role, ViewId } from "@/lib/types";

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
  setRole: (r: Role) => void;
  go: (v: ViewId) => void;
  selectCourse: (id: number) => void;
  openSheet: (courseId: number, ke: number) => void;
  closeSheet: () => void;
  saveRow: (courseId: number, ke: number, patch: Partial<KuliahRow>) => void;
  addCourse: (input: NewCourseInput) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<MataKuliah[]>(() => buildInitialCourses());
  const [role, setRoleState] = useState<Role>("pj");
  const [view, setView] = useState<ViewId>("mk");
  const [curMkId, setCurMkId] = useState<number>(1);
  const [editing, setEditing] = useState<EditingTarget | null>(null);

  const curMK = useMemo(
    () => courses.find((c) => c.id === curMkId) ?? courses[0],
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

  const saveRow = (courseId: number, ke: number, patch: Partial<KuliahRow>) => {
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
  };

  const editingRow: KuliahRow | null = editing
    ? ((courses.find((c) => c.id === editing.courseId)?.rows.find(
        (r) => r.ke === editing.ke
      ) as KuliahRow | undefined) ?? null)
    : null;

  const addCourse = (input: NewCourseInput) => {
    const dosen = input.dosenText.split(",").map((s) => s.trim()).filter(Boolean);
    const newId = courses.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const newCourse: MataKuliah = {
      id: newId,
      kode: input.kode,
      nama: input.nama,
      kelas: input.kelas,
      sks: input.sks,
      koor: input.koor,
      dosen,
      mhs: input.mhs,
      pj: input.pj,
      rows: buildRows(input.koor, 0),
    };
    setCourses((prev) => [...prev, newCourse]);
  };

  const [title, sub] = view === "ledger"
    ? [curMK.nama, `${curMK.kode} · Kelas ${curMK.kelas} · Penanggung Jawab ${curMK.pj}`]
    : TITLE[view];

  const value: AppState = {
    role, view, courses, curMK, title, sub,
    editing, editingRow,
    setRole, go, selectCourse, openSheet, closeSheet, saveRow, addCourse,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
