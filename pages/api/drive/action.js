import { requireAuth } from "../../../lib/auth";
import { getDrive, rootFolderId } from "../../../lib/drive";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan" });
  }

  const { action, fileId, name, parentId } = req.body || {};
  const drive = getDrive();

  try {
    if (action === "delete") {
      if (!fileId) return res.status(400).json({ error: "fileId wajib diisi" });
      await drive.files.delete({ fileId });
      return res.status(200).json({ ok: true });
    }

    if (action === "rename") {
      if (!fileId || !name) return res.status(400).json({ error: "fileId dan name wajib diisi" });
      const updated = await drive.files.update({
        fileId,
        requestBody: { name },
        fields: "id, name",
      });
      return res.status(200).json({ ok: true, file: updated.data });
    }

    if (action === "mkdir") {
      if (!name) return res.status(400).json({ error: "name wajib diisi" });
      const created = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId || rootFolderId()],
        },
        fields: "id, name",
      });
      return res.status(200).json({ ok: true, folder: created.data });
    }

    return res.status(400).json({ error: "Aksi tidak dikenali" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Aksi gagal dijalankan" });
  }
}

export default requireAuth(handler);
