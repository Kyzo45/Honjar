"use client";

import { useApp } from "@/context/AppContext";

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i className="toast-icon">{t.type === "success" ? "✓" : "✕"}</i>
          <span className="toast-msg">{t.message}</span>
          <button type="button" className="toast-close" aria-label="Tutup" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
