import { requireAuth } from "../../../lib/auth";
import { getDrive, rootFolderId } from "../../../lib/drive";

async function handler(req, res) {
  try {
    const drive = getDrive();
    const parent = req.query.folderId || rootFolderId();
    const q = req.query.q ? req.query.q.trim() : "";

    let query = `'${parent}' in parents and trashed = false`;
    if (q) {
      const escaped = q.replace(/'/g, "\\'");
      query = `'${rootFolderId()}' in parents and trashed = false and name contains '${escaped}'`;
    }

    const result = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, thumbnailLink)",
      orderBy: "folder,name_natural",
      pageSize: 200,
    });

    let breadcrumb = [];
    if (!q && parent !== rootFolderId()) {
      try {
        const meta = await drive.files.get({ fileId: parent, fields: "id, name" });
        breadcrumb = [{ id: meta.data.id, name: meta.data.name }];
      } catch (e) {
        // abaikan jika gagal ambil nama folder
      }
    }

    return res.status(200).json({ files: result.data.files || [], breadcrumb });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Gagal memuat daftar file" });
  }
}

export default requireAuth(handler);
