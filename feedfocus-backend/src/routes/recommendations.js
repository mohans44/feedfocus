import express from "express";
import { authRequired } from "../middleware/auth.js";
import { normalizeTopic } from "../utils/topics.js";
import { fetchLiveNews } from "../utils/liveNews.js";

const router = express.Router();

router.get("/for-you", authRequired, async (req, res) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=90");
    const { limit = 10 } = req.query;
    const parsedLimit = parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 30)
      : 10;
    const normalizedPreferences = Array.from(
      new Set(
        (req.user.preferences || [])
          .map((item) => normalizeTopic(item))
          .filter(Boolean),
      ),
    );

    const feed = await fetchLiveNews({
      limit: Math.max(safeLimit * 3, 30),
      preferences: normalizedPreferences,
      topic: normalizedPreferences[0] || undefined,
    });

    const ranked = (feed.items || []).map((item) => ({
      ...item,
      reason:
        normalizedPreferences.length > 0
          ? "Ranked by your preferences, recency, and source quality"
          : "Ranked by recency and source quality",
    }));

    // Keep source and category diversity in top picks.
    const payload = [];
    const seenPublishers = new Set();
    const seenCategories = new Set();
    for (const item of ranked) {
      if (payload.length >= safeLimit) break;
      const category = item.primaryCategory || item.topics?.[0] || "world";
      const preferDiversity = payload.length < Math.min(8, safeLimit);
      const allowsPublisher =
        !seenPublishers.has(item.publisher) || payload.length < 4;
      const allowsCategory =
        !seenCategories.has(category) || payload.length < 5;

      if (!preferDiversity || (allowsPublisher && allowsCategory)) {
        payload.push(item);
        seenPublishers.add(item.publisher);
        seenCategories.add(category);
      }
    }
    if (payload.length < safeLimit) {
      for (const item of ranked) {
        if (payload.length >= safeLimit) break;
        if (!payload.find((entry) => String(entry._id) === String(item._id))) {
          payload.push(item);
        }
      }
    }

    return res.json({ items: payload });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load recommendations" });
  }
});

export default router;
