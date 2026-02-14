import express from "express";
import { Article } from "../models/Article.js";
import { User } from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import {
  enrichArticleTopics,
  isArticleInTopic,
  normalizeTopic,
  topicFilterClause,
} from "../utils/topics.js";

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_AI_MODEL =
  process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
const AI_SUMMARY_DAILY_LIMIT = Number(process.env.AI_SUMMARY_DAILY_LIMIT || 15);

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

const utcDateKey = () => new Date().toISOString().slice(0, 10);

const consumeAiSummaryQuota = async (userId) => {
  const today = utcDateKey();
  const incExisting = await User.updateOne(
    {
      _id: userId,
      "aiSummaryUsage.dateKey": today,
      "aiSummaryUsage.count": { $lt: AI_SUMMARY_DAILY_LIMIT },
    },
    { $inc: { "aiSummaryUsage.count": 1 } }
  );
  if (incExisting.modifiedCount === 1) {
    const current = await User.findById(userId).select("aiSummaryUsage");
    return {
      allowed: true,
      remaining: Math.max(0, AI_SUMMARY_DAILY_LIMIT - (current?.aiSummaryUsage?.count || 0)),
    };
  }

  const resetForToday = await User.updateOne(
    {
      _id: userId,
      $or: [
        { "aiSummaryUsage.dateKey": { $exists: false } },
        { "aiSummaryUsage.dateKey": { $ne: today } },
      ],
    },
    {
      $set: {
        "aiSummaryUsage.dateKey": today,
        "aiSummaryUsage.count": 1,
      },
    }
  );
  if (resetForToday.modifiedCount === 1) {
    return {
      allowed: true,
      remaining: AI_SUMMARY_DAILY_LIMIT - 1,
    };
  }

  const current = await User.findById(userId).select("aiSummaryUsage");
  const used = current?.aiSummaryUsage?.dateKey === today ? current.aiSummaryUsage.count || 0 : 0;
  return {
    allowed: false,
    remaining: Math.max(0, AI_SUMMARY_DAILY_LIMIT - used),
  };
};

const parseModelJson = (raw = "") => {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const buildAiPrompt = (article) => {
  const content = String(article.content || article.summary || "").slice(0, 8000);
  return [
    "You summarize news into a concise 1-minute brief.",
    "Return STRICT JSON with keys: summary, keyPoints, category.",
    "Rules:",
    "- summary: 90-140 words, neutral, factual, no hype.",
    "- keyPoints: array with 3 to 5 short bullets.",
    "- category: one of india, world, technology, business, health, science, sports, culture, fashion, food, travel, politics.",
    "- Do not mention missing information.",
    "",
    `Title: ${article.title || ""}`,
    `Publisher: ${article.publisher || ""}`,
    `PublishedAt: ${article.publishedAt ? new Date(article.publishedAt).toISOString() : ""}`,
    `Source URL: ${article.url || ""}`,
    `Article Text: ${content}`,
  ].join("\n");
};

const CLOUDFLARE_MODEL_CANDIDATES = [
  CLOUDFLARE_AI_MODEL,
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-70b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.1",
].filter(Boolean);

const callCloudflareGenerate = async (model, prompt) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      CLOUDFLARE_ACCOUNT_ID
    )}/ai/run/${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        prompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    }
  );
  return response;
};

const extractCloudflareText = (payload = {}) => {
  const result = payload?.result;
  if (!result) return "";
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.output_text === "string") return result.output_text;
  if (Array.isArray(result?.content)) {
    return result.content
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item?.text === "string"
            ? item.text
            : ""
      )
      .join(" ");
  }
  return typeof result === "string" ? result : "";
};

const generateCloudflareSummary = async (article) => {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "AI provider is not configured (CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN missing)"
    );
  }

  const prompt = buildAiPrompt(article);
  let payload = null;
  let selectedModel = "";
  let lastError = "";

  for (const model of CLOUDFLARE_MODEL_CANDIDATES) {
    const response = await callCloudflareGenerate(model, prompt);
    if (!response.ok) {
      const body = await response.text();
      lastError = `Cloudflare AI request failed for ${model} (${response.status}): ${body.slice(0, 240)}`;
      if (response.status === 404 || response.status === 400) {
        continue;
      }
      throw new Error(lastError);
    }

    payload = await response.json();
    selectedModel = model;
    break;
  }

  if (!payload) {
    throw new Error(lastError || "Cloudflare AI request failed for all candidate models");
  }

  const text = extractCloudflareText(payload);
  const parsed = parseModelJson(text);
  if (!parsed) {
    throw new Error("AI provider returned invalid JSON");
  }

  const enriched = enrichArticleTopics(article);
  const summaryText = String(parsed.summary || "").replace(/\s+/g, " ").trim();
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints
        .map((item) => String(item || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const category = normalizeTopic(parsed.category) || enriched.primaryCategory || "world";

  if (!summaryText) {
    throw new Error("AI provider returned empty summary");
  }

  return {
    text: summaryText,
    keyPoints: keyPoints.length ? keyPoints : [summaryText],
    category,
    generatedAt: new Date(),
    model: selectedModel || CLOUDFLARE_AI_MODEL,
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

    const quota = await consumeAiSummaryQuota(req.user._id);
    if (!quota.allowed) {
      return res.status(429).json({
        error: `Daily AI summary limit reached (${AI_SUMMARY_DAILY_LIMIT}/day). Try again tomorrow.`,
        limit: AI_SUMMARY_DAILY_LIMIT,
        remaining: quota.remaining,
      });
    }

    const aiSummary = await generateCloudflareSummary(article.toObject());
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
      remainingToday: quota.remaining,
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

router.get("/:id/ai-summary", authRequired, handleAiSummary);
router.post("/:id/ai-summary", authRequired, handleAiSummary);

export default router;
