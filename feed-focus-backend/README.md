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
- `GEMINI_API_KEY` (required for real AI summaries)
- `GEMINI_MODEL` (default: `gemini-1.5-flash`)
- `AI_SUMMARY_DAILY_LIMIT` (default: `15`)
