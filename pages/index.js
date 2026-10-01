import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { isValidSession } from "../lib/auth";

export async function getServerSideProps({ req }) {
  if (!isValidSession(req)) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: {} };
}

function formatSize(bytes) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(dateStr) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Kemarin";
  if (day < 7) return `${day} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isFolder(f) {
  return f.mimeType === "application/vnd.google-apps.folder";
}

function iconFor(f) {
  if (isFolder(f)) return "📁";
  if (f.mimeType?.includes("pdf")) return "📕";
  if (f.mimeType?.includes("image")) return "🖼️";
  if (f.mimeType?.includes("video")) return "🎬";
  if (f.mimeType?.includes("word") || f.mimeType?.includes("document")) return "📄";
  if (f.mimeType?.includes("sheet") || f.mimeType?.includes("excel")) return "📊";
  return "🗂️";
}

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stack, setStack] = useState([{ id: null, name: "Beranda" }]);
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [theme, setTheme] = useState("light");
  const [preview, setPreview] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fileInput = useRef(null);

  const currentFolder = stack[stack.length - 1];

  const load = useCallback(async (folderId, q) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (q) params.set("q", q);
      const res = await fetch(`/api/drive/list?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat file");
      setFiles(data.files || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentFolder.id, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder.id]);

  useEffect(() => {
    const t = setTimeout(() => load(query ? null : currentFolder.id, query), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function openFolder(f) {
    setQuery("");
    setDrawerOpen(false);
    setStack((s) => [...s, { id: f.id, name: f.name }]);
  }

  function goToCrumb(idx) {
    setQuery("");
    setDrawerOpen(false);
    setStack((s) => s.slice(0, idx + 1));
  }

  // Upload langsung dari browser ke Google Drive (lewat sesi resumable),
  // supaya tidak terbentur batas ukuran permintaan di server (Vercel: 4.5 MB).
  async function uploadOneFile(file, folderId, onProgress) {
    const initRes = await fetch("/api/drive/upload-init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        folderId: folderId || undefined,
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok) throw new Error(initData.error || `Gagal memulai upload "${file.name}"`);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", initData.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload "${file.name}" gagal (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error(`Upload "${file.name}" gagal — periksa koneksi internet`));
      xhr.send(file);
    });
  }

  async function handleFiles(fileList) {
    const list = Array.from(fileList);
    if (list.length === 0) return;
    setUploading(true);
    setUploadPct(0);

    const failed = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        await uploadOneFile(file, currentFolder.id, (frac) => {
          const overall = ((i + frac) / list.length) * 100;
          setUploadPct(Math.round(overall));
        });
      } catch (e) {
        failed.push(e.message);
      }
    }

    if (failed.length) setError(failed.join(" • "));
    await load(currentFolder.id, query);
    setUploading(false);
    setUploadPct(0);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function createFolder() {
    const name = window.prompt("Nama folder baru:");
    if (!name) return;
    const res = await fetch("/api/drive/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mkdir", name, parentId: currentFolder.id }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else load(currentFolder.id, query);
  }

  async function renameItem(f) {
    const name = window.prompt("Nama baru:", f.name);
    if (!name || name === f.name) return;
    const res = await fetch("/api/drive/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", fileId: f.id, name }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else load(currentFolder.id, query);
  }

  async function deleteItem(f) {
    if (!window.confirm(`Hapus "${f.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const res = await fetch("/api/drive/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", fileId: f.id }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else load(currentFolder.id, query);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  const sortedFiles = (() => {
    const folders = files.filter(isFolder).sort((a, b) => a.name.localeCompare(b.name, "id"));
    const rest = files.filter((f) => !isFolder(f));
    const dir = sortDir === "asc" ? 1 : -1;
    rest.sort((a, b) => {
      switch (sortBy) {
        case "size":
          return ((Number(a.size) || 0) - (Number(b.size) || 0)) * dir;
        case "type":
          return (a.mimeType || "").localeCompare(b.mimeType || "") * dir;
        case "modified":
          return (new Date(a.modifiedTime || 0) - new Date(b.modifiedTime || 0)) * dir;
        case "name":
        default:
          return a.name.localeCompare(b.name, "id") * dir;
      }
    });
    return [...folders, ...rest];
  })();

  const recentFiles = [...files]
    .filter((f) => !isFolder(f))
    .sort((a, b) => new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0))
    .slice(0, 6);

  const canPreview = (f) =>
    f.mimeType?.includes("pdf") || f.mimeType?.includes("image") || f.mimeType?.includes("video");

  return (
    <>
      <Head><title>Arsip Sekolah Ciluar 1</title></Head>
      <div data-theme={theme} className="app-shell">
        <div className="mobile-topbar">
          <button onClick={() => setDrawerOpen(true)} aria-label="Buka menu">☰</button>
          <span className="brand-title">Arsip Sekolah</span>
        </div>

        <div
          className={`sidebar-overlay ${drawerOpen ? "open" : ""}`}
          onClick={() => setDrawerOpen(false)}
        />

        <aside className={`sidebar ${drawerOpen ? "open" : ""}`}>
          <div style={styles.brand}>
            <div style={styles.logoDot} />
            <div>
              <div style={styles.brandTitle}>Arsip Sekolah</div>
              <div style={styles.brandSub}>Ciluar 1</div>
            </div>
          </div>

          <button
            className="btn btn-accent desktop-only"
            style={styles.uploadBtn}
            onClick={() => fileInput.current?.click()}
          >
            + Unggah file
          </button>
          <button
            className="btn btn-ghost"
            style={styles.sideBtn}
            onClick={() => { createFolder(); setDrawerOpen(false); }}
          >
            Buat folder
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { handleFiles(e.target.files); setDrawerOpen(false); }}
          />

          <div style={styles.sideFooter}>
            <button
              className="btn btn-ghost"
              style={styles.sideBtn}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "Mode gelap" : "Mode terang"}
            </button>
            <button className="btn btn-danger" style={styles.sideBtn} onClick={logout}>
              Keluar
            </button>
          </div>
        </aside>

        <button
          className="fab-upload"
          aria-label="Unggah file"
          onClick={() => fileInput.current?.click()}
        >
          +
        </button>

        <main className="main">
          <div className="topbar" style={styles.topbar}>
            <div style={styles.crumbs}>
              {stack.map((s, idx) => (
                <span key={idx}>
                  <button style={styles.crumbBtn} onClick={() => goToCrumb(idx)}>{s.name}</button>
                  {idx < stack.length - 1 && <span style={{ color: "var(--ink-soft)" }}> / </span>}
                </span>
              ))}
            </div>
            <div className="controls" style={styles.controls}>
              <input
                type="text"
                className="search-input"
                placeholder="Cari dokumen…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={styles.search}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.sortSelect}
                title="Urutkan berdasarkan"
              >
                <option value="name">Nama</option>
                <option value="size">Ukuran</option>
                <option value="type">Jenis file</option>
                <option value="modified">Tanggal diubah</option>
              </select>
              <button
                className="btn btn-ghost"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                title={sortDir === "asc" ? "Menaik (A-Z / kecil-besar)" : "Menurun (Z-A / besar-kecil)"}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                title="Ganti tampilan"
              >
                {view === "grid" ? "☰ Daftar" : "▦ Grid"}
              </button>
            </div>
          </div>

          {!query && recentFiles.length > 0 && (
            <div style={styles.recentSection}>
              <div style={styles.recentLabel}>File terbaru</div>
              <div style={styles.recentRow}>
                {recentFiles.map((f) => (
                  <button
                    key={f.id}
                    style={styles.recentCard}
                    onClick={() => (canPreview(f) ? setPreview(f) : null)}
                    title={f.name}
                  >
                    <span style={styles.recentIcon}>{iconFor(f)}</span>
                    <span style={styles.recentName}>{f.name}</span>
                    <span style={styles.recentTime}>{formatRelative(f.modifiedTime)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div style={styles.progressWrap}>
              <div style={{ ...styles.progressBar, width: `${uploadPct}%` }} />
              <span style={styles.progressLabel}>Mengunggah… {uploadPct}%</span>
            </div>
          )}

          {error && <div style={styles.errorBanner}>{error} <button onClick={() => setError("")} style={styles.dismiss}>✕</button></div>}

          <div
            style={{ ...styles.dropzone, ...(dragOver ? styles.dropzoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {loading ? (
              <div style={styles.emptyState}>Memuat…</div>
            ) : sortedFiles.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🗂️</div>
                {query ? "Tidak ada dokumen yang cocok." : "Folder ini masih kosong. Tarik file ke sini atau klik Unggah file."}
              </div>
            ) : view === "grid" ? (
              <div className="grid-files" style={styles.grid}>
                {sortedFiles.map((f) => (
                  <div key={f.id} className="card" style={styles.card}>
                    <div
                      style={styles.cardMain}
                      onClick={() => (isFolder(f) ? openFolder(f) : canPreview(f) ? setPreview(f) : null)}
                    >
                      {f.thumbnailLink && !isFolder(f) ? (
                        <div style={styles.thumbWrap}>
                          <img src={f.thumbnailLink} alt={f.name} style={styles.thumbImg} loading="lazy" />
                          {f.mimeType?.includes("video") && <span style={styles.playBadge}>▶</span>}
                        </div>
                      ) : (
                        <div style={styles.cardIcon}>{iconFor(f)}</div>
                      )}
                      <div style={styles.cardName} title={f.name}>{f.name}</div>
                      {!isFolder(f) && <div style={styles.cardMeta}>{formatSize(f.size)}</div>}
                    </div>
                    <div style={styles.cardActions}>
                      {!isFolder(f) && (
                        <a className="icon-btn" href={`/api/drive/download?fileId=${f.id}`} style={styles.iconBtn} title="Unduh">⬇</a>
                      )}
                      <button className="icon-btn" style={styles.iconBtn} title="Ganti nama" onClick={() => renameItem(f)}>✎</button>
                      <button className="icon-btn" style={styles.iconBtn} title="Hapus" onClick={() => deleteItem(f)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table className="files-table" style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>Nama</th>
                    <th style={styles.th}>Ukuran</th>
                    <th style={styles.th}>Diubah</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((f) => (
                    <tr key={f.id} style={styles.tr}>
                      <td
                        style={{ ...styles.td, cursor: "pointer" }}
                        onClick={() => (isFolder(f) ? openFolder(f) : canPreview(f) ? setPreview(f) : null)}
                      >
                        {iconFor(f)} {f.name}
                      </td>
                      <td style={styles.td}>{isFolder(f) ? "—" : formatSize(f.size)}</td>
                      <td style={styles.td}>{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("id-ID") : "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {!isFolder(f) && (
                          <a className="icon-btn" href={`/api/drive/download?fileId=${f.id}`} style={styles.iconBtn} title="Unduh">⬇</a>
                        )}
                        <button className="icon-btn" style={styles.iconBtn} title="Ganti nama" onClick={() => renameItem(f)}>✎</button>
                        <button className="icon-btn" style={styles.iconBtn} title="Hapus" onClick={() => deleteItem(f)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {preview && (
        <div className="modal-overlay" style={styles.modalBg} onClick={() => setPreview(null)}>
          <div className="modal-box" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span>{preview.name}</span>
              <button className="icon-btn" onClick={() => setPreview(null)} style={styles.iconBtn}>✕</button>
            </div>
            {preview.mimeType?.includes("image") ? (
              <img src={`/api/drive/view?fileId=${preview.id}`} alt={preview.name} style={styles.previewImg} />
            ) : preview.mimeType?.includes("video") ? (
              <video
                src={`/api/drive/view?fileId=${preview.id}`}
                controls
                autoPlay
                style={styles.previewVideo}
              />
            ) : (
              <iframe src={`/api/drive/view?fileId=${preview.id}`} style={styles.previewFrame} title={preview.name} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "var(--paper)" },
  sidebar: {
    width: 220, background: "var(--navy)", color: "white", padding: "24px 16px",
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoDot: { width: 10, height: 10, borderRadius: "50%", background: "var(--green)" },
  brandTitle: { fontFamily: "Fraunces, serif", fontSize: "1.05rem", color: "white" },
  brandSub: { fontSize: "0.78rem", color: "#9FB3C2" },
  uploadBtn: { width: "100%", marginBottom: 10 },
  sideBtn: { width: "100%", marginBottom: 10, background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" },
  sideFooter: { marginTop: "auto" },
  main: { flex: 1, padding: "24px 28px", minWidth: 0 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  crumbs: { fontSize: "0.95rem" },
  crumbBtn: { background: "none", border: "none", color: "var(--navy)", fontWeight: 600, padding: 0, fontSize: "0.95rem" },
  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  search: { width: 220 },
  sortSelect: {
    padding: "9px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)",
    background: "var(--card)", color: "var(--ink)", fontSize: "0.88rem",
  },
  recentSection: { marginBottom: 18 },
  recentLabel: { fontSize: "0.8rem", fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" },
  recentRow: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 },
  recentCard: {
    flexShrink: 0, width: 150, textAlign: "left", background: "var(--card)", border: "1px solid var(--line)",
    borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
  },
  recentIcon: { fontSize: 20 },
  recentName: { fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentTime: { fontSize: "0.72rem", color: "var(--ink-soft)" },
  progressWrap: { position: "relative", height: 8, background: "var(--line)", borderRadius: 6, marginBottom: 14, overflow: "hidden" },
  progressBar: { position: "absolute", top: 0, left: 0, height: "100%", background: "var(--green)", transition: "width 0.2s" },
  progressLabel: { position: "absolute", top: 12, left: 0, fontSize: "0.8rem", color: "var(--ink-soft)" },
  errorBanner: { background: "#FBEAE4", color: "var(--danger)", padding: "10px 14px", borderRadius: 8, marginBottom: 14, display: "flex", justifyContent: "space-between" },
  dismiss: { background: "none", border: "none", color: "var(--danger)", cursor: "pointer" },
  dropzone: { border: "2px dashed transparent", borderRadius: 14, minHeight: 300, transition: "border-color 0.15s" },
  dropzoneActive: { borderColor: "var(--green)", background: "var(--green-light)" },
  emptyState: { padding: "60px 20px", textAlign: "center", color: "var(--ink-soft)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 },
  card: { padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  cardMain: { cursor: "pointer" },
  cardIcon: { fontSize: 30 },
  thumbWrap: { position: "relative", width: "100%", height: 90, borderRadius: 8, overflow: "hidden", background: "var(--paper)" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  playBadge: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", color: "white", fontSize: "1.4rem" },
  cardName: { fontSize: "0.88rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardMeta: { fontSize: "0.75rem", color: "var(--ink-soft)" },
  cardActions: { display: "flex", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 },
  iconBtn: { background: "none", border: "none", color: "var(--ink-soft)", fontSize: "0.95rem", padding: "2px 4px", textDecoration: "none" },
  table: { width: "100%", borderCollapse: "collapse", background: "var(--card)", borderRadius: 12, overflow: "hidden" },
  tr: { borderBottom: "1px solid var(--line)" },
  th: { textAlign: "left", padding: "10px 14px", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 500 },
  td: { padding: "10px 14px", fontSize: "0.9rem" },
  modalBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modal: { background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 800, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 500 },
  previewImg: { width: "100%", height: "auto", maxHeight: "75vh", objectFit: "contain" },
  previewVideo: { width: "100%", maxHeight: "75vh", background: "black" },
  previewFrame: { width: "100%", height: "75vh", border: "none" },
};
