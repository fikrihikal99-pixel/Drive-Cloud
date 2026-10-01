import { requireAuth } from "../../../lib/auth";
import { getAuthClient, rootFolderId } from "../../../lib/drive";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan" });
  }

  const { name, mimeType, size, folderId } = req.body || {};
  if (!name) return res.status(400).json({ error: "name wajib diisi" });
  if (size && size > MAX_SIZE) {
    return res.status(400).json({ error: `"${name}" melebihi batas 50 MB` });
  }

  try {
    const auth = getAuthClient();
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error("Gagal mendapatkan token akses Google");

    const initRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType || "application/octet-stream",
          ...(size ? { "X-Upload-Content-Length": String(size) } : {}),
        },
        body: JSON.stringify({
          name,
          parents: [folderId || rootFolderId()],
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("Gagal memulai upload:", errText);
      return res.status(502).json({ error: "Google Drive menolak permintaan upload" });
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive tidak mengirim URL upload");

    return res.status(200).json({ uploadUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Gagal memulai upload" });
  }
}

export default requireAuth(handler);
