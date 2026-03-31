import express from "express";
import { User } from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import { enrichArticleTopics, normalizeTopic } from "../utils/topics.js";
import { fetchLiveNews, getLiveArticleById } from "../utils/liveNews.js";

const router = express.Router();
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_AI_MODEL =
  process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
const AI_SUMMARY_DAILY_LIMIT = Number(process.env.AI_SUMMARY_DAILY_LIMIT || 15);

const utcDateKey = () => new Date().toISOString().slice(0, 10);

const consumeAiSummaryQuota = async (userId) => {
  const today = utcDateKey();
  const incExisting = await User.updateOne(
    {
      _id: userId,
      "aiSummaryUsage.dateKey": today,
      "aiSummaryUsage.count": { $lt: AI_SUMMARY_DAILY_LIMIT },
    },
    { $inc: { "aiSummaryUsage.count": 1 } },
  );
  if (incExisting.modifiedCount === 1) {
    const current = await User.findById(userId).select("aiSummaryUsage");
    return {
      allowed: true,
      remaining: Math.max(
        0,
        AI_SUMMARY_DAILY_LIMIT - (current?.aiSummaryUsage?.count || 0),
      ),
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
    },
  );
  if (resetForToday.modifiedCount === 1) {
    return {
      allowed: true,
      remaining: AI_SUMMARY_DAILY_LIMIT - 1,
    };
  }

  const current = await User.findById(userId).select("aiSummaryUsage");
  const used =
    current?.aiSummaryUsage?.dateKey === today
      ? current.aiSummaryUsage.count || 0
      : 0;
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
  const content = String(article.content || article.summary || "").slice(
    0,
    8000,
  );
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

const buildAiCorrectionPrompt = (article) => {
  const content = String(article.content || article.summary || "").slice(
    0,
    10000,
  );
  return [
    "You are a newsroom editor. Rewrite article text to be clean, factual, and readable.",
    "Return STRICT JSON with keys: title, correctedContent, highlights.",
    "Rules:",
    "- title: concise and corrected (max 120 chars)",
    "- correctedContent: preserve all key facts, remove noise, fix grammar, keep neutral tone, 5-15 paragraphs.",
    "- highlights: array of 3 to 5 short bullet points.",
    "- Do not add facts that are not present in source text.",
    "",
    `Original title: ${article.title || ""}`,
    `Publisher: ${article.publisher || ""}`,
    `PublishedAt: ${article.publishedAt ? new Date(article.publishedAt).toISOString() : ""}`,
    `Source URL: ${article.url || ""}`,
    `Source text: ${content}`,
  ].join("\n");
};

const CLOUDFLARE_MODEL_CANDIDATES = [
  CLOUDFLARE_AI_MODEL,
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-70b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.1",
].filter(Boolean);

const callCloudflareGenerate = async (model, prompt) => {
  const normalizedModel = String(model || "").trim();
  if (!normalizedModel.startsWith("@cf/")) {
    throw new Error(`Invalid Cloudflare model id: ${normalizedModel}`);
  }
  // Cloudflare expects model path segments, e.g. /ai/run/@cf/meta/llama-3.1-8b-instruct
  // Do not encode "/" into "%2F" or route resolution fails with 7000.
  const modelPath = normalizedModel
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      CLOUDFLARE_ACCOUNT_ID,
    )}/ai/run/${modelPath}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 500,
        temperature: 0.2,
      }),
    },
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
            : "",
      )
      .join(" ");
  }
  return typeof result === "string" ? result : "";
};

const generateCloudflareSummary = async (article) => {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "AI provider is not configured (CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN missing)",
    );
  }
  if (String(CLOUDFLARE_ACCOUNT_ID).includes("@")) {
    throw new Error(
      "Invalid CLOUDFLARE_ACCOUNT_ID: looks like an email. Use Cloudflare Account ID (hex string), not email.",
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
    throw new Error(
      lastError || "Cloudflare AI request failed for all candidate models",
    );
  }

  const text = extractCloudflareText(payload);
  const parsed = parseModelJson(text);
  if (!parsed) {
    throw new Error("AI provider returned invalid JSON");
  }

  const enriched = enrichArticleTopics(article);
  const summaryText = String(parsed.summary || "")
    .replace(/\s+/g, " ")
    .trim();
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints
        .map((item) =>
          String(item || "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const category =
    normalizeTopic(parsed.category) || enriched.primaryCategory || "world";

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

const generateCloudflareCorrection = async (article) => {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "AI provider is not configured (CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN missing)",
    );
  }

  const prompt = buildAiCorrectionPrompt(article);
  let payload = null;
  let selectedModel = "";
  let lastError = "";

  for (const model of CLOUDFLARE_MODEL_CANDIDATES) {
    const response = await callCloudflareGenerate(model, prompt);
    if (!response.ok) {
      const body = await response.text();
      lastError = `Cloudflare AI correction failed for ${model} (${response.status}): ${body.slice(0, 240)}`;
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
    throw new Error(
      lastError || "Cloudflare AI correction failed for all candidate models",
    );
  }

  const text = extractCloudflareText(payload);
  const parsed = parseModelJson(text);
  if (!parsed) {
    throw new Error("AI provider returned invalid JSON for correction");
  }

  const correctedTitle = String(parsed.title || article.title || "")
    .replace(/\s+/g, " ")
    .trim();
  const correctedContent = String(parsed.correctedContent || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .map((item) =>
          String(item || "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (!correctedContent) {
    throw new Error("AI provider returned empty corrected content");
  }

  return {
    title: correctedTitle || article.title,
    content: correctedContent,
    highlights,
    generatedAt: new Date(),
    model: selectedModel || CLOUDFLARE_AI_MODEL,
  };
};

router.get("/", async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
    );
    const { limit = 20, cursor, topic, publisher, search } = req.query;
    const parsedLimit = parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 20;
    const normalizedTopic = normalizeTopic(topic);

    const feed = await fetchLiveNews({
      limit: safeLimit,
      cursor,
      topic: normalizedTopic || topic,
      search,
    });

    const filteredByPublisher = publisher
      ? (feed.items || []).filter(
          (item) =>
            String(item.publisher || "").toLowerCase() ===
            String(publisher).trim().toLowerCase(),
        )
      : feed.items || [];

    return res.json({
      items: filteredByPublisher,
      nextCursor: feed.nextCursor,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch articles" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const article = await getLiveArticleById({ id: req.params.id });
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    return res.json({ item: article });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch article" });
  }
});

const handleAiCorrection = async (req, res) => {
  try {
    const article = await getLiveArticleById({ id: req.params.id });
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const sourceContent = String(
      article.content || article.summary || "",
    ).trim();
    if (!sourceContent) {
      return res
        .status(400)
        .json({ error: "Article has no content to correct" });
    }

    const corrected = await generateCloudflareCorrection(article);

    return res.json({
      articleId: article._id,
      correctedTitle: corrected.title,
      correctedContent: corrected.content,
      highlights: corrected.highlights,
      generatedAt: corrected.generatedAt,
      model: corrected.model,
    });
  } catch (error) {
    console.error("AI correction error:", error.message);
    return res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Failed to AI-correct article"
          : `Failed to AI-correct article: ${error.message}`,
    });
  }
};

router.get("/:id/ai-corrected", handleAiCorrection);
router.get("/:id/ai-correct", handleAiCorrection);

const handleAiSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await getLiveArticleById({ id });
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const quota = await consumeAiSummaryQuota(req.user._id);
    if (!quota.allowed) {
      return res.status(429).json({
        error: `Daily AI summary limit reached (${AI_SUMMARY_DAILY_LIMIT}/day). Try again tomorrow.`,
        limit: AI_SUMMARY_DAILY_LIMIT,
        remaining: quota.remaining,
      });
    }

    const aiSummary = await generateCloudflareSummary(article);

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
