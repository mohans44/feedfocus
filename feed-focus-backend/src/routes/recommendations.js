import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Article } from "../models/Article.js";
import { enrichArticleTopics, normalizeTopic, preferenceScore } from "../utils/topics.js";

const router = express.Router();

router.get("/for-you", authRequired, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const parsedLimit = parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 30) : 10;
    const normalizedPreferences = Array.from(
      new Set((req.user.preferences || []).map((item) => normalizeTopic(item)).filter(Boolean))
    );

    const recentItems = await Article.find({})
      .sort({ publishedAt: -1 })
      .limit(250)
      .lean();

    const rankedAll = recentItems
      .map((object) => {
        const enriched = enrichArticleTopics(object);
        const score = preferenceScore(enriched, normalizedPreferences);
        return {
          ...enriched,
          aiScore: Number(score.toFixed(3)),
          reason:
            normalizedPreferences.length > 0
              ? "Ranked by preference match + recency + content quality"
              : "Ranked by recency + content quality",
        };
      })
      .sort((a, b) => b.aiScore - a.aiScore);

    const ranked =
      normalizedPreferences.length > 0
        ? rankedAll.filter(
            (item) =>
              normalizedPreferences.includes(item.primaryCategory) ||
              (item.topics || []).some((topic) => normalizedPreferences.includes(topic))
          )
        : rankedAll;

    // Keep source diversity in top picks.
    const payload = [];
    const seenPublishers = new Set();
    for (const item of ranked) {
      if (payload.length >= safeLimit) break;
      if (!seenPublishers.has(item.publisher) || payload.length < 4) {
        payload.push(item);
        seenPublishers.add(item.publisher);
      }
    }
    if (payload.length < safeLimit) {
      for (const item of ranked) {
        if (payload.length >= safeLimit) break;
        if (!payload.find((entry) => entry._id.toString() === item._id.toString())) {
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
