const TOPIC_KEYWORDS = {
  india: [
    "india",
    "indian",
    "new delhi",
    "delhi",
    "mumbai",
    "bengaluru",
    "lok sabha",
    "rajya sabha",
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
    "bank",
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
  ],
  health: [
    "health",
    "hospital",
    "vaccine",
    "disease",
    "medical",
    "wellness",
    "doctor",
    "outbreak",
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
  ],
  sports: [
    "sports",
    "football",
    "soccer",
    "cricket",
    "nba",
    "nfl",
    "tennis",
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
    "cinema",
  ],
  fashion: ["fashion", "style", "runway", "designer", "couture", "beauty"],
  food: ["food", "recipe", "restaurant", "cuisine", "chef", "dining", "meal"],
  travel: [
    "travel",
    "tourism",
    "trip",
    "flight",
    "airport",
    "destination",
    "hotel",
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
  ],
};

const tokenize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const scoreKeywordsInText = (keywords = [], text = "") => {
  const lowerText = String(text || "").toLowerCase();
  const tokenSet = new Set(tokenize(text));
  return keywords.reduce((acc, word) => {
    if (word.includes(" ")) return acc + (lowerText.includes(word) ? 2 : 0);
    return acc + (tokenSet.has(word) ? 1 : 0);
  }, 0);
};

export const inferTopicsFromText = (text = "") => {
  const scored = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, keywords]) => ({
      topic,
      score: scoreKeywordsInText(keywords, text),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.topic);

  return scored.length ? scored : ["world"];
};

export const inferTopicsFromArticle = ({
  title = "",
  summary = "",
  content = "",
  url = "",
} = {}) => {
  const scored = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, keywords]) => ({
      topic,
      score:
        scoreKeywordsInText(keywords, title) * 2.4 +
        scoreKeywordsInText(keywords, summary) * 1.7 +
        scoreKeywordsInText(keywords, String(content).slice(0, 6000)) +
        scoreKeywordsInText(keywords, url) * 1.4,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.topic);

  return scored.length ? scored : ["world"];
};
