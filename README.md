# SocialApp — Microservices Social Media Platform

A Twitter-style social media app built as a microservices architecture term project. Users can register, post, follow each other, and view profiles — all served through a single nginx gateway that routes to independent backend services.

---

## Tech Stack

| Service | Framework | Port | Purpose |
|---|---|---|---|
| **nginx** | nginx:alpine | 80 (host) | API gateway + reverse proxy |
| **auth-service** | Node.js + Express | 3001 | JWT registration & login |
| **post-service** | Node.js + Express | 3002 | Create, read, delete posts |
| **user-service** | Node.js + Express | 3003 | Profiles, follow/unfollow |
| **frontend** | React + Vite | 80 (internal) | Twitter-style SPA |
| **db** | PostgreSQL 15 | 5432 (internal) | Shared database |

---

## Architecture

```
Browser
   │
   ▼
┌─────────────────────────────────────┐
│         nginx  (port 80)            │  ← single entry point
│         API Gateway / Reverse Proxy │
└──────────────┬──────────────────────┘
               │  routes by URL prefix
       ┌───────┼───────────────┐
       │       │               │
       ▼       ▼               ▼
  /api/auth  /api/posts    /api/users     /*
       │       │               │           │
       ▼       ▼               ▼           ▼
  auth-svc  post-svc      user-svc     frontend
  :3001     :3002         :3003        :80 (React SPA)
       │       │               │
       └───────┴───────────────┘
                     │
                     ▼
             ┌───────────────┐
             │  PostgreSQL   │  ← shared DB, separate tables
             │    :5432      │    per service domain
             └───────────────┘

Inter-service call:
  auth-service ──(POST on register)──► user-service /internal/create
```

All services communicate over a Docker bridge network (`app-network`) using container name DNS resolution.

---

## API Endpoints

### Auth Service — `POST /api/auth/...`

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | `{ username, email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `GET`  | `/api/auth/verify` | Bearer token | Validates JWT → `{ valid, user }` |

### Post Service — `/api/posts/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`    | `/api/posts` | — | Public feed, 50 most recent posts |
| `GET`    | `/api/posts/user/:userId` | — | All posts by a specific user |
| `POST`   | `/api/posts` | 🔒 | `{ content }` — create a post |
| `DELETE` | `/api/posts/:id` | 🔒 | Delete own post only |

### User Service — `/api/users/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`    | `/api/users/:id` | — | Profile + `followers_count` + `following_count` |
| `PUT`    | `/api/users/:id` | 🔒 | `{ username, bio, avatar_url }` — update own profile |
| `POST`   | `/api/users/:id/follow` | 🔒 | Follow user `:id` |
| `DELETE` | `/api/users/:id/follow` | 🔒 | Unfollow user `:id` |
| `GET`    | `/api/users/:id/is-following/:targetId` | 🔒 | `{ following: true/false }` |

> 🔒 = requires `Authorization: Bearer <token>` header

### Frontend (React Router)

| Path | Notes |
|---|---|
| `/login` | Login + Register tabs |
| `/feed` | Protected — post feed with compose box |
| `/profile/:userId` | Protected — user profile, follow button |
| `/*` | Redirects to `/feed` |

---

## Database Schema

Single PostgreSQL instance, logically separated by table:

```sql
-- owned by auth-service
users     (id, username, email, password_hash, created_at)

-- owned by post-service
posts     (id, user_id, username, content, created_at)

-- owned by user-service
profiles  (id, user_id, username, bio, avatar_url, created_at)
follows   (follower_id, following_id, created_at)
```

---

## How to Run

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Start everything

```bash
git clone <repo-url>
cd SocialMedia
docker-compose up --build
```

> First run takes ~2 minutes — Docker pulls images and builds the React app.  
> Subsequent runs (without `--build`) start in seconds.

Open **http://localhost** in your browser.

### Stop

```bash
# Stop containers but keep data
Ctrl+C
docker-compose down

# Stop AND wipe the database volume (full reset)
docker-compose down -v
```

### Useful commands

```bash
# View logs for a specific service
docker-compose logs -f auth-service

# Check all running containers
docker-compose ps

# Restart a single service
docker-compose restart post-service
```

---

## Fault Isolation Demo (Shutdown Test)

This demonstrates the core microservices property: **each service is independently deployable and failures are isolated**. Run these in a second terminal while the app is up.

### Scenario 1 — Kill the post service

```bash
docker-compose stop post-service
```

| Feature | Status |
|---|---|
| Login / Register | ✅ Still works |
| View profile pages | ✅ Still works |
| Follow / Unfollow | ✅ Still works |
| Load feed | ❌ Fails (post-service down) |
| Create a post | ❌ Fails (post-service down) |

```bash
# Verify auth-service is unaffected
curl -s http://localhost/api/auth/verify

# Bring post-service back
docker-compose start post-service
```

---

### Scenario 2 — Kill the auth service

```bash
docker-compose stop auth-service
```

| Feature | Status |
|---|---|
| Load public feed | ✅ Still works (feed is public) |
| View profile pages | ✅ Still works |
| Login / Register | ❌ Fails (auth-service down) |

```bash
# Feed still loads (no auth needed)
curl -s http://localhost/api/posts | head -c 200

# Bring it back
docker-compose start auth-service
```

---

### Scenario 3 — Kill the user service

```bash
docker-compose stop user-service
```

| Feature | Status |
|---|---|
| Login / Register | ✅ Still works |
| Load feed | ✅ Still works |
| Create / Delete posts | ✅ Still works |
| View profile pages | ❌ Fails (user-service down) |
| Follow / Unfollow | ❌ Fails (user-service down) |

```bash
docker-compose start user-service
```

---

### Why this matters

In a monolith, any crash takes down the entire app. In this microservices architecture, each service has a **single responsibility** and fails independently. nginx continues to route requests to healthy services, and only the features that depend on the stopped service are affected.

---

## Project Structure

```
SocialMedia/
├── docker-compose.yml         # orchestrates all services
├── db/
│   └── init.sql               # table definitions, runs on first boot
├── nginx/
│   └── nginx.conf             # routing rules
├── auth-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── routes/auth.js
├── post-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/posts.js
├── user-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/users.js
└── frontend/
    ├── Dockerfile             # multi-stage: build → nginx
    ├── nginx.conf             # SPA fallback to index.html
    └── src/
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── api/index.js
        └── pages/
            ├── Login.jsx
            ├── Feed.jsx
            └── Profile.jsx
```
