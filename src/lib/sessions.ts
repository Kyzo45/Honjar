import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "./db";
import { isBakteriologiCourse } from "./types";

export interface AuthorizedCourse {
  id: number;
  nama: string;
}

type AuthResult =
  | { ok: true; course: AuthorizedCourse }
  | { ok: false; status: number; error: string };

/**
 * Membuka koneksi pool untuk endpoint mutasi sesi dengan penanganan error standar.
 */
export async function connectSessionClient(actionLabel: string): Promise<
  | { ok: true; client: PoolClient }
  | { ok: false; response: NextResponse }
> {
  try {
    const client = await pool.connect();
    return { ok: true, client };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui";
    console.error(`Database tidak tersedia saat ${actionLabel}:`, error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Gagal terhubung ke database: " + message }, { status: 503 }),
    };
  }
}

/**
 * Mengunci baris mata kuliah dan memvalidasi bahwa kelas dipegang PJ terkait
 * serta termasuk kelompok mata kuliah Bakteriologi.
 */
export async function authorizeBakteriologiSessionEdit(
  client: PoolClient,
  courseId: number,
  pjId: number
): Promise<AuthResult> {
  const { rows: courses } = await client.query(
    `SELECT mk.id, mk.nama
     FROM mata_kuliah mk
     WHERE mk.id = $1
       AND (
         mk.pj_id = $2
         OR EXISTS (
           SELECT 1 FROM mata_kuliah_pj mpj
           WHERE mpj.mata_kuliah_id = mk.id AND mpj.pj_id = $2
         )
       )
     FOR UPDATE OF mk`,
    [courseId, pjId]
  );

  if (!courses[0]) {
    return { ok: false, status: 404, error: "Mata kuliah tidak ditemukan atau bukan kelas PJ ini" };
  }

  if (!isBakteriologiCourse(courses[0].nama)) {
    return {
      ok: false,
      status: 403,
      error: "Fitur tambah kolom dan geser UTS/UAS hanya berlaku untuk mata kuliah Bakteriologi",
    };
  }

  return { ok: true, course: { id: Number(courses[0].id), nama: courses[0].nama } };
}
