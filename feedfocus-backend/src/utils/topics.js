export const TOPIC_KEYWORDS = {
  india: [
    "india",
    "indian",
    "new delhi",
    "delhi",
    "mumbai",
    "bengaluru",
    "kolkata",
    "chennai",
    "hyderabad",
    "parliament of india",
    "lok sabha",
    "rajya sabha",
    "bjp",
    "congress",
  ],
  technology: [
    "ai",
    "software",
    "chip",
    "startup",
    "cloud",
    "app",
    "cyber",
    "tech",
    "semiconductor",
    "gadget",
    "internet",
  ],
  business: [
    "market",
    "economy",
    "stock",
    "finance",
    "company",
    "earnings",
    "invest",
    "inflation",
    "trade",
    "bank",
    "gdp",
  ],
  world: [
    "global",
    "international",
    "war",
    "diplomat",
    "nation",
    "border",
    "conflict",
    "summit",
    "united nations",
    "geopolitics",
  ],
  health: [
    "health",
    "hospital",
    "vaccine",
    "disease",
    "medical",
    "wellness",
    "doctor",
    "public health",
    "outbreak",
    "mental health",
  ],
  science: [
    "science",
    "research",
    "space",
    "nasa",
    "physics",
    "biology",
    "climate",
    "laboratory",
    "experiment",
    "astronomy",
  ],
  sports: [
    "sports",
    "football",
    "soccer",
    "cricket",
    "nba",
    "nfl",
    "tennis",
    "olympic",
    "tournament",
    "match",
  ],
  culture: [
    "culture",
    "entertainment",
    "film",
    "music",
    "art",
    "fashion",
    "media",
    "celebrity",
    "festival",
    "book",
    "cinema",
  ],
  fashion: [
    "fashion",
    "style",
    "runway",
    "designer",
    "couture",
    "wardrobe",
    "beauty",
  ],
  food: [
    "food",
    "recipe",
    "restaurant",
    "cuisine",
    "chef",
    "dining",
    "meal",
    "kitchen",
  ],
  travel: [
    "travel",
    "tourism",
    "trip",
    "flight",
    "airport",
    "destination",
    "hotel",
    "itinerary",
  ],
  politics: [
    "election",
    "policy",
    "government",
    "senate",
    "parliament",
    "minister",
    "president",
    "congress",
    "bill",
    "campaign",
  ],
};

const TOPIC_ALIASES = {
  "top-stories": "top-stories",
  "for-you": "for-you",
  india: "india",
  tech: "technology",
  technology: "technology",
  business: "business",
  world: "world",
  health: "health",
  science: "science",
  sports: "sports",
  fashion: "fashion",
  food: "food",
  travel: "travel",
  entertainment: "culture",
  culture: "culture",
  politics: "politics",
};

const URL_TOPIC_HINTS = {
  india: [
    "/india",
    "/india-news",
    "/nation",
    "/cities",
    "/new-delhi",
    "/mumbai",
  ],
  technology: [
    "/technology",
    "/tech",
    "/gadgets",
    "/startup",
    "/science-and-tech",
  ],
  business: [
    "/business",
    "/markets",
    "/economy",
    "/finance",
    "/companies",
    "/industry",
  ],
  world: [
    "/world",
    "/international",
    "/global",
    "/asia",
    "/europe",
    "/middle-east",
  ],
  health: ["/health", "/medical", "/wellness", "/fitness"],
  science: ["/science", "/space", "/climate", "/research", "/environment"],
  sports: ["/sports", "/cricket", "/football", "/nba", "/nfl", "/tennis"],
  culture: [
    "/culture",
    "/entertainment",
    "/movies",
    "/music",
    "/art",
    "/lifestyle",
  ],
  fashion: ["/fashion", "/style", "/beauty"],
  food: ["/food", "/recipe", "/recipes", "/dining"],
  travel: ["/travel", "/tourism", "/destinations", "/flights"],
  politics: ["/politics", "/election", "/government", "/policy", "/parliament"],
};

const tokenize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const scoreKeywordsInText = (keywords = [], text = "") => {
  const lowerText = text.toLowerCase();
  const tokenSet = new Set(tokenize(text));

  return keywords.reduce((acc, keyword) => {
    if (keyword.includes(" ")) {
      return acc + (lowerText.includes(keyword) ? 2 : 0);
    }
    return acc + (tokenSet.has(keyword) ? 1 : 0);
  }, 0);
};

export const normalizeTopic = (value = "") =>
  TOPIC_ALIASES[String(value).trim().toLowerCase().replace(/\s+/g, "-")] ||
  null;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const inferTopicScores = (text = "") => {
  const matches = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = scoreKeywordsInText(keywords, text);

    if (score > 0) {
      matches.push({ topic, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
};

const inferTopicScoresFromArticle = (article = {}) => {
  const titleText = String(article.title || "");
  const summaryText = String(article.summary || "");
  const contentText = String(article.content || "").slice(0, 6000);
  const urlText = String(article.url || "");

  const matches = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const titleScore = scoreKeywordsInText(keywords, titleText) * 2.4;
    const summaryScore = scoreKeywordsInText(keywords, summaryText) * 1.7;
    const contentScore = scoreKeywordsInText(keywords, contentText) * 1;
    const urlScore = scoreKeywordsInText(keywords, urlText) * 1.4;
    const score = titleScore + summaryScore + contentScore + urlScore;
    if (score > 0) matches.push({ topic, score });
  }

  return matches.sort((a, b) => b.score - a.score);
};

export const inferTopicsFromText = (text = "") => {
  const scores = inferTopicScores(text);
  if (!scores.length) {
    return ["world"];
  }

  return scores.slice(0, 3).map((item) => item.topic);
};

export const enrichArticleTopics = (article = {}) => {
  const lowerUrl = String(article.url || "").toLowerCase();
  const urlPrimary =
    Object.entries(URL_TOPIC_HINTS).find(([, hints]) =>
      hints.some((hint) => lowerUrl.includes(hint)),
    )?.[0] || null;

  const inferredScores = inferTopicScoresFromArticle(article);
  const inferred = inferredScores.map((item) => item.topic);
  const existing = (Array.isArray(article.topics) ? article.topics : [])
    .map((item) => normalizeTopic(item))
    .filter(Boolean);

  const savedPrimary = normalizeTopic(article.primaryCategory);
  const strongestInferred = inferred[0] || null;
  const strongestExisting =
    existing.find((item) => item !== "world") || existing[0] || null;

  let primaryCategory =
    urlPrimary ||
    strongestInferred ||
    savedPrimary ||
    strongestExisting ||
    "world";
  if (urlPrimary) {
    primaryCategory = urlPrimary;
  } else if (strongestInferred && inferredScores[0]?.score >= 2.5) {
    primaryCategory = strongestInferred;
  } else if (savedPrimary && savedPrimary !== "world") {
    primaryCategory = savedPrimary;
  }

  const topics = Array.from(
    new Set([primaryCategory, ...inferred, ...existing].filter(Boolean)),
  ).slice(0, 3);

  return {
    ...article,
    topics,
    primaryCategory,
  };
};

export const preferenceScore = (article, preferences = []) => {
  const normalizedPrefs = preferences
    .map((pref) => normalizeTopic(pref) || String(pref).toLowerCase())
    .filter(Boolean);
  const primaryHit = normalizedPrefs.includes(article.primaryCategory) ? 1 : 0;
  const secondaryHits = (article.topics || []).filter((topic) =>
    normalizedPrefs.includes(topic),
  ).length;
  const publishedAt = new Date(article.publishedAt).getTime();
  const ageHours = Number.isFinite(publishedAt)
    ? Math.max(1, (Date.now() - publishedAt) / (1000 * 60 * 60))
    : 24;
  const recency = 1 / Math.log2(ageHours + 2);
  const summaryRichness = Math.min((article.summary || "").length / 220, 1);
  const contentRichness = Math.min((article.content || "").length / 1200, 1);

  return (
    primaryHit * 2.8 +
    secondaryHits * 1.4 +
    recency * 1.2 +
    summaryRichness * 0.35 +
    contentRichness * 0.25
  );
};
