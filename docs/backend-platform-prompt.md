# Backend Platform — Build Prompt

You are building a **private backend platform** for the Daleel project. This is a completely separate system from the public Vercel website. It is the operational brain of the entire project.

---

## What this system does

This platform has three jobs:

1. **Collect** — Ingest data from Telegram channels
2. **Manage** — Store, process, curate, and visualize that data through an internal admin dashboard
3. **Publish** — Expose only approved, normalized data (`N`) through a public API that the Vercel website consumes

The full pipeline is:

```
Telegram → Ingestion Service → Database → Admin Dashboard → Public API → (Vercel website reads from here)
```

The Vercel website is a separate repo. It is NOT part of this project. This platform only needs to serve the public API that the Vercel site will call.

---

## The concept of `N`

`N` is the normalized, website-ready version of raw Telegram content. Telegram data is messy (raw text, media, metadata, duplicates, inconsistent formatting). `N` is the cleaned, structured object that the public website renders.

### `N` schema

```typescript
interface N {
  id: string                  // UUID
  title: string               // Cleaned title (extracted or written manually)
  summary: string             // Short preview text
  body: string                // Full content (supports markdown)
  imageUrl?: string           // Primary image URL (if any)
  sourceUrl?: string          // Link to original Telegram post
  sourceName: string          // Channel or source name
  category: string            // e.g., "news", "announcement", "analysis", "leak", "statement"
  tags: string[]              // Freeform tags for filtering
  status: 'draft' | 'review' | 'published' | 'hidden'  // Publish state
  language: 'ar' | 'en' | 'fr'  // Primary language of the content
  telegramMessageId?: number  // Original Telegram message ID (for dedup)
  telegramChannelId?: string  // Original Telegram channel/chat ID
  rawTelegramData?: object    // Full raw payload from Telegram (stored but not exposed publicly)
  createdAt: Date             // When the item was first ingested
  updatedAt: Date             // Last modification
  publishedAt?: Date          // When it was marked published
  fetchedAt: Date             // When it was fetched from Telegram
}
```

The public API should NEVER expose `rawTelegramData`. That field is internal only.

---

## Architecture components

### 1. Telegram Ingestion Service

A background worker that periodically fetches new posts from configured Telegram channels.

**Responsibilities:**
- Connect to Telegram (use GramJS/Telethon or Telegram Bot API — your choice)
- Fetch new messages from configured channels
- Detect and skip duplicates (by `telegramMessageId` + `telegramChannelId`)
- Store raw Telegram data in the database
- Create initial `N` objects with status `draft` (auto-extract title, body, media URLs)
- Log every sync attempt (success/failure, items fetched, errors)

**Configuration needed:**
- List of Telegram channels to watch
- Polling interval (e.g., every 5 minutes)
- Telegram API credentials (API ID, API hash, or bot token)

### 2. Database

PostgreSQL with the following tables (at minimum):

#### `telegram_raw`
Stores the exact raw data from Telegram as-is.
- `id` (UUID, PK)
- `telegram_message_id` (integer)
- `telegram_channel_id` (string)
- `raw_payload` (JSONB — the full Telegram message object)
- `media_urls` (JSONB — array of extracted media URLs)
- `fetched_at` (timestamp)
- `created_at` (timestamp)
- UNIQUE constraint on (`telegram_message_id`, `telegram_channel_id`)

#### `items` (this is the `N` table)
- `id` (UUID, PK)
- `telegram_raw_id` (FK → telegram_raw, nullable — manual entries won't have this)
- `title` (text)
- `summary` (text)
- `body` (text)
- `image_url` (text, nullable)
- `source_url` (text, nullable)
- `source_name` (text)
- `category` (text)
- `tags` (JSONB — string array)
- `status` (enum: draft, review, published, hidden)
- `language` (enum: ar, en, fr)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `published_at` (timestamp, nullable)
- `fetched_at` (timestamp)

#### `sync_jobs`
- `id` (UUID, PK)
- `channel_id` (text)
- `started_at` (timestamp)
- `ended_at` (timestamp, nullable)
- `status` (enum: running, success, failed)
- `items_fetched` (integer, default 0)
- `items_created` (integer, default 0)
- `duplicates_skipped` (integer, default 0)
- `error_message` (text, nullable)

#### `channels`
- `id` (UUID, PK)
- `telegram_id` (text, unique)
- `name` (text)
- `is_active` (boolean, default true)
- `last_synced_at` (timestamp, nullable)
- `created_at` (timestamp)

#### `users` (for admin dashboard auth)
- `id` (UUID, PK)
- `email` (text, unique)
- `password_hash` (text)
- `role` (enum: admin, editor)
- `created_at` (timestamp)

### 3. Internal Admin Dashboard

A web application for the project owner to manage everything. This is NOT public-facing.

**Tech:** Use any modern framework (Next.js, Nuxt, SvelteKit, etc.) with a clean UI.

#### Pages needed:

**a) Overview / Home**
- System health at a glance
- Is the ingestion worker running?
- Last successful sync time
- Items fetched today
- Items published vs draft vs hidden
- Recent errors (if any)
- Pending items awaiting review

**b) Items Manager (the `N` manager)**
This is the most important page. It's a mini CMS.
- Table/list view of all `N` items with search, filter by status/category/channel/date
- Click to edit: title, summary, body, category, tags, image URL
- Bulk actions: publish, hide, delete
- Status workflow: draft → review → published (or → hidden)
- Preview: show how the item would appear on the public site
- Create new item manually (not from Telegram)

**c) Raw Telegram Data**
- Table of all raw Telegram messages
- Show: channel, message ID, raw text preview, media count, fetch time
- Link to the `N` item created from it (if any)
- Useful for debugging and auditing

**d) Channels**
- List of configured Telegram channels
- Add/remove/enable/disable channels
- Show last sync time per channel
- Trigger manual sync for a specific channel

**e) Sync Logs**
- Table of all sync jobs
- Show: channel, start time, end time, status, items fetched/created, duplicates skipped, errors
- Filter by status, channel, date range

**f) Analytics**
- Posts per day (chart)
- Posts by channel (chart)
- Published vs draft vs hidden (chart)
- Categories breakdown (chart)
- Tags cloud or frequency

### 4. Public API

REST API endpoints that the Vercel website will call. These return ONLY published `N` items.

**Endpoints:**

```
GET /api/n/latest?limit=20&offset=0
  → Returns latest published items, paginated

GET /api/n/list?page=1&pageSize=20&category=news&tag=election&language=ar&q=searchterm
  → Returns filtered, paginated list of published items

GET /api/n/:id
  → Returns a single published item by ID

GET /api/n/categories
  → Returns list of categories with item counts

GET /api/n/tags
  → Returns list of tags with item counts
```

**Response format** (match the Vercel app's existing pattern):

```json
{
  "success": true,
  "data": [ ... ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

For single items:
```json
{
  "success": true,
  "data": { ... }
}
```

**IMPORTANT:** The public API must:
- Never return items with status other than `published`
- Never return `rawTelegramData`
- Support CORS for the Vercel domain
- Be rate-limited (100 requests/minute per IP)

---

## Security requirements

- Admin dashboard must be behind authentication (session-based or JWT)
- Public API is read-only, no auth needed, but rate-limited
- Telegram API credentials stored in environment variables, never in code
- Raw Telegram data never exposed through the public API
- CSRF protection on admin actions

---

## Environment variables needed

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/daleel_backend

# Telegram
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_BOT_TOKEN=your_bot_token  # if using bot API
TELEGRAM_SESSION=session_string     # if using user client

# Admin Auth
ADMIN_JWT_SECRET=random_secret
# or session-based auth secret

# Public API
CORS_ORIGIN=https://your-vercel-domain.vercel.app
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Ingestion
SYNC_INTERVAL_MS=300000  # 5 minutes
```

---

## What to build first (priority order)

1. **Database schema + migrations** — Set up PostgreSQL with all tables
2. **Telegram ingestion service** — Get data flowing from Telegram into the DB
3. **Public API** — Serve published `N` items (so the Vercel site can start consuming)
4. **Admin dashboard** — Build the management UI
5. **Analytics** — Add charts and visualization

---

## What this system is NOT

- This is NOT the public website. The public website is a separate Next.js app on Vercel.
- This system does NOT serve HTML to end users. It serves JSON through the public API.
- The admin dashboard is for the project owner only, not for public visitors.
- This system does NOT need to know about candidates, districts, electoral lists, or any of the existing Daleel election data models. Those belong to the Vercel app. This system only deals with Telegram content → `N`.

---

## Hosting

This platform needs to run on a server that supports:
- Long-running background processes (the ingestion worker)
- PostgreSQL database
- Web server for the admin dashboard and API

Good options: VPS (DigitalOcean, Hetzner, Linode), Railway, Fly.io, or a home server.
It should NOT be deployed on Vercel (Vercel doesn't support long-running workers).
