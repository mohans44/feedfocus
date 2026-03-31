import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Article } from "../models/Article.js";
import {
  enrichArticleTopics,
  normalizeTopic,
  preferenceScore,
} from "../utils/topics.js";

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

    const recentItems = await Article.find({})
      .sort({ publishedAt: -1 })
      .limit(320)
      .lean();

    const freshnessWindowMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const rankedAll = recentItems
      .filter((item) => {
        const publishedAt = new Date(item.publishedAt).getTime();
        return (
          Number.isFinite(publishedAt) && now - publishedAt <= freshnessWindowMs
        );
      })
      .map((object) => {
        const enriched = enrichArticleTopics(object);
        const score = preferenceScore(enriched, normalizedPreferences);
        return {
          ...enriched,
          aiScore: Number(score.toFixed(3)),
          reason:
            normalizedPreferences.length > 0
              ? "Ranked by preference match, freshness, quality, and source diversity"
              : "Ranked by freshness, quality, and source diversity",
        };
      })
      .sort((a, b) => b.aiScore - a.aiScore);

    const ranked =
      normalizedPreferences.length > 0
        ? rankedAll.filter(
            (item) =>
              normalizedPreferences.includes(item.primaryCategory) ||
              (item.topics || []).some((topic) =>
                normalizedPreferences.includes(topic),
              ),
          )
        : rankedAll;

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
        if (
          !payload.find((entry) => entry._id.toString() === item._id.toString())
        ) {
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
