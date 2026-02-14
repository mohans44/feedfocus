# FeedFocus Backend

Express + MongoDB API for Feed Focus.

## Features

- Cookie-based JWT auth (`httpOnly`, 30-day session)
- Security middleware
- Articles API with cursor pagination, topic/publisher/search filters
- User profile, preferences, bookmarks
- AI-style `for-you` recommendation

## Local setup

```bash
cd /feedfocusnews/feed-focus-backend
npm install
npm run dev
```

Required env vars:

- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL` (comma-separated allowed origins)

Optional env vars:

- `COOKIE_NAME`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `PORT`
- `CLOUDFLARE_ACCOUNT_ID` (required for real AI summaries)
- `CLOUDFLARE_API_TOKEN` (required for real AI summaries)
- `CLOUDFLARE_AI_MODEL` (default: `@cf/meta/llama-3.1-8b-instruct`)
- `AI_SUMMARY_DAILY_LIMIT` (default: `15`)
