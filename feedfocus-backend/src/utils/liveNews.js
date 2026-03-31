import crypto from "node:crypto";
import {
  enrichArticleTopics,
  normalizeTopic,
  preferenceScore,
} from "./topics.js";

const LIVE_TIMEOUT_MS = Number(process.env.LIVE_NEWS_TIMEOUT_MS || 9000);
const LIVE_MAX_AGE_HOURS = Number(process.env.LIVE_NEWS_MAX_AGE_HOURS || 72);
const LIVE_FETCH_LIMIT = Number(process.env.LIVE_NEWS_FETCH_LIMIT || 280);

const SOURCE_FEEDS = [
  {
    publisher: "BBC",
    feeds: [
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://feeds.bbci.co.uk/news/business/rss.xml",
      "https://feeds.bbci.co.uk/news/technology/rss.xml",
    ],
  },
  {
    publisher: "Reuters",
    feeds: [
      "https://feeds.reuters.com/reuters/topNews",
      "https://feeds.reuters.com/reuters/worldNews",
      "https://feeds.reuters.com/reuters/businessNews",
      "https://feeds.reuters.com/reuters/technologyNews",
    ],
  },
  {
    publisher: "The Guardian",
    feeds: [
      "https://www.theguardian.com/world/rss",
      "https://www.theguardian.com/uk/technology/rss",
      "https://www.theguardian.com/business/rss",
      "https://www.theguardian.com/sport/rss",
    ],
  },
  {
    publisher: "Hindustan Times",
    feeds: ["https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml"],
  },
  {
    publisher: "Times of India",
    feeds: [
      "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
      "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms",
      "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms",
    ],
  },
  {
    publisher: "NDTV",
    feeds: [
      "https://feeds.feedburner.com/ndtvnews-top-stories",
      "https://feeds.feedburner.com/ndtvnews-india-news",
      "https://feeds.feedburner.com/ndtvprofit-latest",
    ],
  },
  {
    publisher: "TechCrunch",
    feeds: ["https://techcrunch.com/feed/"],
  },
];

const decodeHtml = (value = "") =>
  String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value = "") =>
  decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchTag = (block, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(re);
  return match ? match[1].trim() : "";
};

const findImageUrl = (block) => {
  const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (enclosure?.[1]) return enclosure[1];
  const media = block.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (media?.[1]) return media[1];
  return "";
};

const parseFeedItems = (xml = "") => {
  const items = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const block of blocks) {
    const title = stripHtml(matchTag(block, "title"));
    const link = stripHtml(matchTag(block, "link"));
    const description = stripHtml(matchTag(block, "description"));
    const pubDateRaw =
      stripHtml(matchTag(block, "pubDate")) ||
      stripHtml(matchTag(block, "published"));
    const guid = stripHtml(matchTag(block, "guid"));
    const imageUrl = stripHtml(findImageUrl(block));

    if (!title || !link) continue;

    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const publishedAt = Number.isNaN(parsedDate.getTime())
      ? new Date()
      : parsedDate;

    items.push({
      title,
      url: link,
      summary: description,
      content: description,
      publishedAt,
      imageUrl: imageUrl || null,
      sourceId: guid || link,
    });
  }

  return items;
};

const isRecent = (publishedAt) => {
  const date = new Date(publishedAt).getTime();
  if (!Number.isFinite(date)) return false;
  return Date.now() - date <= LIVE_MAX_AGE_HOURS * 60 * 60 * 1000;
};

const buildLiveId = (url = "") => {
  const digest = crypto.createHash("sha1").update(String(url)).digest("hex");
  return `live_${digest}`;
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml, */*",
      "user-agent": "FeedFocus/1.0",
    },
    signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status}`);
  }
  return response.text();
};

const feedPoolForTopic = (topic) => {
  const normalized = normalizeTopic(topic);
  if (!normalized || normalized === "top-stories" || normalized === "for-you") {
    return SOURCE_FEEDS;
  }

  if (["technology", "science"].includes(normalized)) {
    return SOURCE_FEEDS.filter(
      (item) =>
        item.publisher === "TechCrunch" ||
        item.publisher === "BBC" ||
        item.publisher === "Reuters" ||
        item.publisher === "The Guardian",
    );
  }

  if (["india", "business"].includes(normalized)) {
    return SOURCE_FEEDS.filter(
      (item) =>
        item.publisher === "Hindustan Times" ||
        item.publisher === "Times of India" ||
        item.publisher === "NDTV" ||
        item.publisher === "Reuters",
    );
  }

  return SOURCE_FEEDS;
};

const toLiveArticle = (publisher, item) => {
  const normalized = enrichArticleTopics({
    _id: buildLiveId(item.url),
    url: item.url,
    title: item.title,
    publisher,
    publishedAt: item.publishedAt,
    fetchedAt: new Date(),
    summary: item.summary || "",
    content: item.content || item.summary || "",
    topics: [],
    language: "en",
    imageUrl: item.imageUrl || undefined,
    sourceType: "live",
  });

  return normalized;
};

const basicChecks = (article, search) => {
  if (!article?.url || !/^https?:\/\//i.test(article.url)) return false;
  if (!article?.title || article.title.length < 25) return false;
  if (!isRecent(article.publishedAt)) return false;
  if (!search) return true;

  const query = String(search).toLowerCase().trim();
  if (!query) return true;
  const haystack =
    `${article.title} ${article.summary || ""} ${article.content || ""}`.toLowerCase();
  return haystack.includes(query);
};

export const fetchLiveNews = async ({
  topic,
  search,
  limit = 20,
  cursor,
  preferences = [],
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const feeds = feedPoolForTopic(topic).flatMap((entry) =>
    entry.feeds.map((feed) => ({ feed, publisher: entry.publisher })),
  );

  const feedResults = await Promise.allSettled(
    feeds.map(async ({ feed, publisher }) => {
      const xml = await fetchText(feed);
      return parseFeedItems(xml).map((item) => toLiveArticle(publisher, item));
    }),
  );

  const seen = new Set();
  const merged = [];

  for (const result of feedResults) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      const key = item.url;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= LIVE_FETCH_LIMIT) break;
    }
  }

  const normalizedTopic = normalizeTopic(topic);
  const cursorDate = cursor ? new Date(String(cursor)) : null;
  const filtered = merged
    .filter((item) => basicChecks(item, search))
    .filter((item) => {
      if (
        !normalizedTopic ||
        normalizedTopic === "top-stories" ||
        normalizedTopic === "for-you"
      ) {
        return true;
      }
      if (item.primaryCategory === normalizedTopic) return true;
      return (item.topics || []).includes(normalizedTopic);
    })
    .filter((item) => {
      if (!cursorDate || Number.isNaN(cursorDate.getTime())) return true;
      const current = new Date(item.publishedAt).getTime();
      return Number.isFinite(current) && current < cursorDate.getTime();
    });

  const ranked = filtered
    .map((item) => ({
      ...item,
      aiScore: Number(preferenceScore(item, preferences).toFixed(3)),
    }))
    .sort((a, b) => {
      const scoreDiff = b.aiScore - a.aiScore;
      if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });

  const page = ranked.slice(0, safeLimit + 1);
  const hasMore = page.length > safeLimit;
  const items = hasMore ? page.slice(0, safeLimit) : page;

  return {
    items,
    nextCursor: hasMore
      ? new Date(items[items.length - 1].publishedAt).toISOString()
      : null,
  };
};

export const getLiveArticleById = async ({
  id,
  topic,
  search,
  preferences = [],
} = {}) => {
  if (!id) return null;
  const data = await fetchLiveNews({
    topic,
    search,
    limit: Math.max(80, LIVE_FETCH_LIMIT / 2),
    preferences,
  });
  return data.items.find((item) => item._id === id) || null;
};
