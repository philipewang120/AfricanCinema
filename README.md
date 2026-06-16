# African Cinema

Standalone website for discovering African films, community submissions, and admin review.

Extracted from [Movie Rater](../) so it can be deployed and developed independently.

## Structure

```
african-cinema/
├── client/     # Vite + React frontend (port 5173)
├── server/     # Express API (port 3001)
└── migrations/ # PostgreSQL schema
```

## Routes (frontend)

| Path | Page |
|------|------|
| `/` | Browse — featured, top rated, latest (TMDB) |
| `/submit` | Submit a film (login required) |
| `/admin` | Admin dashboard (admin role required) |
| `/login` | Sign in |
| `/register` | Create account |

## Setup

### 1. Database

```bash
psql $DATABASE_URL -f migrations/001_schema.sql
```

Grant admin access by inserting into `admins`:

```sql
INSERT INTO admins (user_id, role) VALUES (1, 'admin');
```

### 2. Server

```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:3001
```

### 3. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

## Environment

**Server** (`server/.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for auth tokens |
| `TMDB_BEARER` | TMDB API v4 bearer token |
| `PORT` | API port (default 3001) |
| `CLIENT_URL` | Frontend origin for CORS |

**Client** (`client/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:3001` |

## Deploy

- **Frontend:** Netlify/Vercel — build `client/`, set `VITE_API_URL`
- **Backend:** Render/Railway — run `server/`, set env vars and `CLIENT_URL`

## Differences from Movie Rater

- Own branding (**African Cinema**, not Movie Rater)
- No “Add to my list” — browse only via TMDB links
- Any logged-in user can submit (no 10-movie eligibility gate)
- Email/password auth only (no OAuth in standalone server)
- Can use the **same database** as Movie Rater if tables already exist

## Movie Rater cleanup

African Cinema routes and nav were removed from the main Movie Rater app. The original pages live only under `african-cinema/client/src/pages/`.
