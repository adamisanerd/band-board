# Band Board

A shared scheduling and payout board for small bands: availability voting, gig cards, venue contacts, gear assignments, setlists, and pay splits with Venmo, Cash App, and Apple Cash links.

Built with **React + TypeScript** (via Vite) and **Supabase** (Postgres database, email sign-in, live updates).

## Status

Version 0.1 is being ported from the original single-file board in [`legacy/`](legacy/band-board.html).

| Feature | Status |
| --- | --- |
| Email sign-in (6-digit code or link) | Done |
| Create a band, invite link, join by picking your name | Done |
| Dates: propose, vote In/Maybe/Out, best date, text the band | Done |
| Band: lineup, pay info, preferred payment method | Done |
| Database schema and security rules for every feature | Done |
| Gigs: passes, maps, contacts, gear, pay split, request your share | Next |
| Setlists | To do |
| Venues | To do |
| Catch up from the group chat (Claude API) | To do |
| Installable on phones (PWA) | To do |

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (it runs the local database).

```sh
npm install
npm run db:start        # starts Supabase locally in Docker; first run downloads a few GB
```

`db:start` prints an **API URL** and an **anon key** (newer versions call it the *publishable key*). Copy `.env.example` to `.env.local` and paste them in. Then:

```sh
npm run dev             # http://localhost:5173
```

Sign in with any email address. Locally no email is really sent; open **http://127.0.0.1:54324** to see the sign-in email and its code.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app with hot reload |
| `npm run build` | Type-checks and builds for production into `dist/` |
| `npm run lint` | Checks the code for common mistakes |
| `npm run test:db` | Runs the database security tests (no Docker needed) |
| `npm run db:start` / `db:stop` | Starts or stops the local Supabase |
| `npm run db:reset` | Wipes the local database and reruns the migrations |
| `npm run db:types` | Regenerates `src/lib/database.types.ts` after a schema change |

## How it's put together

```
src/
  main.tsx                 Entry point: renders <App /> into the page
  App.tsx                  Sign-in gate, band picker, header and tabs
  index.css                All styles (ported from the original board)
  lib/
    supabase.ts            The shared Supabase client
    database.types.ts      TypeScript types for every table and function
    format.ts, pay.ts, sms.ts   Small helpers: dates, money, payment links, group texts
  hooks/
    useSession.ts          Who's signed in
    useBandRows.ts         Loads a table for the current band and keeps it live
  features/
    auth/SignIn.tsx        Email code sign-in
    onboarding/            Create a band, join from an invite link
    dates/DatesTab.tsx     The Dates tab
    band/BandTab.tsx       The Band tab
supabase/
  migrations/              The database schema, as SQL
  templates/               The sign-in email
  config.toml              Local Supabase settings
tests/db.test.mjs          Checks the security rules (who can see and change what)
legacy/band-board.html     The original single-file board, for reference while porting
```

**Where to start reading:** `App.tsx`, then `features/dates/DatesTab.tsx`. The Dates tab uses every pattern in the app: typed database rows, `useBandRows` for live data, `useState` for form fields, and writes through `supabase.from(...)`.

### Security

Supabase lets the browser talk to the database directly, so the database enforces who can do what. Row-level security policies in the migration mean:

- You only see bands you're on, and only their dates, gigs, and so on.
- You can only vote as yourself.
- Signed-out visitors see nothing.

Creating and joining bands go through database functions (`create_band`, `join_band`) so each happens in one step. `npm run test:db` checks all of this.

## Deploying

1. Create a free project at [supabase.com](https://supabase.com) and link it: `npx supabase link`, then `npx supabase db push`.
2. In the Supabase dashboard, set **Authentication > URL Configuration** to your site's address, and paste `supabase/templates/magic_link.html` into the Magic Link and Confirm Signup email templates.
3. Host the built app on any static host (Vercel, Netlify, Cloudflare Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's settings.
