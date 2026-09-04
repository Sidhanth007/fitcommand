# FitCommand — AI Personalized Fitness & Nutrition Command Center

A showcase web app that turns a short onboarding questionnaire into personalized calorie/macro targets, a weekly workout plan, meal ideas, tracking, progress charts, goals, reminders and an AI assistant that knows your data. Built entirely on free tiers.

> **Disclaimer:** FitCommand is an AI-powered informational demo. It is not a medical device and does not replace advice from a qualified doctor, registered dietitian or certified fitness professional.

## Features

- **Auth** — email + password, 6-digit email OTP verification (Brevo), password reset, DB-backed sessions, single admin via `ADMIN_EMAIL`.
- **Onboarding & engines** — Mifflin-St Jeor BMR → TDEE → goal-adjusted calories with safety floors, macro split, water target; template-based weekly plan with equipment/level-aware exercise substitution.
- **Workouts** — live logger (sets, reps, weight, rest timer, effort), custom workouts, history, estimated calories, missed-session tracking with reasons and a consistency summary.
- **Nutrition** — 300+ food library (incl. ~120 Indian household foods) with health scores and healthier swaps, diet/allergy filtering, favorites, recent/frequent, meal templates, copy-yesterday, water tracker, daily insights ("chai + biscuits" pattern etc.), Indian meal-combo ideas.
- **Progress** — daily check-in (weight, measurements, steps, sleep, mood), Recharts charts (weight trend + 7-day average, intake vs target, weekly training, measurements).
- **Goals** — auto-tracked (target weight, workouts/week, daily calories/protein/water/steps) and custom goals.
- **Reminders** — in-app due/upcoming, header bell, optional morning email digest (manual send + cron route).
- **AI assistant** — Gemini (Interactions API) with Groq fallback; streaming chat aware of profile, targets, logs, plan, goals and consistency; plan coaching notes; strict safety rules and disclaimers.
- **Admin console** — analytics, users (disable/delete), foods, exercises, plan templates, articles (published under *Learn*).

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 + shadcn/ui · Prisma 7 + Neon Postgres (serverless driver) · Brevo transactional email · Gemini / Groq · Recharts.

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in the values below
npm run db:migrate                # creates tables in your Neon database
npm run db:seed                   # exercises, foods, plan templates
npm run dev                       # http://localhost:3010
```

### Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `SESSION_SECRET` | random string (`openssl rand -base64 48`) |
| `APP_URL`, `APP_NAME`, `APP_TIMEZONE` | base URL, display name, timezone used for "today" |
| `ADMIN_EMAIL` | the one account that gets the ADMIN role |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | OTP and digest emails (sender must be verified in Brevo; lowercase) |
| `AI_PROVIDER` | `gemini` (default) or `groq` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google AI Studio key; new accounts must use the Interactions API models (default `gemini-3.6-flash`) |
| `GROQ_API_KEY`, `GROQ_MODEL` | optional fallback provider |
| `CRON_SECRET` | bearer token protecting `/api/cron/daily-digest` |

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js on port 3010 |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm run db:migrate` / `db:deploy` | Prisma migrations (dev / production) |
| `npm run db:seed` | idempotent library seed |
| `npm run db:demo -- --email=you@example.com --days=14` | back-fills realistic demo logs for showcase charts |
| `npm run db:studio` | Prisma Studio |

## Free-tier limits to keep in mind

- **Neon**: 0.5 GB storage, auto-suspend when idle (first request after idle is slower).
- **Brevo**: 300 emails/day; the digest route caps at 200 recipients/day.
- **Gemini / Groq**: per-minute and per-day request quotas; the app rate-limits chat to 8/min and 150/day per user and shows a friendly retry message when a provider is busy.
- **Vercel Hobby** (if you deploy later): non-commercial use, daily cron only (`vercel.json` is prepared).

## Deployment (when you're ready — not done yet)

1. Push to GitHub and import the repo in Vercel. Add all environment variables from `.env.local` (set `APP_URL` to the production URL).
2. Run `npm run db:deploy` against the production database (or add it as a build step).
3. `vercel.json` schedules `/api/cron/daily-digest` at 01:30 UTC (07:00 IST); Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## Project structure

```
prisma/               schema, migrations, seed data, demo script
src/app/(auth)        register / verify / login / password reset
src/app/(app)         dashboard, plan, workouts, nutrition, progress, goals, reminders, assistant, learn, settings, admin
src/app/api           assistant chat stream, cron digest
src/lib/engine        nutrition + workout plan engines
src/lib/tracking      nutrition, workouts, progress, goals, reminders, consistency
src/lib/ai            provider layer (Gemini Interactions API, Groq) + context builder
src/lib/email         Brevo client, templates, digest
src/components        UI (shadcn/ui), feature components, charts
```
