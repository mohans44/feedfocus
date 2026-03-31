import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

const getBearerToken = (authHeader = "") => {
  const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

export const authRequired = async (req, res, next) => {
  try {
    const token =
      req.cookies?.[env.cookieName] ||
      getBearerToken(req.headers?.authorization);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id username email preferences");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
