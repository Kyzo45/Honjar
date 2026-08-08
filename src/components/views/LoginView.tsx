"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Image from "next/image";

export default function LoginView() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi");
      return;
    }
    setError(null);
    setSubmitting(true);

    const res = await login(username, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Gagal masuk");
    }
  };

  const handleQuickLogin = async (user: string) => {
    const pwd = user === "admin" ? "admin" : "123456";
    setUsername(user);
    setPassword(pwd);
    setError(null);
    setSubmitting(true);

    const res = await login(user, pwd);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Gagal masuk");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logos">
            <img src="/logo-unjani.png" alt="Logo UNJANI" className="logo-unjani-login" />
          </div>
          <h2>HONJAR</h2>
          <h3>Sistem Berita Acara & Presensi Mengajar</h3>
          <p className="subtitle">
            Teknologi Laboratorium Medis (D4)<br />
            Universitas Jenderal Achmad Yani
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Akses Cepat Akun Demo (Sandi: admin / 123456):</p>
          <div className="demo-buttons">
            <button onClick={() => handleQuickLogin("admin")} className="btn-demo admin">
              <span>Admin</span> admin
            </button>
            <button onClick={() => handleQuickLogin("rifqi.aulia")} className="btn-demo pj">
              <span>PJ Kelas</span> rifqi.aulia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
