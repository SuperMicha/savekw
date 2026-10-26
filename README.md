# SaveKW

**Self-hosted automation for homes with solar panels, a hybrid inverter and a battery.**

SaveKW watches the weather forecast and your inverter's live telemetry, then decides *when* to
run your heavy appliances and *when* to charge or discharge the battery — so that as much energy
as possible comes from the sun or from the cheap night tariff instead of the expensive day one.

It was built for Ukrainian households running hybrid solar + battery setups, where a two-zone
tariff and frequent grid outages make scheduling genuinely worth money.

> ### ⚠️ Project status: archived, unmaintained
>
> SaveKW was developed as a commercial SaaS. It did not find a market, so the hosted service has
> been shut down and paying for the server no longer makes sense. The code is published as-is in
> the hope that it is useful to someone.
>
> **There is no hosted instance, no support, and no roadmap.** You are welcome to fork it, run it,
> and do whatever you like with it. Nothing here is guaranteed to work against the current versions
> of the third-party APIs it integrates with — those are unofficial and change without notice.
>
> Parts of the UI and the inline documentation are in Ukrainian.

---

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Built-in algorithms](#built-in-algorithms)
- [Integrations](#integrations)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Running in production](#running-in-production)
- [Project layout](#project-layout)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [License](#license)

---

## What it does

- **Reads your solar setup.** Pulls live and historical telemetry (PV output, battery state of
  charge, grid voltage, load) from a supported hybrid inverter.
- **Reads the weather.** Fetches an hourly forecast — including cloud density — for the
  coordinates you pin on a map, and estimates how many usable "solar hours" tomorrow will have.
- **Decides when to run things.** A set of per-appliance algorithms combines the forecast, the
  tariff windows you configured and the current battery level, and turns smart sockets on or off
  at the right time.
- **Controls the battery.** Switches the inverter between charging from the grid during the night
  tariff and discharging during the day, or leaves it alone if tomorrow looks sunny enough to
  refill it for free.
- **Watches the grid.** *VoltageGuard* monitors mains voltage and sends a Telegram message when
  the grid drops out or comes back.
- **Explains itself.** Every algorithm run writes a structured log entry, so you can open the UI
  and see exactly why the boiler was switched on at 02:40 and not at 13:00.

## How it works

```
                 ┌───────────────────┐
  WeatherAPI ───►│                   │
                 │   Next.js server  │──► Telegram  (alerts)
  Inverter   ───►│                   │
  (DessMonitor / │   node-cron       │──► Smart sockets (on/off)
   SmartESS)     │   scheduler       │
                 │                   │──► Inverter   (charge / discharge)
  Smart plugs ──►│                   │
  (Tuya / eWeLink)└────────┬─────────┘
                           │
                     PostgreSQL
                  (settings, telemetry,
                   algorithm logs)
```

A `node-cron` scheduler is started from `instrumentation.ts` when the Next.js server boots. It
runs each algorithm on its own interval (most every 9–17 minutes, weather every 30 minutes,
mains check every minute) for every user who has that algorithm enabled. Intervals are editable
at runtime from the admin panel.

All user-facing data access goes through a tRPC API; the browser never talks to the third-party
APIs directly.

## Built-in algorithms

| # | Name | What it does |
|---|------|--------------|
| 1 | Battery, weather-aware | Discharge the battery during the day, recharge on the night tariff — but only as much as tomorrow's forecast says you'll need |
| 2 | Battery, schedule only | Same, on fixed tariff windows, ignoring the forecast |
| 3 | Boiler, night only | Heat water exclusively on the night tariff |
| 4 | Washing machine, night | Start the washer inside the night tariff window |
| 5 | Dishwasher, night | Start the dishwasher inside the night tariff window |
| 6 | Boiler, day + fallback | Heat during a chosen daytime window; fall back to the night tariff when tomorrow has no usable solar hours |
| 7 | Washing machine, day + night | Prefer the solar window, fall back to night |
| 8 | Dishwasher, day + night | Prefer the solar window, fall back to night |
| 9 | EV charging | Charge the electric car on the night tariff |
| — | `check_mains` / VoltageGuard | Monitor grid voltage, alert over Telegram on outage and restore |
| — | `weather_check` | Refresh the forecast and recompute expected solar hours |

Each algorithm is a standalone class in `src/server/algorithms/`. Adding your own is mostly a
matter of dropping a file there and registering it in `src/server/scheduler.ts`.

## Integrations

All of these are **unofficial, reverse-engineered or community** APIs. None of them are endorsed
by the vendors, and all of them can break at any time.

| Service | Used for | Notes |
|---------|----------|-------|
| [WeatherAPI.com](https://www.weatherapi.com/) | Hourly forecast, cloud cover | Free tier is enough; needs an API token |
| DessMonitor / SmartESS | Inverter telemetry and control | Used by many Voltronic-based hybrid inverters; needs a company key |
| Tuya / Smart Life | Smart socket control | Via the Home Assistant-compatible `px1.tuyaeu.com` endpoint |
| eWeLink (Sonoff) | Smart socket control | Dependency is present; the integration itself ships as a stub |
| Telegram Bot API | Outage and status alerts | Bot token stored in system settings; chat id resolved per user |
| Supabase Auth | Sign-up, sign-in, email confirmation, password reset | Only Auth — application data lives in your own PostgreSQL |
| hCaptcha / Turnstile | Bot protection on auth forms | Optional |

## Tech stack

Bootstrapped from the [T3 Stack](https://create.t3.gg/).

- [Next.js 15](https://nextjs.org) (Pages Router) + React 19
- [TypeScript](https://www.typescriptlang.org/)
- [tRPC 11](https://trpc.io) for the API layer
- [Prisma 6](https://prisma.io) + PostgreSQL
- [Supabase](https://supabase.com) for authentication only
- [Tailwind CSS 4](https://tailwindcss.com)
- [Recharts](https://recharts.org) for graphs, [Leaflet](https://leafletjs.com) for the location picker
- `node-cron` for scheduling, AES-256-GCM for encrypting stored third-party credentials

---

## Getting started

### Prerequisites

- Node.js 20 or newer, and npm 10
- PostgreSQL 14 or newer (local, Docker, or hosted)
- A [Supabase](https://supabase.com) project — the free tier is fine. Only its Auth service is used
- Optionally: a [WeatherAPI.com](https://www.weatherapi.com/) token, a Telegram bot, and whatever
  inverter or smart sockets you actually own

### 1. Clone and install

```bash
git clone https://github.com/<your-fork>/savekw2.git
cd savekw2
npm install
```

`postinstall` runs `prisma generate` for you.

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in the values — see [Environment variables](#environment-variables) below. At minimum you
need `DATABASE_URL`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Generate the encryption key with:

```bash
openssl rand -base64 32
```

> Keep this key. It encrypts the inverter and smart-plug credentials stored in your database.
> If you lose or change it, every stored credential becomes unreadable and has to be re-entered.

### 3. Start a database

Either point `DATABASE_URL` at an existing PostgreSQL instance, or bring one up with Docker:

```bash
docker compose up -d        # PostgreSQL on localhost:5432
```

A helper script for Linux/macOS is also included:

```bash
./start-database.sh
```

### 4. Apply the schema

```bash
npm run db:migrate          # prisma migrate deploy
```

For a throwaway dev database you can use `npm run db:push` instead.

### 5. Run it

```bash
npm run dev
```

The app is at <http://localhost:3000>. The scheduler starts with the server — watch the console
for `✅ Scheduler initialized successfully`.

### 6. First login and admin access

Sign up through the UI, confirm the email via Supabase, then promote yourself to admin directly
in the database:

```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

The admin panel at `/admin` gives you user management, scheduler intervals, algorithm defaults,
system settings, live logs and database backup/restore.

### 7. Set up system settings

Some integrations read their credentials from the `system_settings` table rather than from the
environment, because they are shared across all users. Set them in the admin panel:

| Key | Value |
|-----|-------|
| `weather_api_token` | Your WeatherAPI.com token |
| `dessmonitor_url` | `https://web.dessmonitor.com/public/` |
| `dessmonitor_comp_key` | Your DessMonitor company key |
| `telegram_token` | Your Telegram bot token |

### Useful scripts

```bash
npm run dev            # development server
npm run build          # production build
npm start              # serve the production build
npm run preview        # build + start

npm run db:generate    # prisma migrate dev
npm run db:migrate     # prisma migrate deploy
npm run db:push        # push schema without a migration
npm run db:studio      # Prisma Studio

npm run lint           # eslint
npm run lint:fix
npm run typecheck      # tsc --noEmit
npm run check          # lint + typecheck
npm run format:write   # prettier
```

The `db:backup-*` and `db:restore-*` scripts are Windows/PowerShell helpers left over from the
original deployment. They contain placeholder hosts and passwords — edit them before use, and
do not commit the edited values.

---

## Environment variables

Validated at boot by `src/env.js` (Zod). Set `SKIP_ENV_VALIDATION=true` to bypass validation —
useful inside Docker builds.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma |
| `DIRECT_URL` | when pooling | Direct (non-pooled) connection, needed for migrations behind pgbouncer |
| `ENCRYPTION_KEY` | yes | Base64-encoded 256-bit key (`openssl rand -base64 32`) for AES-256-GCM |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Service-role key, used for admin-side user sync. **Server-side only — never expose it** |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | no | hCaptcha site key for the auth forms |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | Cloudflare Turnstile site key (alternative to hCaptcha) |
| `NEXT_PUBLIC_LOGO_SRC` | no | Override the header logo; defaults to the bundled `/logo.svg` |
| `NODE_ENV` | no | `development` / `production` / `test` |

Anything prefixed `NEXT_PUBLIC_` is bundled into the client and is **public by definition** —
never put a secret behind that prefix.

Only `.env.example` belongs in version control. Every other `.env*` file holds real credentials
and is git-ignored.

## Database

Prisma owns the schema (`prisma/schema.prisma`). The main tables:

| Model | Purpose |
|-------|---------|
| `User` | Mirror of the Supabase auth user, plus `is_admin` / `is_blocked` |
| `UserProperties` | Per-user key/value settings — location, tariff windows, enabled algorithms, encrypted integration credentials |
| `Equipment` | Catalogue of supported hardware with images and capability metadata |
| `SystemSettings` | Global key/value settings — shared API tokens, menu config, algorithm defaults |
| `DeviceStatus` | Last known state of each controlled device |
| `SystemLog` | Application-level audit log |
| `AlgorithmLog` | Per-run trace of every algorithm decision, with filters in the UI |

`prisma/seed-system-settings.ts` seeds sensible defaults into `SystemSettings`.

## Running in production

A Docker setup is included.

```bash
cp .env.production.template .env.production   # then fill in real values
docker compose -f docker-compose.prod.yml up -d --build
```

This brings up the Next.js app and PostgreSQL. `nginx/` contains a reverse-proxy config with
Let's Encrypt TLS that you can adapt to your own domain. `scripts/` holds the original
deployment, backup, health-check and webhook-deploy helpers — read them before running them,
they assume a specific server layout.

Longer write-ups live in [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md) and
[`QUICK_START_PRODUCTION.md`](./QUICK_START_PRODUCTION.md). The remaining `*_SETUP.md` and
`*_GUIDE.md` files in the repository root document individual subsystems — encryption, the
scheduler, the admin panel, Smart Life, SmartESS, geolocation, backups, logging. They are
written partly in Ukrainian and partly in Russian, and some of them describe the original
hosted deployment rather than a fresh install.

**Run only a production build in production** (`npm run build && npm start`, or the Docker
image). `next dev` is not hardened and should never face the internet.

## Project layout

```
prisma/              Schema, migrations, seed
scripts/             Deployment, backup, diagnostics helpers (bash + PowerShell)
nginx/               Reverse-proxy config
src/
  components/        UI, including the admin panel tabs
  data/              Static help content for the algorithm settings screens
  lib/               Auth context, Prisma + Supabase clients, encryption, appliance logic
  pages/             Next.js Pages Router — UI, auth, settings, admin, API routes
  server/
    algorithms/      One file per scheduling algorithm
    api/             tRPC root and routers
    parthnersapi/    Third-party clients: SmartESS, Smart Life, Telegram, weather
    scheduler.ts     node-cron registration and task loop
    taskrunner.ts    Per-user execution of a scheduled task
  styles/, utils/, hooks/
instrumentation.ts   Boots the scheduler with the Next.js server
```

## Security notes

Read these before you expose an instance to the internet.

- **Authentication is Supabase-only.** There is no local account fallback and no development
  bypass — if your Supabase project is unreachable, nobody can sign in. That is deliberate; please
  do not add a bypass to a deployment that faces the internet.
- **Encryption key.** Third-party credentials are encrypted at rest with `ENCRYPTION_KEY`. Treat
  it like a database password; back it up separately from the database itself.
- **Service-role key.** `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security entirely. Keep it
  server-side and rotate it if it ever leaks.
- **Admin backup endpoints.** `/api/admin/backup-db`, `/api/admin/restore-db` and
  `/api/admin/download-backup/[filename]` dump and restore the whole database. They are behind an
  admin check — make sure that check is intact in any fork you deploy.
- **No secrets in git.** Database dumps (`backups/`), logs and every `.env*` file except
  `.env.example` are git-ignored. Keep it that way.
- **Dependency age.** Dependencies are pinned to late-2025 versions and have not been patched
  since. Run `npm audit` and update before trusting this with anything.

## Known limitations

- Vendor APIs are unofficial and may already have changed.
- The eWeLink integration is a stub; only Tuya / Smart Life sockets are wired up end to end.
- The UI is primarily Ukrainian and has not been internationalised.
- There is no automated test suite.
- Inverter support is limited to what DessMonitor / SmartESS exposes — this covers many
  Voltronic-based hybrid inverters, but not all brands.

## License

[MIT](./LICENSE) — do what you like with it, no warranty of any kind.

## Acknowledgements

Bootstrapped with [`create-t3-app`](https://create.t3.gg/). Thanks to the T3, Prisma, tRPC and
Supabase communities, and to the people who reverse-engineered the inverter and smart-plug APIs
this project depends on.
