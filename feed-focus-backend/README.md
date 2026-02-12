# Feed Focus Backend (Node)

Express + MongoDB API for Feed Focus.

## Features

- Cookie-based JWT auth (`httpOnly`, 30-day session)
- Security middleware (`helmet`, `compression`, rate limiting)
- Articles API with cursor pagination, topic/publisher/search filters
- User profile, preferences, bookmarks
- AI-style `for-you` recommendation endpoint (preference + recency + quality scoring)

## Local setup

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-backend-node
cp .env.example .env
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

## Vercel

`vercel.json` routes `/api/*` to `api/index.js`.
`api/index.js` initializes MongoDB connection before handling requests.
