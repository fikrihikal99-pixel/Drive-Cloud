import { isValidSession } from "../../../lib/auth";
import { getDrive } from "../../../lib/drive";

// Streaming inline (untuk pratinjau gambar/video/PDF di browser).
// Beda dengan download.js yang memaksa file terunduh.
export default async function handler(req, res) {
  if (!isValidSession(req)) {
    return res.status(401).json({ error: "Belum login" });
  }

  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: "fileId wajib diisi" });

  try {
    const drive = getDrive();
    const meta = await drive.files.get({ fileId, fields: "name, mimeType, size" });

    const range = req.headers.range;
    const headers = range ? { Range: range } : {};

    const fileRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream", headers }
    );

    res.setHeader("Content-Type", meta.data.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Accept-Ranges", "bytes");
    if (fileRes.headers["content-range"]) {
      res.status(206);
      res.setHeader("Content-Range", fileRes.headers["content-range"]);
    }
    if (fileRes.headers["content-length"]) {
      res.setHeader("Content-Length", fileRes.headers["content-length"]);
    }

    fileRes.data
      .on("error", () => res.status(500).end("Gagal memuat file"))
      .pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Gagal memuat file" });
  }
}
