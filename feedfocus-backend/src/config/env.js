import dotenv from "dotenv";

dotenv.config();

const normalizeOrigin = (value = "") =>
  String(value).trim().replace(/\/+$/, "").toLowerCase();

const normalizeSameSite = (value = "lax") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["lax", "strict", "none"].includes(normalized)) {
    return normalized;
  }
  return "lax";
};

const required = ["MONGO_URI", "JWT_SECRET", "FRONTEND_URL"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrls: process.env.FRONTEND_URL.split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean),
  cookieName: process.env.COOKIE_NAME || "ff_session",
  jwtExpiryDays: 30,
  cookieSameSite: normalizeSameSite(process.env.COOKIE_SAMESITE || "lax"),
  cookieSecure:
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production" ||
    normalizeSameSite(process.env.COOKIE_SAMESITE || "lax") === "none",
};
