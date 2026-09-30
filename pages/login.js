import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login gagal");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Masuk — Arsip Sekolah Ciluar 1</title></Head>
      <div style={styles.page}>
        <div style={styles.panel} className="card">
          <div style={styles.badge}>Ciluar 1</div>
          <h1 style={styles.title}>Arsip Sekolah</h1>
          <p style={styles.subtitle}>Simpan dan kelola dokumen sekolah di satu tempat.</p>

          <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ marginBottom: 14 }}
            />
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button className="btn btn-primary" type="submit" style={styles.submit} disabled={loading}>
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg, var(--navy) 0%, var(--navy-deep) 55%, #0A1B2A 100%)",
    padding: 20,
  },
  panel: {
    width: "100%",
    maxWidth: 380,
    padding: "36px 32px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  },
  badge: {
    display: "inline-block",
    background: "var(--green-light)",
    color: "var(--green)",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
    marginBottom: 14,
  },
  title: { fontSize: "1.8rem", margin: 0 },
  subtitle: { color: "var(--ink-soft)", marginTop: 8, fontSize: "0.95rem" },
  label: { display: "block", fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: 6, marginTop: 4 },
  error: { color: "var(--danger)", fontSize: "0.88rem", marginTop: 10 },
  submit: { width: "100%", marginTop: 22, padding: "12px 18px" },
};
