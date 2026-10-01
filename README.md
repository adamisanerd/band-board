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

## Running the app on your computer

The app has two parts that run side by side:

- **Supabase**, the database and sign-in service. It runs locally inside Docker.
- **The web app**, served by Vite at http://localhost:5173. It reloads the moment you save a file.

### 1. Install the tools (once)

- **Node.js 20 or newer:** download it from [nodejs.org](https://nodejs.org). Check with `node --version`.
- **Docker Desktop:** download it from [docker.com](https://www.docker.com/products/docker-desktop/), open it, and finish its setup.
  - **On Windows,** Docker needs WSL (the Windows Subsystem for Linux). If Docker Desktop doesn't set it up for you, open PowerShell as administrator, run `wsl --install`, and restart.
  - Docker is ready when `docker info` prints details instead of an error.

### 2. Get the code and install packages (once)

```sh
git clone https://github.com/adamisanerd/band-board.git
cd band-board
npm install
```

### 3. Start the database

Make sure Docker Desktop is open, then:

```sh
npm run db:start
```

The first run downloads Supabase's images, a few GB, so give it a while. Later starts take seconds. When it finishes, it prints a list of addresses and keys. You need two of them:

- **API URL**, usually `http://127.0.0.1:54321`
- **anon key**, which newer versions label **Publishable key**

Run `npx supabase status` to see them again later.

### 4. Connect the app to the database (once)

Copy `.env.example` to a new file named `.env.local`, then paste in the two values:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=paste-the-key-here
```

`.env.local` is git-ignored, so it never gets uploaded.

### 5. Start the app

```sh
npm run dev
```

Open **http://localhost:5173**.

### 6. Sign in

1. Enter any email address, real or not, and tap **Email me a code**.
2. Local Supabase doesn't send real email; it catches every message instead. Open **http://127.0.0.1:54324** to see the email.
3. Type the 6-digit code into the app.

### 7. Stop everything

Press `Ctrl+C` in the terminal running `npm run dev`, then run `npm run db:stop`. Your test data is kept for next time.

## Testing

### Automated checks

Run these before you commit:

```sh
npm run test:db    # database security tests: 27 checks, no Docker needed
npm run lint       # catches common mistakes
npm run build      # type-checks every file, then builds the production version
```

All three should finish without errors. `test:db` ends with `27 passed, 0 failed`.

### Trying it by hand

Live updates need two people, so test with two browser windows. A private/incognito window counts as a separate person.

1. **Create a band:** sign in as `you@test.com`, create a band, and pick yourself from the lineup.
2. **Propose a date:** on the Dates tab, propose a date. You're automatically marked In.
3. **Invite someone:** on the Band tab, tap **Copy** next to the invite link.
4. **Join as a second person:** open a private window, paste the invite link, and sign in as `friend@test.com`. Their code is also at http://127.0.0.1:54324. Tap a name to join.
5. **Watch it update live:** vote on the date in one window. The other window updates within a second or two, without refreshing.
6. **Pay info:** add Venmo or Cash App details on the Band tab, choose a preferred method, and save.

To start over with an empty database: `npm run db:reset`.

To look at the data directly, Supabase Studio is at **http://127.0.0.1:54323**. It's a web dashboard where you can browse tables and run SQL.

### Testing on your phone

Your phone and computer must be on the same Wi-Fi.

1. Find your computer's local IP address, e.g. `192.168.1.20`. On Windows, run `ipconfig` and look for the IPv4 address.
2. In `.env.local`, change `127.0.0.1` to that address: `VITE_SUPABASE_URL=http://192.168.1.20:54321`.
3. Run `npm run dev -- --host`, then on your phone open `http://192.168.1.20:5173`.
4. Sign in with the 6-digit code. The emailed link won't work from the phone during local testing, but the code does.

If the phone can't connect, Windows Firewall may be blocking it. Allow Node.js on private networks when Windows asks.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `db:start` says Docker isn't running | Open Docker Desktop and wait until it says it's running. Check with `docker info`. |
| The page says `Missing VITE_SUPABASE_URL` | `.env.local` is missing or misnamed (step 4). Restart `npm run dev` after creating it. |
| No sign-in email | Local emails only appear at http://127.0.0.1:54324, never in a real inbox. |
| "That code didn't work" | Use the newest email's code, and type the same email address you entered. |
| Invite link says it isn't valid | Copy it again from the Band tab. `db:reset` deletes all bands, which invalidates old links. |
| A port is already in use | Another copy is still running. Run `npm run db:stop`, close other terminals, and try again. |
| Changes to `supabase/migrations` don't show up | Run `npm run db:reset` to rebuild the database, then `npm run db:types`. |

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
