import { google } from "googleapis";

let cachedDrive = null;
let cachedAuth = null;

export function getAuthClient() {
  if (cachedAuth) return cachedAuth;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, atau GOOGLE_REFRESH_TOKEN belum diatur di environment variables"
    );
  }

  cachedAuth = new google.auth.OAuth2(clientId, clientSecret);
  cachedAuth.setCredentials({ refresh_token: refreshToken });
  return cachedAuth;
}

export function getDrive() {
  if (cachedDrive) return cachedDrive;
  cachedDrive = google.drive({ version: "v3", auth: getAuthClient() });
  return cachedDrive;
}

export function rootFolderId() {
  const id = process.env.DRIVE_FOLDER_ID;
  if (!id) throw new Error("DRIVE_FOLDER_ID belum diatur di environment variables");
  return id;
}
