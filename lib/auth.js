import crypto from "crypto";
import cookie from "cookie";

const COOKIE_NAME = "arsip_session";
const MAX_AGE = 60 * 60 * 12; // 12 jam

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum diatur di environment variables");
  return secret;
}

function sign(value) {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(value);
  return hmac.digest("hex");
}

export function createSessionCookie() {
  const payload = `admin.${Date.now()}`;
  const signature = sign(payload);
  const token = `${payload}.${signature}`;
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isValidSession(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, ts, signature] = parts;
  const payload = `${who}.${ts}`;

  const expected = sign(payload);
  const validSig =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSig) return false;

  const age = Date.now() - Number(ts);
  if (Number.isNaN(age) || age > MAX_AGE * 1000) return false;

  return true;
}

export function requireAuth(handler) {
  return async (req, res) => {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: "Belum login atau sesi berakhir" });
    }
    return handler(req, res);
  };
}
