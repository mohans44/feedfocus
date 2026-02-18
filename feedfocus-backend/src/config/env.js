import dotenv from "dotenv";

dotenv.config();

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
    .map((item) => item.trim())
    .filter(Boolean),
  cookieName: process.env.COOKIE_NAME || "ff_session",
  jwtExpiryDays: 30,
  cookieSameSite: process.env.COOKIE_SAMESITE || "lax",
  cookieSecure:
    process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
};
