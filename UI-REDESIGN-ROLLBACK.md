# UI Redesign — Rollback & Baseline Record

## Status

- **PROTECTED BASELINE (original working version):** `15cb51bcb569049eeab5e736dae1f85d21d7afb5`
  - tag: `baseline-ui-original`
- **CHECKPOINT / RESTORE POINT (requested pre-redesign commit, identical tree):** `3d24561`
  - tag: `pre-redesign-checkpoint`
  - message: `chore: checkpoint before modern law firm UI redesign`
  - `git diff 15cb51b pre-redesign-checkpoint` → **empty (trees identical)**
- **Redesign commits:** everything after `pre-redesign-checkpoint` on branch `arena/01a0442d-dr-hossam-lotfy`

> Note: this workspace session is pinned to branch `arena/01a0442d-dr-hossam-lotfy` (Arena
> requirement), so the redesign lives on that branch **after** the checkpoint commit instead of a
> separately named branch. The protection is equivalent: the checkpoint is a permanent, tagged,
> immutable restore point in history, and the redesign is strictly additive commits on top.

## Baseline record (captured BEFORE any redesign change)

- **Branch:** `arena/01a0442d-dr-hossam-lotfy`
- **HEAD at capture:** `15cb51b` (working tree clean — no uncommitted changes)
- **Tags created:** `baseline-ui-original` → `15cb51b`, `pre-redesign-checkpoint` → checkpoint commit
- **Other untouched refs:** `main`, `origin/main` (`1a9a2d8`) — never modified by the redesign.
- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Prisma 7 + PostgreSQL
- **Routes / pages (src/app):**
  - `/` (feed + command center + sessions sidebar)
  - `/admin`, `/admin/login`, `/admin/lawyer-guide`
  - `/calendar`, `/search`, `/notifications`
  - `/lawyers`, `/lawyers/[slug]`, `/locations`, `/locations/[slug]`
  - `/lawyer-guide`, `/lawyer-guide/[slug]`
  - `/sessions`, `/sessions/[id]`, `/access/[token]` (magic-link route)
  - `/uploads/[file]`, `/lawyers-access-error`
  - `error.tsx`, `global-error.tsx`, `not-found.tsx`, `icon.svg`, `robots.ts`, `sitemap.ts`
  - `/api/*` — auth, tasks, comments, lawyers, locations, search, notifications, activity,
    lawyer-guide, upload, admin/stats, health, access tokens
- **Major components (src/components):** navbar, footer, warning-bar, mobile-sessions,
  session-sidebar, session-card, session-edit-form, session-edit-trigger, post-card, composer,
  comment-section, feed-more, activity-timeline, toasts, ui (Button/Card/Badge/Modal/Input/
  Select/Textarea/Tabs/Collapsible/Avatar/EmptyState), urgency, admin/* (shell, forms, tabs),
  select-with-add, task-constants
- **Original design language:** classic heritage law firm — Cormorant Garamond serif wordmark,
  navy `#101C2C`, muted gold `#8A6A3A`, ivory paper `#F7F5F0`, burgundy `#641F2B` accents,
  hairline borders `#EEEBE4`/`#E0D8CC`, sharp corners, letterspaced uppercase labels.

## Redesign strategy (as required: presentation-only)

- **No functional logic, routes, data fetching, auth, or API changes.**
- Same component files, same props/handlers/conditions — only `className`/style presentation,
  theme tokens (`@theme` in `globals.css`), and Tailwind classes were touched.
- New design language: "modern law firm" — deeper ink-navy, champagne gold, porcelain neutrals,
  glass sticky navbar, soft layered shadows, larger radii, Inter/Cairo typography (serif kept
  only for the firm wordmark).

## ONE-COMMAND ROLLBACK

Run from the repo root to return to the EXACT pre-redesign UI:

```bash
git reset --hard pre-redesign-checkpoint
```

(Non-destructive alternative that keeps redesign history but restores every original file:

```bash
git revert --no-commit pre-redesign-checkpoint..HEAD && git commit -m "revert: restore original UI"
```

)

Trigger phrases honored: “ارجع للشكل القديم”, “الديزاين الجديد مش عاجبني”, “Rollback”,
“Restore the old design”.

## Safety rules observed

- No `git reset --hard`, rebase, squash, or force operations were performed on the baseline.
- The checkpoint commit/tag is never deleted or rewritten.
- `main` and `origin/main` untouched.
