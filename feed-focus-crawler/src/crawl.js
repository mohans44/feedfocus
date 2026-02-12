import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import mongoose from "mongoose";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { Article } from "./models/Article.js";
import { asyncPool } from "./utils/asyncPool.js";
import { inferTopicsFromText } from "./utils/topics.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publishersPath = path.join(__dirname, "../data/publishers.json");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("Missing MONGO_URI");

const USER_AGENT =
  process.env.CRAWLER_USER_AGENT ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = Number(process.env.CRAWLER_FETCH_TIMEOUT_MS || 12000);
const FETCH_RETRIES = Number(process.env.CRAWLER_FETCH_RETRIES || 3);
const PUBLISHER_CONCURRENCY = Number(process.env.CRAWLER_PUBLISHER_CONCURRENCY || 10);
const FEED_DISCOVERY_CONCURRENCY = Number(process.env.CRAWLER_FEED_DISCOVERY_CONCURRENCY || 8);
const PUBLISHER_URL_LIMIT = Number(process.env.CRAWLER_URL_LIMIT || 350);
const FEED_ITEM_LIMIT = Number(process.env.CRAWLER_FEED_ITEM_LIMIT || 140);
const MAX_SITEMAP_URLS = Number(process.env.CRAWLER_MAX_SITEMAP_URLS || 1200);
const MAX_ARTICLE_AGE_HOURS = Number(process.env.CRAWLER_MAX_ARTICLE_AGE_HOURS || 72);
const ENABLE_HOMEPAGE_DISCOVERY = process.env.CRAWLER_ENABLE_HOMEPAGE_DISCOVERY === "true";
const ALLOWED_LANGUAGES = (process.env.CRAWLER_ALLOWED_LANGUAGES || "en")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const TRACKING_QUERY_PREFIXES = ["utm_", "fbclid", "gclid", "mc_", "ref", "cmpid", "igshid", "mkt_tok"];
const BLOCKED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf", ".mp4", ".mp3", ".zip"];
const BLOCKED_PATH_PARTS = [
  "/video",
  "/videos",
  "/live",
  "/podcast",
  "/audio",
  "/gallery",
  "/galleries",
  "/photos",
  "/image",
  "/newsletter",
  "/subscription",
  "/subscribe",
  "/topic/",
  "/tag/",
  "/author/",
];
const ARTICLE_PATH_HINTS = [
  "/news/",
  "/article/",
  "/story/",
  "/stories/",
  "/world/",
  "/business/",
  "/technology/",
  "/tech/",
  "/politics/",
  "/india/",
  "/sports/",
  "/science/",
  "/health/",
  "/culture/",
  "/entertainment/",
  "/fashion/",
  "/food/",
  "/travel/",
];

const TOPIC_ALIASES = {
  india: "india",
  world: "world",
  business: "business",
  tech: "technology",
  technology: "technology",
  entertainment: "culture",
  culture: "culture",
  fashion: "fashion",
  food: "food",
  travel: "travel",
  sports: "sports",
  science: "science",
  health: "health",
  politics: "politics",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const parseDateSafe = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hasValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());
const isRecentEnough = (date) => {
  if (!date) return true;
  return Date.now() - date.getTime() <= MAX_ARTICLE_AGE_HOURS * 60 * 60 * 1000;
};
const normalizeTopic = (value = "") => TOPIC_ALIASES[String(value).toLowerCase().trim()] || null;
const cleanText = (value = "") => value.replace(/\s+/g, " ").trim();
const normalizeLang = (value = "") =>
  String(value)
    .toLowerCase()
    .replace("_", "-")
    .split("-")[0]
    .trim();
const isAllowedLanguage = (value = "") => {
  if (!value) return true;
  const normalized = normalizeLang(value);
  if (!normalized) return true;
  return ALLOWED_LANGUAGES.includes(normalized);
};
const parseDateFromUrl = (url = "") => {
  const match = String(url).match(/(20\d{2})[\/-](0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const canonicalizeUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (TRACKING_QUERY_PREFIXES.some((prefix) => lower.startsWith(prefix))) url.searchParams.delete(key);
    }
    if (url.pathname && url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return null;
  }
};

const normalizeUrl = (base, href) => {
  if (!href) return null;
  try {
    return canonicalizeUrl(new URL(href, base).toString());
  } catch {
    return null;
  }
};

const domainForMatch = (input) => {
  const host = new URL(input).hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
};

const matchesPublisherDomain = (url, publisherDomain) => {
  try {
    const host = domainForMatch(url);
    return host === publisherDomain || host.endsWith(`.${publisherDomain}`);
  } catch {
    return false;
  }
};

const isLikelyArticleUrl = (url, publisher) => {
  try {
    const parsed = new URL(url);
    const lowerPath = parsed.pathname.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) return false;
    if (BLOCKED_PATH_PARTS.some((part) => lowerPath.includes(part))) return false;
    if (publisher.blockedPaths?.some((part) => lowerPath.includes(part))) return false;
    if (publisher.allowedPaths?.length) return publisher.allowedPaths.some((part) => lowerPath.includes(part));

    const looksDated = /\/20\d{2}\//.test(lowerPath) || /-\d{4,}/.test(lowerPath);
    const hasHint = ARTICLE_PATH_HINTS.some((hint) => lowerPath.includes(hint));
    const segmentCount = lowerPath.split("/").filter(Boolean).length;
    if (segmentCount < 2) return false;
    return segmentCount >= 3 || looksDated || hasHint;
  } catch {
    return false;
  }
};

const fetchWithRetry = async (url, { accept = "*/*" } = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept,
          "accept-language": "en-US,en;q=0.9",
          referer: new URL(url).origin,
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
        throw new Error(`${retryable ? "Retryable" : "Fetch"} status ${res.status} for ${url}`);
      }
      const encoding = String(res.headers.get("content-encoding") || "").toLowerCase();
      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      const isGzip = encoding.includes("gzip") || url.endsWith(".gz") || contentType.includes("application/x-gzip");

      if (isGzip) {
        const buf = Buffer.from(await res.arrayBuffer());
        try {
          return gunzipSync(buf).toString("utf8");
        } catch {
          return buf.toString("utf8");
        }
      }

      return res.text();
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) {
        const backoff = 300 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
        await wait(backoff);
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
};

const extractMetaContent = ($, selectors) => {
  for (const selector of selectors) {
    const value = ($(selector).attr("content") || $(selector).attr("datetime") || "").trim();
    if (value) return value;
  }
  return null;
};

const parseXmlUrls = (xml) => {
  const $ = cheerio.load(xml, { xml: true });
  const urls = $("url > loc")
    .map((_, el) => $(el).text().trim())
    .get();
  const sitemaps = $("sitemap > loc")
    .map((_, el) => $(el).text().trim())
    .get();
  return { urls, sitemaps };
};

const discoverRobotsSitemaps = async (homepage) => {
  try {
    const robotsUrl = new URL("/robots.txt", homepage).toString();
    const robots = await fetchWithRetry(robotsUrl, { accept: "text/plain" });
    return robots
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^sitemap:/i.test(line))
      .map((line) => line.split(":").slice(1).join(":").trim())
      .map((line) => canonicalizeUrl(line))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const discoverSitemapCandidates = async (publisher) => {
  const seeds = new Set();
  for (const sitemapUrl of publisher.sitemaps || []) {
    const normalized = normalizeUrl(publisher.homepage, sitemapUrl);
    if (normalized) seeds.add(normalized);
  }
  (await discoverRobotsSitemaps(publisher.homepage)).forEach((item) => seeds.add(item));
  ["/sitemap.xml", "/sitemap_index.xml", "/news-sitemap.xml"].forEach((pathPart) => {
    const url = normalizeUrl(publisher.homepage, pathPart);
    if (url) seeds.add(url);
  });

  const discoveredUrls = new Set();
  const seen = new Set();
  const queue = Array.from(seeds);
  while (queue.length && discoveredUrls.size < MAX_SITEMAP_URLS) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    try {
      const xml = await fetchWithRetry(sitemapUrl, { accept: "application/xml,text/xml,*/*" });
      const { urls, sitemaps } = parseXmlUrls(xml);
      urls.forEach((candidate) => {
        const normalized = canonicalizeUrl(candidate);
        if (normalized) discoveredUrls.add(normalized);
      });
      sitemaps.slice(0, 50).forEach((child) => {
        const normalized = canonicalizeUrl(child);
        if (normalized && !seen.has(normalized)) queue.push(normalized);
      });
    } catch {
      // ignore one sitemap failure
    }
  }

  return Array.from(discoveredUrls).map((url) => ({
    url,
    titleHint: null,
    publishedAt: null,
    sourceHint: "sitemap",
    topicHint: null,
  }));
};

const findRssLinksFromHomepage = (html, homepage) => {
  const $ = cheerio.load(html);
  return $("link[rel='alternate'][type*='rss'], link[rel='alternate'][type*='atom']")
    .map((_, el) => normalizeUrl(homepage, $(el).attr("href")))
    .get()
    .filter(Boolean);
};

const extractRssCategory = ($item) => {
  const raw = $item
    .find("category")
    .map((_, el) => cleanText($item.find("category").eq(_).text()))
    .get()
    .find(Boolean);
  return normalizeTopic(raw || "");
};

const parseRssItems = (xml, baseUrl, { topicHint = null } = {}) => {
  const $ = cheerio.load(xml, { xml: true });
  const feedLanguage =
    cleanText($("rss > channel > language").first().text()) ||
    cleanText($("feed > language").first().text()) ||
    "";
  const candidates = [];

  $("item").each((_, item) => {
    const $item = $(item);
    const itemLanguage =
      cleanText($item.find("dc\\:language").first().text()) ||
      cleanText($item.find("language").first().text()) ||
      feedLanguage;
    if (!isAllowedLanguage(itemLanguage)) return;
    const link = $item.find("link").first().text().trim() || $item.find("guid").first().text().trim();
    const url = normalizeUrl(baseUrl, link);
    if (!url) return;
    const publishedAt =
      parseDateSafe($item.find("pubDate").first().text().trim()) || parseDateSafe($item.find("dc\\:date").first().text().trim());
    if (!isRecentEnough(publishedAt)) return;
    const description = cleanText(
      $item.find("content\\:encoded").first().text() ||
        $item.find("description").first().text() ||
        $item.find("summary").first().text()
    );
    const imageUrl =
      $item.find("media\\:content").first().attr("url") ||
      $item.find("media\\:thumbnail").first().attr("url") ||
      $item.find("enclosure[type^='image']").first().attr("url") ||
      null;
    candidates.push({
      url,
      titleHint: cleanText($item.find("title").first().text()) || null,
      publishedAt,
      sourceHint: "rss",
      topicHint: normalizeTopic(topicHint) || extractRssCategory($item) || null,
      summaryHint: description ? description.slice(0, 320) : null,
      contentHint: description && description.length >= 120 ? description : null,
      imageHint: imageUrl || null,
      languageHint: itemLanguage ? normalizeLang(itemLanguage) : null,
    });
  });

  $("entry").each((_, entry) => {
    const $entry = $(entry);
    const itemLanguage =
      cleanText($entry.find("dc\\:language").first().text()) ||
      cleanText($entry.find("language").first().text()) ||
      feedLanguage;
    if (!isAllowedLanguage(itemLanguage)) return;
    const link =
      $entry.find("link[rel='alternate']").attr("href") ||
      $entry.find("link").first().attr("href") ||
      $entry.find("id").first().text().trim();
    const url = normalizeUrl(baseUrl, link);
    if (!url) return;
    const publishedAt =
      parseDateSafe($entry.find("published").first().text().trim()) || parseDateSafe($entry.find("updated").first().text().trim());
    if (!isRecentEnough(publishedAt)) return;
    const description = cleanText(
      $entry.find("content").first().text() ||
        $entry.find("summary").first().text() ||
        $entry.find("content\\:encoded").first().text()
    );
    const imageUrl =
      $entry.find("media\\:content").first().attr("url") ||
      $entry.find("media\\:thumbnail").first().attr("url") ||
      null;
    candidates.push({
      url,
      titleHint: cleanText($entry.find("title").first().text()) || null,
      publishedAt,
      sourceHint: "rss",
      topicHint: normalizeTopic(topicHint) || null,
      summaryHint: description ? description.slice(0, 320) : null,
      contentHint: description && description.length >= 120 ? description : null,
      imageHint: imageUrl || null,
      languageHint: itemLanguage ? normalizeLang(itemLanguage) : null,
    });
  });

  return candidates;
};

const toFeedConfig = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") return { url: entry, topic: null };
  if (typeof entry === "object" && entry.url) return { url: entry.url, topic: entry.topic || null };
  return null;
};

const discoverRssCandidates = async (publisher, homepageHtml) => {
  const feedConfigs = [];
  for (const entry of publisher.feeds || []) {
    const parsed = toFeedConfig(entry);
    if (parsed) feedConfigs.push(parsed);
  }
  for (const entry of publisher.rss || []) {
    const parsed = toFeedConfig(entry);
    if (parsed) feedConfigs.push(parsed);
  }
  if (!feedConfigs.length && homepageHtml) {
    findRssLinksFromHomepage(homepageHtml, publisher.homepage).forEach((url) => feedConfigs.push({ url, topic: null }));
    ["/rss", "/rss.xml", "/feed", "/feeds/news.xml"].forEach((pathPart) => {
      const url = normalizeUrl(publisher.homepage, pathPart);
      if (url) feedConfigs.push({ url, topic: null });
    });
  }

  const deduped = new Map();
  for (const config of feedConfigs) {
    const normalized = normalizeUrl(publisher.homepage, config.url);
    if (!normalized) continue;
    if (!deduped.has(normalized)) deduped.set(normalized, { url: normalized, topic: config.topic || null });
  }

  const candidates = [];
  const feedErrors = [];
  await asyncPool(
    FEED_DISCOVERY_CONCURRENCY,
    Array.from(deduped.values()).slice(0, 80),
    async (feedConfig) => {
      try {
        const xml = await fetchWithRetry(feedConfig.url, {
          accept: "application/rss+xml,application/atom+xml,text/xml,*/*",
        });
        const items = parseRssItems(xml, publisher.homepage, { topicHint: feedConfig.topic });
        candidates.push(...items.slice(0, FEED_ITEM_LIMIT));
      } catch {
        feedErrors.push(feedConfig.url);
      }
    }
  );

  if (feedErrors.length) {
    console.warn(`[${publisher.name}] feed errors=${feedErrors.length} sample=${feedErrors.slice(0, 2).join(", ")}`);
  }

  return candidates;
};

const discoverHomepageCandidates = (html, publisher) => {
  const $ = cheerio.load(html);
  const domain = domainForMatch(publisher.homepage);
  const candidates = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const url = normalizeUrl(publisher.homepage, href);
    if (!url) return;
    if (!matchesPublisherDomain(url, domain)) return;
    candidates.push({
      url,
      titleHint: cleanText($(el).text()) || null,
      publishedAt: null,
      sourceHint: "homepage",
      topicHint: null,
    });
  });
  return candidates;
};

const mergeAndFilterCandidates = (publisher, candidateLists) => {
  const domain = domainForMatch(publisher.homepage);
  const merged = new Map();

  for (const list of candidateLists) {
    for (const item of list) {
      const normalized = canonicalizeUrl(item?.url);
      if (!normalized) continue;
      if (!matchesPublisherDomain(normalized, domain)) continue;
      if (!isLikelyArticleUrl(normalized, publisher)) continue;
      if (!isRecentEnough(item.publishedAt)) continue;

      const existing = merged.get(normalized);
      if (!existing) {
        merged.set(normalized, { ...item, url: normalized });
        continue;
      }

      if (!existing.titleHint && item.titleHint) existing.titleHint = item.titleHint;
      if (!existing.topicHint && item.topicHint) existing.topicHint = item.topicHint;
      const existingDate = existing.publishedAt?.getTime() ?? 0;
      const nextDate = item.publishedAt?.getTime() ?? 0;
      if (nextDate > existingDate) existing.publishedAt = item.publishedAt;
      if (existing.sourceHint !== "rss" && item.sourceHint === "rss") existing.sourceHint = "rss";
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, PUBLISHER_URL_LIMIT);
};

const extractJsonLdArticleData = ($) => {
  const scripts = $("script[type='application/ld+json']")
    .map((_, el) => $(el).text())
    .get();
  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      for (const item of candidates) {
        const type = Array.isArray(item?.["@type"]) ? item["@type"].join(",") : item?.["@type"];
        if (!type || !/newsarticle|article/i.test(type)) continue;
        const image = Array.isArray(item.image) ? item.image[0]?.url || item.image[0] : item.image?.url || item.image;
        return {
          headline: item.headline || item.name || null,
          datePublished: item.datePublished || item.dateCreated || null,
          image: image || null,
          articleBody: item.articleBody || null,
        };
      }
    } catch {
      // ignore invalid json-ld
    }
  }
  return null;
};

const upsertArticleFromParts = async ({
  url,
  title,
  publisher,
  publishedAt,
  summary,
  content,
  topics,
  language,
  imageUrl,
  sourceType,
}) => {
  const primaryCategory = topics[0] || "world";
  await Article.updateOne(
    { url },
    {
      $set: {
        title,
        publisher,
        publishedAt,
        fetchedAt: new Date(),
        summary,
        content,
        topics,
        primaryCategory,
        language,
        imageUrl: imageUrl || null,
        sourceType,
      },
    },
    { upsert: true }
  );
};

const extractArticle = async (candidate, publisher) => {
  const fallbackFromFeed = async () => {
    const title = candidate.titleHint || null;
    const content = cleanText(candidate.contentHint || "");
    const publishedAt = candidate.publishedAt || parseDateFromUrl(candidate.url) || null;
    const language = normalizeLang(candidate.languageHint || "en");

    if (!title || !content || content.length < 120) {
      throw new Error("Insufficient content");
    }
    if (!hasValidDate(publishedAt)) throw new Error("Missing published date");
    if (!isRecentEnough(publishedAt)) throw new Error("Too old");
    if (!isAllowedLanguage(language)) throw new Error("Non-English article");

    const summary = cleanText(candidate.summaryHint || content.slice(0, 320));
    const inferredTopics = inferTopicsFromText(`${title} ${summary} ${content.slice(0, 3000)}`);
    const hintedTopic = normalizeTopic(candidate.topicHint || "");
    const topics = Array.from(new Set([hintedTopic, ...inferredTopics].filter(Boolean))).slice(0, 3);

    await upsertArticleFromParts({
      url: candidate.url,
      title,
      publisher: publisher.name,
      publishedAt,
      summary,
      content,
      topics,
      language,
      imageUrl: candidate.imageHint || null,
      sourceType: "rss",
    });
  };

  try {
    const html = await fetchWithRetry(candidate.url, { accept: "text/html,application/xhtml+xml,*/*" });
    const dom = new JSDOM(html, { url: candidate.url });
    const reader = new Readability(dom.window.document);
    const readable = reader.parse();
    const $ = cheerio.load(html);
    const jsonLd = extractJsonLdArticleData($);

    const title =
      extractMetaContent($, ["meta[property='og:title']", "meta[name='twitter:title']"]) ||
      jsonLd?.headline ||
      cleanText(readable?.title || "") ||
      cleanText($("h1").first().text()) ||
      candidate.titleHint ||
      null;

    const publishedAt =
      parseDateSafe(
        extractMetaContent($, [
          "meta[property='article:published_time']",
          "meta[name='publish-date']",
          "meta[name='pubdate']",
          "meta[name='date']",
          "meta[itemprop='datePublished']",
          "time[datetime]",
        ])
      ) ||
      parseDateSafe(jsonLd?.datePublished) ||
      candidate.publishedAt ||
      parseDateFromUrl(candidate.url) ||
      null;

    if (!hasValidDate(publishedAt)) throw new Error("Missing published date");
    if (!isRecentEnough(publishedAt)) throw new Error("Too old");

    const imageUrl =
      extractMetaContent($, ["meta[property='og:image']", "meta[name='twitter:image']", "meta[itemprop='image']"]) ||
      jsonLd?.image ||
      candidate.imageHint ||
      null;

    const language =
      normalizeLang(
        $("html").attr("lang") ||
          extractMetaContent($, ["meta[property='og:locale']", "meta[name='language']"]) ||
          candidate.languageHint ||
          "en"
      ) || "en";
    if (!isAllowedLanguage(language)) throw new Error("Non-English article");

    const readabilityText = cleanText(readable?.textContent || "");
    const articleNodeText = cleanText(
      $("article p")
        .map((_, p) => $(p).text())
        .get()
        .join(" ")
    );
    const jsonLdBody = cleanText(jsonLd?.articleBody || "");
    const fallbackContent = cleanText(candidate.contentHint || "");
    const content = [readabilityText, articleNodeText, jsonLdBody, fallbackContent]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0];

    if (!title || !content || content.length < 220) {
      if (candidate.sourceHint === "rss") return fallbackFromFeed();
      throw new Error("Insufficient content");
    }

    const summary = cleanText(candidate.summaryHint || content.slice(0, 320));
    const inferredTopics = inferTopicsFromText(`${title} ${summary} ${content.slice(0, 3000)}`);
    const hintedTopic = normalizeTopic(candidate.topicHint || "");
    const topics = Array.from(new Set([hintedTopic, ...inferredTopics].filter(Boolean))).slice(0, 3);

    await upsertArticleFromParts({
      url: candidate.url,
      title,
      publisher: publisher.name,
      publishedAt,
      summary,
      content,
      topics,
      language,
      imageUrl,
      sourceType: candidate.sourceHint || "crawl",
    });
  } catch (error) {
    if (candidate.sourceHint === "rss") {
      return fallbackFromFeed();
    }
    throw error;
  }
};

const discoverPublisherCandidates = async (publisher) => {
  let homepageHtml = "";
  if (!publisher.skipHomepage) {
    try {
      homepageHtml = await fetchWithRetry(publisher.homepage, { accept: "text/html,application/xhtml+xml,*/*" });
    } catch (error) {
      console.warn(`[${publisher.name}] homepage unavailable, continuing with feeds/sitemaps: ${error.message}`);
    }
  }

  const rssCandidates = await discoverRssCandidates(publisher, homepageHtml);
  const sitemapCandidates = await discoverSitemapCandidates(publisher);
  const homepageCandidates =
    ENABLE_HOMEPAGE_DISCOVERY && homepageHtml ? discoverHomepageCandidates(homepageHtml, publisher) : [];
  return mergeAndFilterCandidates(publisher, [rssCandidates, sitemapCandidates, homepageCandidates]);
};

const run = async () => {
  const publishersRaw = await fs.readFile(publishersPath, "utf-8");
  const publishers = JSON.parse(publishersRaw);
  await mongoose.connect(MONGO_URI);
  console.log(
    `Crawler started. publishers=${publishers.length} urlLimit=${PUBLISHER_URL_LIMIT} concurrency=${PUBLISHER_CONCURRENCY}`
  );

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const publisher of publishers) {
    const startedAt = Date.now();
    try {
      const candidates = await discoverPublisherCandidates(publisher);
      let success = 0;
      let failed = 0;
      const failReasons = new Map();
      await asyncPool(PUBLISHER_CONCURRENCY, candidates, async (candidate) => {
        try {
          await extractArticle(candidate, publisher);
          success += 1;
        } catch (error) {
          failed += 1;
          const key = error?.message || "Unknown extraction error";
          failReasons.set(key, (failReasons.get(key) || 0) + 1);
        }
      });
      totalSuccess += success;
      totalFailed += failed;
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const topFailures = Array.from(failReasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => `${reason}:${count}`)
        .join(" | ");
      console.log(
        `[${publisher.name}] candidates=${candidates.length} success=${success} failed=${failed} duration=${elapsed}s${topFailures ? ` failures=${topFailures}` : ""}`
      );
    } catch (error) {
      console.error(`[${publisher.name}] failed: ${error.message}`);
    }
    await wait(120);
  }

  await mongoose.disconnect();
  console.log(`Crawl completed. totalSuccess=${totalSuccess} totalFailed=${totalFailed}`);
};

run().catch(async (error) => {
  console.error("Crawler crashed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});
