import express from "express";
import bcrypt from "bcryptjs";
import { authRequired } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = express.Router();

router.get("/me", authRequired, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      preferences: req.user.preferences,
    },
  });
});

router.put("/me", authRequired, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const updates = {};

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({ error: "Email already in use" });
      }
      updates.email = normalizedEmail;
    }

    if (password !== undefined) {
      const nextPassword = String(password);
      if (nextPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      updates.passwordHash = await bcrypt.hash(nextPassword, 12);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No valid profile updates provided" });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferences: user.preferences || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/preferences", authRequired, async (req, res) => {
  try {
    const { preferences = [] } = req.body || {};
    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: "preferences must be an array" });
    }
    const normalized = preferences
      .filter(Boolean)
      .map((pref) => String(pref).toLowerCase().trim())
      .filter(Boolean)
      .filter((pref, index, arr) => arr.indexOf(pref) === index)
      .slice(0, 25);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences: normalized },
      { new: true }
    );

    return res.json({ preferences: user.preferences });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update preferences" });
  }
});

router.get("/bookmarks", authRequired, async (req, res) => {
  const user = await User.findById(req.user._id).populate("bookmarks");
  return res.json({ items: user.bookmarks || [] });
});

router.post("/bookmarks", authRequired, async (req, res) => {
  try {
    const { articleId } = req.body || {};
    if (!articleId) {
      return res.status(400).json({ error: "articleId is required" });
    }
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { bookmarks: articleId },
    });
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to bookmark" });
  }
});

router.delete("/bookmarks/:id", authRequired, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { bookmarks: req.params.id },
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

export default router;
