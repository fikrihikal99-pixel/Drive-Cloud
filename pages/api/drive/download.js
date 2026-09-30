import { isValidSession } from "../../../lib/auth";
import { getDrive } from "../../../lib/drive";

export default async function handler(req, res) {
  if (!isValidSession(req)) {
    return res.status(401).json({ error: "Belum login" });
  }

  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: "fileId wajib diisi" });

  try {
    const drive = getDrive();
    const meta = await drive.files.get({ fileId, fields: "name, mimeType" });

    const fileRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", meta.data.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(meta.data.name)}"`
    );

    fileRes.data
      .on("error", () => res.status(500).end("Gagal mengunduh file"))
      .pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Gagal mengunduh file" });
  }
}
