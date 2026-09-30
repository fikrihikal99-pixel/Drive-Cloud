import fs from "fs";
import formidable from "formidable";
import { requireAuth } from "../../../lib/auth";
import { getDrive, rootFolderId } from "../../../lib/drive";

export const config = {
  api: { bodyParser: false },
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan" });
  }

  const form = formidable({ maxFileSize: MAX_SIZE, multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      const msg = String(err.message || "").includes("maxFileSize")
        ? "Ukuran file melebihi batas 50 MB"
        : "Gagal membaca file upload";
      return res.status(400).json({ error: msg });
    }

    try {
      const drive = getDrive();
      const parent = (fields.folderId && String(fields.folderId)) || rootFolderId();
      const uploaded = Array.isArray(files.file) ? files.file : [files.file].filter(Boolean);

      if (uploaded.length === 0) {
        return res.status(400).json({ error: "Tidak ada file yang dikirim" });
      }

      const results = [];
      for (const f of uploaded) {
        const media = {
          mimeType: f.mimetype || "application/octet-stream",
          body: fs.createReadStream(f.filepath),
        };
        const response = await drive.files.create({
          requestBody: { name: f.originalFilename, parents: [parent] },
          media,
          fields: "id, name",
        });
        results.push(response.data);
      }

      return res.status(200).json({ ok: true, uploaded: results });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message || "Gagal mengunggah ke Google Drive" });
    }
  });
}

export default requireAuth(handler);
