# SocialApp — Microservices Social Media Platform

A Twitter-style social media app built as a microservices architecture term project. Users can register, post, like posts, follow each other, send direct messages, and receive notifications — all served through a single nginx gateway that routes to independent backend services.

---

## Tech Stack

| Service | Framework | Port | Purpose |
|---|---|---|---|
| **nginx** | nginx:alpine | 80 (host) | API gateway + reverse proxy |
| **auth-service** | Node.js + Express | 3001 | JWT registration & login |
| **post-service** | Node.js + Express | 3002 | Create, read, delete, like posts |
| **user-service** | Node.js + Express | 3003 | Profiles, follow/unfollow |
| **dm-service** | Node.js + Express | 3004 | Private direct messages |
| **notification-service** | Node.js + Express | 3005 | Message notifications |
| **frontend** | React + Vite | 80 (internal) | Dark-theme SPA |
| **db** | PostgreSQL 15 | 5432 (internal) | Shared database |

---

## Architecture

```
Browser
   │
   ▼
┌──────────────────────────────────────────────────┐
│               nginx  (port 80)                   │
│          API Gateway / Reverse Proxy             │
└───┬──────────┬──────────┬──────────┬─────────┬───┘
    │          │          │          │         │
/api/auth /api/posts /api/users /api/messages /api/notifications   /*
    │          │          │          │         │                    │
    ▼          ▼          ▼          ▼         ▼                    ▼
auth-svc  post-svc   user-svc   dm-svc   notif-svc           frontend
 :3001     :3002      :3003      :3004     :3005            :80 (React SPA)
    │          │          │          │         │
    └──────────┴──────────┴──────────┴─────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   PostgreSQL    │  ← shared DB
                      │     :5432       │    separate tables
                      └─────────────────┘

Inter-service calls (fire and forget):
  auth-service ──(on register)──────────────► user-service  /internal/create
  dm-service   ──(on message sent)──────────► notification-service  /internal/create
```

All services communicate over a Docker bridge network (`app-network`) using container name DNS resolution.

---

## API Endpoints

### Auth Service — `/api/auth/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | `{ username, email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email or username, password }` → `{ token, user }` |
| `GET`  | `/api/auth/verify` | 🔒 | Validates JWT → `{ valid, user }` |

### Post Service — `/api/posts/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`    | `/api/posts` | — | Public feed, 50 most recent posts with like counts |
| `GET`    | `/api/posts/user/:userId` | — | All posts by a specific user |
| `POST`   | `/api/posts` | 🔒 | `{ content }` — create a post |
| `DELETE` | `/api/posts/:id` | 🔒 | Delete own post |
| `POST`   | `/api/posts/:id/like` | 🔒 | Like a post → `{ like_count }` |
| `DELETE` | `/api/posts/:id/like` | 🔒 | Unlike a post → `{ like_count }` |

### User Service — `/api/users/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`    | `/api/users/:id` | — | Profile + `followers_count` + `following_count` |
| `PUT`    | `/api/users/:id` | 🔒 | `{ username, bio, avatar_url }` — update own profile |
| `POST`   | `/api/users/:id/follow` | 🔒 | Follow user `:id` |
| `DELETE` | `/api/users/:id/follow` | 🔒 | Unfollow user `:id` |
| `GET`    | `/api/users/:id/is-following/:targetId` | 🔒 | `{ following: true/false }` |

### DM Service — `/api/messages/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`  | `/api/messages/conversations` | 🔒 | List all conversations with last message |
| `GET`  | `/api/messages/:userId` | 🔒 | Full conversation with a specific user |
| `POST` | `/api/messages/:userId` | 🔒 | `{ content }` — send a message |

### Notification Service — `/api/notifications/...`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/notifications` | 🔒 | All unread notifications for current user |
| `PUT` | `/api/notifications/read-all` | 🔒 | Mark all notifications as read |
| `PUT` | `/api/notifications/:fromUserId/read` | 🔒 | Mark notifications from one user as read |

> 🔒 = requires `Authorization: Bearer <token>` header

### Frontend (React Router)

| Path | Notes |
|---|---|
| `/login` | Login (email or username) + Register tabs |
| `/feed` | Protected — post feed, compose box, bell icon for notifications |
| `/profile/:userId` | Protected — profile, follow button, Message button |
| `/dm/:userId` | Protected — direct message chat screen |
| `/*` | Redirects to `/feed` |

---

## Database Schema

Single PostgreSQL instance, logically separated by table:

```sql
-- auth-service
users         (id, username, email, password_hash, created_at)

-- post-service
posts         (id, user_id, username, content, created_at)
likes         (post_id, user_id, created_at)  ← PK on both cols

-- user-service
profiles      (id, user_id, username, bio, avatar_url, created_at)
follows       (follower_id, following_id, created_at)

-- dm-service
messages      (id, sender_id, sender_username, receiver_id, receiver_username, content, created_at)

-- notification-service
notifications (id, user_id, from_user_id, from_username, read, created_at)
              ← UNIQUE on (user_id, from_user_id) — one notification per sender
```

---

## How to Run

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Start everything

```bash
git clone <repo-url>
cd SocialMedia
docker-compose up --build -d
```

> First run takes ~3 minutes — Docker pulls images and builds the React app.  
> Watch logs with: `docker-compose logs -f`  
> When you see all 5 services print "running on port ...", open the app.

Open **http://localhost** in your browser.

### Stop

```bash
# Stop containers, keep database data
docker-compose down

# Stop AND wipe all data (full reset)
docker-compose down -v
```

### Useful commands

```bash
# Logs for a specific service
docker-compose logs -f dm-service

# Check status of all containers
docker-compose ps

# Restart one service without rebuilding
docker-compose restart notification-service
```

---

## Fault Isolation Demo (Shutdown Test)

This demonstrates the core microservices property: **failures are isolated — one service going down does not crash the others**. Open a second terminal while the app is running.

### Scenario 1 — Kill post-service

```bash
docker-compose stop post-service
```

| Feature | Status |
|---|---|
| Login / Register | ✅ Works |
| View profiles | ✅ Works |
| Follow / Unfollow | ✅ Works |
| Send / receive DMs | ✅ Works |
| Notifications | ✅ Works |
| Load feed | ❌ Fails |
| Create / like posts | ❌ Fails |

```bash
docker-compose start post-service   # recover
```

---

### Scenario 2 — Kill auth-service

```bash
docker-compose stop auth-service
```

| Feature | Status |
|---|---|
| Load feed (public posts) | ✅ Works |
| View profiles | ✅ Works |
| Send DMs | ✅ Works |
| Login / Register | ❌ Fails |

```bash
curl -s http://localhost/api/posts   # still returns posts
docker-compose start auth-service
```

---

### Scenario 3 — Kill user-service

```bash
docker-compose stop user-service
```

| Feature | Status |
|---|---|
| Login / Register | ✅ Works |
| Feed + posts + likes | ✅ Works |
| DMs + notifications | ✅ Works |
| View profile pages | ❌ Fails |
| Follow / Unfollow | ❌ Fails |

```bash
docker-compose start user-service
```

---

### Scenario 4 — Kill dm-service

```bash
docker-compose stop dm-service
```

| Feature | Status |
|---|---|
| Login / Feed / Profiles | ✅ Works |
| Likes / Follow | ✅ Works |
| Send / receive DMs | ❌ Fails |
| Notifications | ✅ Works (existing ones still show) |

```bash
docker-compose start dm-service
```

---

### Scenario 5 — Kill notification-service

```bash
docker-compose stop notification-service
```

| Feature | Status |
|---|---|
| Everything except notifications | ✅ Works |
| Bell icon / notification dropdown | ❌ Fails silently |

> DMs still send fine — dm-service fires notifications as fire-and-forget, so it doesn't crash when notification-service is down.

```bash
docker-compose start notification-service
```

---

### Why this matters

In a monolith, any crash takes down the entire app. Here each service has a **single responsibility** and fails independently. nginx keeps routing to healthy services, and only the features depending on the stopped service are affected. Services can also be **restarted independently** with zero downtime to the rest of the system.

---

## Project Structure

```
SocialMedia/
├── docker-compose.yml
├── db/
│   └── init.sql                    # all table definitions
├── nginx/
│   └── nginx.conf                  # routes by URL prefix to each service
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
├── dm-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/messages.js
├── notification-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/notifications.js
└── frontend/
    ├── Dockerfile                  # multi-stage: Vite build → nginx
    ├── nginx.conf                  # SPA fallback to index.html
    └── src/
        ├── App.jsx
        ├── index.css
        ├── context/AuthContext.jsx
        ├── api/index.js
        └── pages/
            ├── Login.jsx
            ├── Feed.jsx
            ├── Profile.jsx
            └── DM.jsx
```
