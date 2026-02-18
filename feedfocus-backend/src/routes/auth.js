import express from "express";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { env } from "../config/env.js";

const router = express.Router();
const cookieBaseOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
};
const cookieOptions = {
  ...cookieBaseOptions,
  maxAge: env.jwtExpiryDays * 24 * 60 * 60 * 1000,
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, preferences = [] } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const normalizedUsername = String(username).toLowerCase().trim();
    if (!usernameRegex.test(normalizedUsername)) {
      return res.status(400).json({ error: "Username must be 3-30 chars and can include letters, numbers, ., -, _" });
    }
    const normalizedEmail = email
      ? String(email).toLowerCase().trim()
      : `${normalizedUsername}@feedfocus.local`;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const normalizedPreferences = Array.isArray(preferences)
      ? [...new Set(preferences.filter(Boolean).map((item) => String(item).toLowerCase().trim()))].slice(0, 25)
      : [];
    if (normalizedPreferences.length < 4) {
      return res.status(400).json({ error: "Select at least 4 preferences" });
    }
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existing?.username === normalizedUsername) {
      return res.status(409).json({ error: "Username already in use" });
    }
    if (existing?.email === normalizedEmail) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      preferences: normalizedPreferences,
    });
    const token = signToken({ sub: user._id.toString() });
    res.cookie(env.cookieName, token, cookieOptions);
    return res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email, preferences: user.preferences },
    });
  } catch (error) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body || {};
    const loginId = String(identifier || username || email || "")
      .toLowerCase()
      .trim();
    if (!loginId || !password) {
      return res.status(400).json({ error: "Username/email and password required" });
    }
    const lookup = emailRegex.test(loginId)
      ? { email: loginId }
      : { username: loginId };
    const user = await User.findOne(lookup);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = signToken({ sub: user._id.toString() });
    res.cookie(env.cookieName, token, cookieOptions);
    return res.status(200).json({
      user: { id: user._id, username: user.username, email: user.email, preferences: user.preferences },
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie(env.cookieName, cookieBaseOptions);
  return res.status(200).json({ success: true });
});

export default router;
