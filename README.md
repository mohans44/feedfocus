# Feed Focus

Feed Focus is a modern news platform with:

- `feed-focus-frontend`: React + Vite + Tailwind + shadcn-style UI
- `feed-focus-backend-node`: Node + Express + MongoDB API (httpOnly cookie auth, 30-day session)
- `feed-focus-crawler`: crawler worker that ingests trusted publisher articles into MongoDB (publisher-driven feeds/sitemaps)

`feed-focus-backend` (Spring Boot) is retained as the legacy implementation.

## Highlights

- Category feed + AI-powered "For You"
- Bookmarking + AI summary per article
- Username-based signup with required preferences (minimum 4)
- Profile management for password and preferences
- Location-based weather chip in navbar (after login and location permission)

## Local Setup

### 1) Start MongoDB

Run MongoDB locally (default URI usually `mongodb://127.0.0.1:27017/feedfocus`).

### 2) Start API

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-backend-node
cp .env.example .env
npm install
npm run dev
```

### 3) Start frontend

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-frontend
cp .env.example .env
npm install
npm run dev
```

### 4) Run crawler manually

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-crawler
cp .env.example .env
npm install
npm run crawl
```

## Frontend Environment

In `feed-focus-frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

## API Notes

- Signup expects: `username`, `password`, `preferences` (min 4)
- Login accepts either `username` or `email` via `identifier`
- Session auth uses secure cookies (`httpOnly`)
- Main APIs:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/users/me`
  - `GET /api/articles`
  - `GET /api/recommendations/for-you`

## Deployment

- Frontend: Vercel (or any static host)
- API: Vercel (`feed-focus-backend-node/vercel.json` included)
- Crawler: GitHub Actions (`.github/workflows/crawl.yml`) with `MONGO_URI` repo secret
