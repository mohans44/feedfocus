# Feed Focus Crawler

Crawler worker for ingesting news articles from trusted publishers into MongoDB.

## Local run

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-crawler
cp .env.example .env
npm install
npm run crawl
```

Required env vars:

- `MONGO_URI`

Edit publishers list in:

- `data/publishers.json`

Publisher format:

```json
{
  "name": "Publisher name",
  "homepage": "https://example.com",
  "feeds": [
    { "url": "https://example.com/feed.xml", "topic": "technology" }
  ],
  "rss": ["https://example.com/feed.xml"],
  "sitemaps": ["https://example.com/news-sitemap.xml"],
  "allowedPaths": ["/news/", "/article/"],
  "blockedPaths": ["/opinion/"]
}
```

Notes:

- `feeds`, `rss`, `sitemaps`, `allowedPaths`, and `blockedPaths` are optional.
- Prefer `feeds` with explicit topic labels for high-quality category coverage.
- Crawler auto-discovers RSS links and sitemaps from homepage + robots.txt when not provided.
- `allowedPaths` is strongly recommended for cleaner extraction quality.
- Crawler stores source `publishedAt` only (and skips articles where publish date cannot be extracted).

## Throughput tuning (5k+ daily target)

Set via env vars:

- `CRAWLER_PUBLISHER_CONCURRENCY` (default `10`)
- `CRAWLER_URL_LIMIT` (default `350`)
- `CRAWLER_FEED_ITEM_LIMIT` (default `140`)
- `CRAWLER_MAX_ARTICLE_AGE_HOURS` (default `72`)
- `CRAWLER_ENABLE_HOMEPAGE_DISCOVERY=true` (optional, broader but noisier)

Recommended scheduling for 5k-10k/day:

- Run crawler every 10-20 minutes (not once daily).
- Keep URL dedupe on article URL (already enabled in schema).

## Scheduled runs

GitHub Actions workflow file:

- `/Users/mohansai/Developer/feedfocus-v2/.github/workflows/crawl.yml`
