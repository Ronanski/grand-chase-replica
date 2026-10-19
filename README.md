# GC Companion

Unofficial, fan-made companion app for **Grand Chase Classic** (Steam). It runs as
an installable **PWA** (phone or browser) and as a **desktop app** (Electron), and
both can sync through one account.

> Not affiliated with KOG or any Grand Chase publisher. Game art belongs to its owners.

## Features

- **Daily/weekly tracker**: checklists that reset automatically at the server reset time you set, plus event countdowns.
- **Dungeon guide**: searchable by dungeon or boss, grouped by continent.
- **Character database**: roster, job advancements, and art.
- **Skill tree planner**: SP budget, prerequisites, share links, and saved builds.
- **Sync**: works offline. When you sign in, tasks, events, builds and settings sync across devices in real time.

## Getting started

```bash
npm install
npm run dev            # web app at http://localhost:5173
npm run desktop:dev    # desktop app with hot reload
npm run desktop        # desktop app from a production build
npm run desktop:dist   # build an installer into release/ (.exe/.dmg/.AppImage, for the OS you run it on)
```

## Enabling sync (Supabase, free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Under **Authentication → Email templates → Magic Link**, make sure the email includes
   `{{ .Token }}`. The app signs in with a 6-digit code instead of a link, because links
   can't open the desktop app.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key from
   **Project Settings → API**.
5. Rebuild. Sign in with the same email on every device.

Sync is local-first: each record carries an `updatedAt`, and devices merge per
record (the newest edit wins). Deletions are kept as tombstones so they also reach
other devices.

## Hosting the PWA

`.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`.
Enable it under **Settings → Pages → Source: GitHub Actions**. For sync, add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository **variables**. The anon
key is meant to be public, and row-level security protects the data.

## Game data

The game data lives in `src/data/` and is **community-maintained**. Every entry has a
`verified` flag and shows a "needs review" badge until someone checks it against
the live game.

- `characters.ts`: roster and job names.
- `dungeons.ts`: dungeons, bosses, levels, drops, tips.
- `skillTrees.ts`: skill trees for the planner. The included tree is a **sample**
  for testing and is not real game data. Add real trees using the same shape:
  `row`/`col` position, `cost` per rank, `maxRank`, and `requires`.

Character art goes in `public/art/characters/<id>.png`. Missing images fall back
to initials. Before redistributing official art, check the publisher's terms of use.
