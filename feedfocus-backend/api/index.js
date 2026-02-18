import app from "../src/app.js";
import { connectDb } from "../src/config/db.js";

export default async function handler(req, res) {
  // Let preflight requests complete even if DB is temporarily unavailable.
  if (req.method === "OPTIONS") {
    return app(req, res);
  }

  try {
    await connectDb();
    return app(req, res);
  } catch (error) {
    console.error("Function startup failed:", error?.message || error);
    return res.status(500).json({
      error: "Service temporarily unavailable",
      detail: process.env.NODE_ENV === "production" ? undefined : error?.message,
    });
  }
}
