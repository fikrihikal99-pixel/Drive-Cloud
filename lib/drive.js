import { google } from "googleapis";

let cachedDrive = null;

export function getDrive() {
  if (cachedDrive) return cachedDrive;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum diatur di environment variables");

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan JSON yang benar)");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

export function rootFolderId() {
  const id = process.env.DRIVE_FOLDER_ID;
  if (!id) throw new Error("DRIVE_FOLDER_ID belum diatur di environment variables");
  return id;
}
