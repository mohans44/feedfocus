# Feed Focus Frontend

React + Vite frontend for Feed Focus, styled with Tailwind and shadcn-style UI components.

## Stack

- React 19
- Vite 6
- Tailwind CSS
- React Query
- React Router
- Axios (cookie-based auth requests)

## Local setup

```bash
cd /Users/mohansai/Developer/feedfocus-v2/feed-focus-frontend
cp .env.example .env
npm install
npm run dev
```

`.env`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

## Build checks

```bash
npm run lint
npm run build
```

## Vercel

`vercel.json` rewrites all routes to `index.html` so React Router works on direct page refreshes.
