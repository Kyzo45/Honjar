"use client";

import { ACADEMIC_CONFIG } from "@/config/academic";

interface KopSuratProps {
  className?: string;
}

/**
 * Komponen resmi Kop Surat Institusi (Yayasan, Universitas, Fakultas, Prodi, Alamat, dan Logo)
 * Bersumber langsung dari ACADEMIC_CONFIG untuk kemudahan pemeliharaan (maintenance).
 */
export default function KopSurat({ className = "page-kop" }: KopSuratProps) {
  const { institusi } = ACADEMIC_CONFIG;

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={institusi.logoYayasan} alt="Logo Yayasan" className="page-kop-logo" />
      <div className="page-kop-text">
        <b>{institusi.yayasan}</b>
        <b style={{ color: "var(--ink)", fontSize: "11px", fontWeight: "700" }}>
          {institusi.universitas}
        </b>
        <b>{institusi.fakultas}</b>
        <b>{institusi.prodi}</b>
        <span>{institusi.alamat}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={institusi.logoUnjani} alt="Logo Unjani" className="page-kop-logo" />
    </div>
  );
}
