import express from "express";
import { Article } from "../models/Article.js";
import {
  enrichArticleTopics,
  isArticleInTopic,
  normalizeTopic,
  topicFilterClause,
} from "../utils/topics.js";

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const summarizeText = (content = "", maxSentences = 4) => {
  const clean = String(content).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const rawSentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 35);
  if (!rawSentences.length) return [];

  const scored = rawSentences.map((sentence, index) => {
    const score =
      (sentence.length > 90 ? 1.2 : 0.8) +
      (/\b(according|said|announced|reported|confirmed|expects)\b/i.test(sentence) ? 0.6 : 0) +
      (/\b(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(sentence)
        ? 0.3
        : 0) -
      index * 0.015;
    return { sentence, score, index };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
};

const buildAiSummary = (article) => {
  const enriched = enrichArticleTopics(article);
  const sourceText = enriched.content || enriched.summary || "";
  const keyPoints = summarizeText(sourceText, 4);
  const fallback = enriched.summary
    ? [String(enriched.summary).trim()]
    : [`${enriched.title} is the latest update from ${enriched.publisher}.`];
  const finalPoints = keyPoints.length ? keyPoints : fallback;
  const text = finalPoints.join(" ");

  return {
    text,
    keyPoints: finalPoints,
    category: enriched.primaryCategory || "world",
    generatedAt: new Date(),
    model: "heuristic-1min-v1",
  };
};

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=180");
    const { limit = 20, cursor, topic, publisher, search } = req.query;
    const parsedLimit = parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;
    const normalizedTopic = normalizeTopic(topic);

    const filterClauses = [];
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        filterClauses.push({ publishedAt: { $lt: cursorDate } });
      }
    }
    if (topic && (!normalizedTopic || normalizedTopic === "top-stories" || normalizedTopic === "for-you")) {
      const topicClause = topicFilterClause(topic);
      if (Object.keys(topicClause).length) filterClauses.push(topicClause);
    }
    if (publisher) {
      filterClauses.push({ publisher: String(publisher).trim() });
    }
    if (search) {
      const pattern = escapeRegex(String(search).trim());
      filterClauses.push({
        $or: [
        { title: { $regex: pattern, $options: "i" } },
        { summary: { $regex: pattern, $options: "i" } },
          { content: { $regex: pattern, $options: "i" } },
        ],
      });
    }
    const filter = filterClauses.length ? { $and: filterClauses } : {};

    let data = [];
    let hasMore = false;

    if (normalizedTopic && normalizedTopic !== "top-stories" && normalizedTopic !== "for-you") {
      const candidatePoolSize = Math.min(Math.max(safeLimit * 14, 180), 800);
      const candidates = await Article.find(filter)
        .sort({ publishedAt: -1 })
        .limit(candidatePoolSize)
        .lean();

      const matched = candidates
        .map((item) => enrichArticleTopics(item))
        .filter((item) => isArticleInTopic(item, normalizedTopic));

      hasMore = matched.length > safeLimit;
      data = hasMore ? matched.slice(0, safeLimit) : matched;
    } else {
      const articles = await Article.find(filter)
        .sort({ publishedAt: -1 })
        .limit(safeLimit + 1)
        .lean();

      hasMore = articles.length > safeLimit;
      data = (hasMore ? articles.slice(0, safeLimit) : articles).map((item) =>
        enrichArticleTopics(item)
      );
    }

    const nextCursor = hasMore ? data[data.length - 1].publishedAt.toISOString() : null;

    return res.json({ items: data, nextCursor });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch articles" });
  }
});

const handleAiSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const force = String(req.query.force || "") === "1";

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    if (article.aiSummary?.text && !force) {
      return res.json({
        articleId: article._id,
        summary: article.aiSummary.text,
        keyPoints: article.aiSummary.keyPoints || [],
        category: article.aiSummary.category || article.primaryCategory || "world",
        generatedAt: article.aiSummary.generatedAt,
        model: article.aiSummary.model || "heuristic-1min-v1",
      });
    }

    const aiSummary = buildAiSummary(article.toObject());
    article.aiSummary = aiSummary;
    if (!article.primaryCategory || article.primaryCategory === "world") {
      const enriched = enrichArticleTopics(article.toObject());
      article.topics = enriched.topics;
      article.primaryCategory = enriched.primaryCategory;
    }
    await article.save();

    return res.json({
      articleId: article._id,
      summary: aiSummary.text,
      keyPoints: aiSummary.keyPoints,
      category: aiSummary.category,
      generatedAt: aiSummary.generatedAt,
      model: aiSummary.model,
    });
  } catch (error) {
    console.error("AI summary error:", error.message);
    return res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Failed to generate AI summary"
          : `Failed to generate AI summary: ${error.message}`,
    });
  }
};

router.get("/:id/ai-summary", handleAiSummary);
router.post("/:id/ai-summary", handleAiSummary);

export default router;
