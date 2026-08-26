# DR. HOSSAM LOTFY LAW FIRM — Digital Operating System

منصة تشغيل داخلية متكاملة لمكتب المحاماة — "Facebook-style" law firm operations platform:
feed من الجلسات والمهام، تعليقات، ملفات محامين بصفحات اجتماعية، محاكم وأماكن بصفحات ديناميكية
تُبنى تلقائيًا من قاعدة البيانات، لوحة تحكم إدارية، بحث، تقويم، إشعارات وسجل نشاط.

Full-stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL + Prisma 7** —
Arabic RTL by default, premium navy/gold legal aesthetic (Cairo / Inter fonts).

## Quick start

```bash
cp .env.example .env      # set ADMIN_PASSWORD (and optional NEXT_PUBLIC_BASE_URL)
npm install
npm run db:setup          # initializes embedded PostgreSQL + applies schema (or: npm run db:migrate)
npm run db:seed           # realistic demo data (fictional cases)
npm run dev               # http://localhost:3000
# production
npm run build && npm start
```

> The embedded PostgreSQL data dir is `.pgdata/` (gitignored). Uploaded photos live in
> `storage/uploads/` (gitignored) and are served only through `/uploads/[file]`.

## Authentication

| Role    | How                                                        |
| ------- | ---------------------------------------------------------- |
| Admin   | Key icon 🔑 in the navbar → `/admin/login` — password comes from `ADMIN_PASSWORD` (env, never in frontend code) |
| Lawyer  | One-time magic link: admin → Admin → المحامون → "رابط الدخول" → share `/access/<token>` (single use) |
| Guest   | No login — can browse everything and comment (with a display name) |

Sessions are HMAC-signed, httpOnly, `SameSite=Lax` (+`Secure` in production) cookies.
**All authorization is enforced server-side in every route** — frontend checks are cosmetic only.

## Key behaviors

- **Multi-lawyer tasks** — admin assigns a task/session to up to **20 lawyers** in one action;
  each lawyer receives a **separate assignment record** (one task, N assignments).
- **Completion** — "✓ تم التنفيذ" is visible only to the assigned lawyer(s); the task flips to
  `COMPLETED` only when **every** assignment is completed. A lawyer can never complete someone
  else's task (403).
- **Posts** — lawyers create/edit only their own posts; other lawyers get 403.
- **Sidebar** — 5 sections (غداً / خلال 3 أيام / خلال أسبوعين / خلال شهر / كل الجلسات), nearest
  first, 4-level urgency colors; on mobile it becomes a "الجلسات القادمة" drawer (never removed).
- **Warning banner** — automatic when any open session falls within the next 2 weeks.
- **Dr. Hossam Lotfy** is always pinned first in lawyer lists (`isPrincipal`).
- **Search** — one box across المحاكم / الأماكن / المحامين / الجلسات with type pre-selection.
- **Dynamic pages** — every location and lawyer gets a full page generated from the DB
  (`/locations/[slug]`, `/lawyers/[slug]`); court pages list their upcoming sessions.
- **Notifications & activity** — per-user notification bell + full admin activity log.
- **Calendar** — month / week / day views of all sessions.

## API (all under `/api`)

```
auth/login  auth/logout  auth/me
tasks (GET list / POST create)          tasks/[id] (GET / PATCH / DELETE)
tasks/[id]/complete                     tasks/[id]/comments
comments/[id] (PATCH / DELETE)
lawyers (GET / POST)                    lawyers/[id] (PATCH / DELETE)
lawyers/[id]/access-token               locations (GET / POST)  locations/[id]
cases  notifications  activity  search  upload  admin/stats
```

## Security notes

- Admin password: env-only (`ADMIN_PASSWORD`); wrong attempts get 401 with a generic Arabic error.
- Access tokens: random 192-bit, single-use (`consumedAt`), 1-year expiry, revocable via re-issue.
- Uploads: PNG/JPG/WebP only, ≤5 MB, stored outside the repo, served with path-traversal guards.
- SQL only through Prisma parameterized queries.
