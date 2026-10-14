# AddisDR ERP

A private, single-user web application to manage **AddisDR**: commercial work,
finances, and personal performance. **Phase 1** established the foundation —
authentication, navigation, database schema, a real dashboard, the reminder
system, and settings. **Phase 2** implements the **Commercial** and **Marketing**
modules: a full lead pipeline, communication milestones, follow-ups, client
conversion and project linkage, marketing activity and channel tracking, and a
computed commercial summary in weekly reporting. **Phase 3** implements
**Financial Management**: income and expenses, configurable allocation rules,
savings accounts, allowance discipline and project profitability. **Phase 4**
implements **Daily Work & Performance Management**: daily session checkboxes
(two daytime + one nighttime), task management with carry-forward, Saturday
weekly planning, accountability reports in an exact six-section format with
auto-pulled numbers, performance analysis with period-over-period trends, and
advisory reminders. **Phase 5** completes **Final Integration & Verification**:
reminders are now generated automatically from recorded data (including the
monthly finance review), the current week's report is raised as soon as its
reporting Saturday arrives, submitted reports close their reminder, and resolved
obligations are reconciled. Nothing is fabricated; every figure is derived from
stored records.

---

## Tech stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19 + TypeScript     |
| Styling        | Tailwind CSS 3, responsive (mobile + desktop)       |
| Database       | PostgreSQL (Supabase) via Prisma ORM 6            |
| Auth           | Single-user, **username + password** (bcrypt + signed JWT cookie, `jose`) |
| Validation     | Zod                                                 |
| Dates          | date-fns + date-fns-tz (`Africa/Addis_Ababa`)       |
| Currency       | `Intl.NumberFormat` (Ethiopian Birr, ETB)           |
| Tests          | Vitest                                              |

---

## Requirements

- Node.js 20+
- A PostgreSQL database — this project runs against **Supabase** (any Postgres
  works; Neon was used originally)
- npm

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
# Pooled connection used by the running app
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
# Direct (non-pooled) connection used by Prisma Migrate
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Secret used to sign the session cookie
AUTH_SECRET="<long random string>"

# The single owner account created by the seed
OWNER_USERNAME="owner"
OWNER_EMAIL="owner@example.com"
OWNER_NAME="AddisDR Owner"
OWNER_PASSWORD="change-me-now"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> **Supabase:** copy both `URI`s from *Connect → Connection string* (or the
> Project Settings → Database page). Use the **Transaction** pooler URI (port
> `6543`, with `pgbouncer=true`) for `DATABASE_URL` and the **Session/direct**
> URI (port `5432`, no `-pooler` host suffix) for `DIRECT_URL`.
>
> **Neon:** `DIRECT_URL` is the same host **without** the `-pooler` segment.

### 3. Run migrations

```bash
npm run db:migrate     # create/apply migrations in development
# or, in production/CI:
npm run db:deploy
```

### 4. Seed the owner account

```bash
npm run db:seed
```

This creates the owner account (idempotent) and default allocation rules
(tax 30%, tithe 10%, savings 20%). It is safe to run repeatedly.

> Alternatively `npm run setup` runs `db:deploy` + seed in one step.

### 5. Run

```bash
npm run dev            # http://localhost:3000
```

Sign in with the `OWNER_USERNAME` / `OWNER_PASSWORD` from `.env`, then change the
password immediately under **Settings → Change password**. You can rename your
username under **Settings → Username**.

If no owner exists yet, visiting the app redirects to **`/setup`** where you can
create the account through the UI instead of the seed.

---

## Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the dev server                           |
| `npm run build`      | `prisma generate` + production build           |
| `npm start`          | Start the production server                    |
| `npm run lint`       | ESLint                                         |
| `npm run typecheck`  | `tsc --noEmit`                                 |
| `npm test`           | Vitest (business rules, dates, currency)       |
| `npm run db:migrate` | Create + apply a migration                     |
| `npm run db:deploy`  | Apply pending migrations (no shadow DB)        |
| `npm run db:seed`    | Seed owner + allocation rules                  |
| `npm run db:studio`  | Prisma Studio                                  |
| `npm run setup`      | `db:deploy` + seed                             |

---

## Project structure

```
src/
  app/
    (app)/                 # authenticated route group (sidebar shell)
      layout.tsx           # requires a session, renders AppShell
      dashboard/           # real dashboard (commercial + marketing metrics)
      commercial/          # Phase 2: pipeline, leads, follow-ups, conversion
      marketing/           # Phase 2: activities, budget/spend, channels
      projects/            # Phase 2: client/lead projects + revenue roll-up
      weekly-reports/      # Phase 2/4: weekly summaries + full accountability report
      finance/ daily-work/ tasks/ performance/   # Phase 3/4 modules
      reminders/           # functional module (auto-generated + manual)
      settings/            # functional module
      error.tsx loading.tsx
    api/cron/reminders/    # Phase 6: protected background reminder endpoint
    login/ setup/          # public auth pages
    page.tsx               # redirects to /dashboard or /setup
    layout.tsx globals.css
  components/
    ui/                    # Card, Button, Badge, StatCard, ProgressBar, ...
    auth/ AppShell.tsx icons.tsx reminders/ settings/
    commercial/            # LeadForm, PipelineBoard, Milestone/FollowUp/Interaction panels
    marketing/             # MarketingActivityForm, MarketingActivityList
    finance/ daily-work/ tasks/ weekly-reports/ performance/  # Phase 3/4 components
  lib/
    prisma.ts auth.ts session.ts
    datetime.ts currency.ts rules.ts constants.ts labels.ts nav.ts
    finance.ts daily-work.ts cron.ts   # finance helpers, work rules, cron auth
    reminder-engine.ts    # automatic reminder generation + reconciliation
    validation.ts dashboard.ts commercial.ts finance.ts daily-work.ts
    report-queries.ts
    actions/               # server actions (auth, reminders, commercial, marketing, finance, daily-work, tasks, weekly-reports)
  middleware.ts            # route protection
prisma/
  schema.prisma migrations/ seed.ts
tests/                     # vitest specs
```

---

## Data model

All records are stored in PostgreSQL — nothing relies on browser state.

- **User** — single owner: name, email, password hash, timezone, currency, monthly allowance, accountability partner.
- **Lead / Interaction / Client** — commercial pipeline and communication history.
- **CommunicationMilestone** — ordered checkpoints reached on a lead (unique per lead + stage).
- **FollowUp / FollowUpReschedule** — sales follow-up obligations with reschedule history.
- **Project** — linked to client/lead; revenue roll-up via finance entries.
- **MarketingActivity** — campaigns and channels, linked to the leads they generate.
- **WorkSession** — the 3 sessions per workday (unique per day + session number).
- **WeekPlan / Task / WeeklyReport** — weekly planning, priorities, carry-forward, reporting.
- **FinanceEntry / FinancialAllocation** — income, expenses and the tax/tithe/savings/business/personal allocation rules.
- **Reminder** — centralized notifications (pending / completed / overdue / dismissed, channel).
- **PerformanceReview** — monthly review records.

### Design decisions

- **Single-tenant.** There is one owner, so business tables do not carry a `userId`. See "Phase 2 notes" if multi-user is ever needed.
- **No duplicated financial totals.** Project revenue and net profit are always derived from `FinanceEntry` rows, never stored separately.
- **Day normalization.** Work sessions, weeks and transaction days are stored as UTC midnight of the calendar day in `Africa/Addis_Ababa`, so uniqueness and week grouping are stable.
- **Reminders are independent.** Marking a reminder *dismissed* does **not** complete any underlying task or report.

---

## Operating rules encoded in Phase 1

- 3 work sessions per workday (2 daytime + 1 nighttime), 9 planned hours/day, Monday–Friday (`src/lib/constants.ts`, `src/lib/rules.ts`).
- Weekly planning helper dates: the Saturday before the work week; reporting on the Saturday after.
- Monthly personal allowance target of **30,000 ETB**, with tax/tithe/business/savings reserved before personal spending (`allowanceStatus`, `computeAllocations`).
- Reminder types cover work sessions, task review, follow-ups, meetings, weekly planning/reporting, missing reports, monthly reviews, spending limits and deadlines.

---

## Tests

```bash
npm test
```

The suite covers timezone/week math, work-schedule rules, allowance thresholds,
allocation math, reminder status (including overdue detection), completion rate,
currency formatting and robust number coercion (`toNumber`). Phase 2 adds the
commercial suite: pipeline metrics, status transitions, milestone progression,
expected-close bucketing, lead staleness, effective follow-up status, lead
conversion, marketing attribution and channel breakdown. Phase 4 adds the
daily-work suite: session status counting and completion rates, effective actual
minutes, per-day progress and grouping, task summary and carry-forward ordering,
period comparison/trends, reminder planning (including that dismissing never
completes the item and that reminders are never resurrected), and weekly report
rendering in the exact section order. Phase 5 adds reminder coverage for the
monthly finance review and for weekly-report due timing (a week's report is due
from its reporting Saturday onward, not only the following week). Phase 6 adds
the monthly performance-review reminder (raised distinctly alongside the finance
review), a pure reconciliation suite (`planReminderResolutions`: which reminders
resolve, which persist, month reviews never auto-resolve, and purity) and cron
authorization tests (bearer-token checks plus a guard that `vercel.json` still
schedules the route).

---

## Phase 1 completion criteria

| Criterion                                   | Status |
| ------------------------------------------- | ------ |
| Application runs successfully                | ✅ |
| Authentication and private access work       | ✅ |
| Navigation to all main sections works        | ✅ |
| Dashboard loads without errors               | ✅ |
| Empty states display correctly               | ✅ |
| Database migrations run successfully         | ✅ |
| Timezone and ETB defaults configured         | ✅ |
| Foundation ready for the next phase          | ✅ |

---

## Phase 2 completion criteria — Commercial & Marketing

| Criterion                                             | Status |
| ----------------------------------------------------- | ------ |
| Lead capture with source, value and probability       | ✅ |
| Kanban pipeline from New through Won / Lost           | ✅ |
| Forward-only stage transitions enforced server-side   | ✅ |
| Communication milestones per lead                     | ✅ |
| Follow-up scheduling with reschedule/complete history | ✅ |
| Sales follow-ups create exactly one linked reminder   | ✅ |
| Interaction / communication log                        | ✅ |
| Convert won leads to clients (+ optional project)     | ✅ |
| Marketing activities with budget vs spend tracking    | ✅ |
| Channel effectiveness and cost-per-lead analysis      | ✅ |
| Commercial & marketing metrics on the dashboard        | ✅ |
| Computed commercial summary in weekly reporting        | ✅ |
| Automated tests (pipeline, transitions, marketing)    | ✅ |

### Commercial rules encoded in Phase 2

- **Forward-only pipeline.** `LEAD_STATUS_TRANSITIONS` forbids skipping or
  reversing stages; a lost lead may only be reopened as New, and Won is terminal.
- **Milestones auto-advance.** Moving a lead to Qualified / Proposal /
  Negotiation / Won records the matching communication milestone automatically.
- **One reminder per follow-up.** Scheduling a follow-up creates a single linked
  `SALES_FOLLOWUP` reminder; rescheduling updates it and completing/cancelling it
  closes the reminder — so lead edits never duplicate reminders.
- **Derived money.** All totals (pipeline value, weighted pipeline, won value,
  cost per lead) are computed from leads, activities and finance entries; none
  are stored redundantly.

---

## Phase 4 completion criteria — Daily Work & Performance

| Criterion                                                       | Status |
| --------------------------------------------------------------- | ------ |
| Three sessions per workday (2 daytime + 1 nighttime, 9h)        | ✅ |
| One checkbox per session with planned vs actual tracking        | ✅ |
| Planned vs actual location and attendance                       | ✅ |
| Planned leave support (clears unstarted slots, keeps completed) | ✅ |
| Advance compensation / emergency catch-up (extra sessions)      | ✅ |
| Rescheduling with history preserved                             | ✅ |
| Task CRUD with priority, due date, estimate and status          | ✅ |
| Carry unfinished tasks forward without losing history           | ✅ |
| Saturday weekly planning (Mon–Fri sessions + objectives)        | ✅ |
| Weekly report in the exact six-section format                   | ✅ |
| Auto-pulled numbers from recorded commercial/finance/work data  | ✅ |
| Report status draft / submitted / late                          | ✅ |
| Accountability partner on the report                            | ✅ |
| Daily / weekly / monthly performance metrics with trends        | ✅ |
| Reminders for open sessions, overdue tasks, planning, reports   | ✅ |
| Dismissing a reminder never completes the underlying item       | ✅ |
| Overdue items surfaced on the dashboard                         | ✅ |
| Automated tests (sessions, rates, carry-forward, reminders)     | ✅ |

### Phase 4 rules encoded

- **Sessions are data, not decoration.** A workday lazily creates its three
  slots; ticking a session stores actual minutes (falling back to the planned
  length), and every metric is derived from those rows.
- **Rescheduling keeps history.** The original session becomes `RESCHEDULED`
  (not deleted) and a fresh `PLANNED` slot is created on the target day.
- **Carry-forward clones.** Unfinished tasks are copied into the next week with a
  `carriedFromId` link; the originals remain in place.
- **Numbers are rendered, never invented.** The weekly report's "Numbers" section
  is generated live from leads, finance entries, sessions and tasks.
- **Reminders are advisory.** Generating reminders is idempotent (deduped by
  type + record across all statuses), and dismissing or completing one never
  touches the session, task or report it refers to.

---

## Phase 5 completion criteria — Final Integration & Verification

| Criterion                                                          | Status |
| ------------------------------------------------------------------ | ------ |
| Reminders generated automatically from recorded data               | ✅ |
| Incomplete-session reminders                                       | ✅ |
| Overdue-task reminders                                             | ✅ |
| Sales follow-up reminders (created/closed with the follow-up)      | ✅ |
| Saturday weekly-planning reminder                                  | ✅ |
| Missing weekly-report reminder (due from its reporting Saturday)   | ✅ |
| Monthly financial review reminder                                  | ✅ |
| Submitted report closes its reminder; reopening restores it        | ✅ |
| Dismissing a reminder never completes the underlying item          | ✅ |
| Resolved obligations reconciled without resurrecting dismissed ones| ✅ |
| Financial figures derived once (no double-counting)                | ✅ |
| Dashboard figures and alerts link to their source pages            | ✅ |
| Reminder rules covered by automated tests (monthly review, report timing)| ✅ |
| Lint, typecheck, tests, Prisma validate/migrate and build pass     | ✅ |

### Phase 5 rules encoded

- **Automatic, idempotent generation.** `generateReminders(now)`
  (`src/lib/reminder-engine.ts`) runs on every visit to the dashboard and
  reminders pages. It reads recorded data, plans the missing reminders and
  reconciles the resolved ones. It is safe to run repeatedly: reminders are keyed
  by `type` + `relatedId`, so an existing reminder — pending, completed or
  dismissed — is never regenerated.
- **Reports stay due until submitted.** A week's report is raised as soon as its
  reporting Saturday arrives (`isWeeklyReportDue`) and only cleared when the
  report is `SUBMITTED`/`LATE`; reopening a submitted report makes it due again.
- **Reconciliation never resurrects.** The engine only completes
  pending/overdue reminders whose obligation is met (day's sessions done, task
  no longer overdue, report submitted, next week planned). It never reopens or
  recreates a dismissed reminder.
- **One source of truth for money.** Only *received* income drives allocations;
  business expenses are deducted once for net profit; personal allowance is a
  distribution, not an expense — so dashboard, reports and project roll-ups can
  never double-count.
- **Advisory reminders.** No reminder generation or status change ever mutates
  the session, task, plan or report it refers to.

---

## Phase 6 completion criteria — Reminders and Automation

| Criterion                                                            | Status |
| -------------------------------------------------------------------- | ------ |
| Reminders generated automatically from recorded data                 | ✅ |
| Incomplete-session, overdue-task and sales follow-up reminders       | ✅ |
| Saturday weekly-planning and missing weekly-report reminders         | ✅ |
| Monthly financial review reminder                                    | ✅ |
| Monthly performance review reminder                                  | ✅ |
| Background execution without opening the dashboard (scheduler/cron)  | ✅ |
| Generation is duplicate-safe under repeated/concurrent runs          | ✅ |
| Obligations resolved automatically when completed                    | ✅ |
| Overdue detection and dismissal preserved (never resurrected)        | ✅ |
| Correct `Africa/Addis_Ababa` day/week/month boundaries               | ✅ |
| Automated tests for scheduling, due dates, idempotency, resolution   | ✅ |
| Scheduler documented for Vercel and self-hosted cron                 | ✅ |

### Phase 6 rules encoded

- **Automatic, idempotent generation.** `generateReminders(now)`
  (`src/lib/reminder-engine.ts`) runs on every visit to the dashboard and
  reminders pages. It reads recorded data, plans the missing reminders and
  reconciles the resolved ones. It is safe to run repeatedly: reminders are keyed
  by `type` + `relatedId`, so an existing reminder — pending, completed or
  dismissed — is never regenerated.
- **Background execution.** A protected cron endpoint (`/api/cron/reminders`)
  runs the same generator on a schedule, so reminders are raised even when the
  app is never opened. It is authorized by a bearer `CRON_SECRET` and is excluded
  from the session middleware.
- **Duplicate-safe.** A unique index on `(type, relatedId)` plus
  `createMany({ skipDuplicates: true })` means overlapping dashboard loads and
  cron runs can never double-raise a reminder. `relatedId` is nullable and
  Postgres treats NULLs as distinct, so manually-created reminders are unaffected.
- **Reports stay due until submitted.** A week's report is raised as soon as its
  reporting Saturday arrives (`isWeeklyReportDue`) and only cleared when the
  report is `SUBMITTED`/`LATE`; reopening a submitted report makes it due again.
- **Reconciliation never resurrects.** The engine only completes
  pending/overdue reminders whose obligation is met (day's sessions done, task
  no longer overdue, report submitted, next week planned). The decision is a pure
  function (`planReminderResolutions`) so it is directly unit-tested. Monthly
  reviews are advisory and closed by the user, not auto-reconciled.
- **One source of truth for money.** Only *received* income drives allocations;
  business expenses are deducted once for net profit; personal allowance is a
  distribution, not an expense — so dashboard, reports and project roll-ups can
  never double-count.
- **Advisory reminders.** No reminder generation or status change ever mutates
  the session, task, plan or report it refers to.

### Scheduled reminders (background execution)

Reminders are raised whenever the dashboard or reminders page is opened **and**
by a scheduled job, so they appear even if the app is never opened. The job is a
single protected HTTP endpoint:

```
GET|POST /api/cron/reminders
Authorization: Bearer $CRON_SECRET
```

It returns `{ "ok": true, "created": n, "completed": n, "ranAt": "..." }`. If
`CRON_SECRET` is unset it returns `503` and does nothing, so it cannot be
triggered anonymously.

**On Vercel** — `vercel.json` already declares the schedule (daily at 04:00 UTC,
i.e. 07:00 in Addis Ababa). Set `CRON_SECRET` in the project environment and
Vercel Cron sends the bearer token automatically:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 4 * * *" }] }
```

**Anywhere else** (self-hosted, VPS, or local) — add a crontab entry that curls
the endpoint, e.g. daily at 07:00 Addis time:

```cron
CRON_TZ=Africa/Addis_Ababa
0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-app.example.com/api/cron/reminders
```

Because generation is idempotent, running it more often than daily is harmless.

---

## Setup steps you must perform

1. **Rotate the credentials.** Change `OWNER_PASSWORD` and especially `AUTH_SECRET` in `.env`; the committed development secret must not be used in production. Generate a strong `CRON_SECRET` too (see `.env.example`).
2. **Point `DATABASE_URL`/`DIRECT_URL` at your Supabase database** (see *Database setup on Supabase*). If you are moving from Neon, copy your existing data across with the steps below.
3. **Run `npm install`, `npm run db:deploy`, `npm run db:seed`.**
4. **Sign in with `OWNER_USERNAME` / `OWNER_PASSWORD`** and change the password, then confirm your username, monthly allowance and allocation rules in **Settings**.

---

## Database setup on Supabase

1. Create a Supabase project (any region — `eu-central-1` is closest to Ethiopia).
2. In **Connect → Connection string**, copy both URIs:
   - **Transaction pooler** (port `6543`, host `...pooler.supabase.com`, includes
     `pgbouncer=true`) → `DATABASE_URL`.
   - **Session / direct** (port `5432`, host `db....supabase.co`) → `DIRECT_URL`.
3. Put those URIs in `.env` and in your hosting environment.

### Migrating existing data (Neon → Supabase)

Restore the old dump **first**, then apply Prisma migrations. This order lets the
`username` migration backfill each account from its email address.

```bash
# 1. Dump the current Neon database (use the direct, non-pooled URL)
pg_dump "$NEON_DIRECT_URL" -Fc -f addisdr.dump

# 2. Point .env at Supabase, then restore into the new database
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$SUPABASE_DIRECT_URL" addisdr.dump

# 3. Apply the pending Prisma migrations (adds + backfills `username`)
npm run db:deploy

# 4. Verify nothing is left pending and the row looks right
npx prisma migrate status
```

The dump also carries the `_prisma_migrations` bookkeeping table, so step 3 only
runs migrations Neon does not have yet. `migrate status` must report *no pending
migration*.

> Fresh install with no data to keep? Skip step 1–2: `npm run setup` creates the
> schema directly on Supabase.

---

## Deployment & operations

### Environment variables in production

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled Postgres connection used by the app |
| `DIRECT_URL` | yes | Direct connection used by Prisma Migrate (`db:deploy`) |
| `AUTH_SECRET` | yes | Signs the session cookie — never reuse the dev value |
| `CRON_SECRET` | yes | Bearer token for `/api/cron/reminders` |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | Display timezone (default `Africa/Addis_Ababa`) |
| `TZ` | no | Host timezone — set `Africa/Addis_Ababa` on Vercel (see note below) |
| `OWNER_USERNAME` / `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_PASSWORD` | seed only | Creates the owner on `db:seed` (`OWNER_USERNAME` defaults to the email local-part) |

### Deploying

1. Set the environment variables above in the hosting project.
2. Build with the existing script — `npm run build` runs `prisma generate && next build`.
3. Apply migrations as part of the release with `npm run db:deploy` (uses `DIRECT_URL`).
4. Seed once with `npm run db:seed` (idempotent).
5. On Vercel, `vercel.json` already registers the daily reminder cron (see *Scheduled reminders*); on other hosts add the crontab entry.

> Run the server with `TZ=Africa/Addis_Ababa`. Calendar-day logic re-normalizes every
> date, so it stays correct on a UTC host, but timestamp comparisons read "now" through
> `zonedNow()` and drift by the host's UTC offset otherwise. Matching the host timezone
> to the app timezone keeps development and production identical.

### Backups & recovery

- **Supabase** — use the built-in daily backups and **Point-in-Time Recovery** (available on paid plans) from the dashboard's *Database → Backups* page to restore the whole database to a past moment.
- **Portable dump** — `pg_dump "$DIRECT_URL" -Fc -f addisdr.dump` and restore with
  `pg_restore --clean --if-exists --no-owner -d "$DIRECT_URL" addisdr.dump` (use the direct, non-pooled URL).
- **Health check** — `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/reminders` should return `{"ok":true,...}`.

---

## Phase 2 notes / known limitations

- **Placeholder modules.** All planned modules (Commercial, Marketing, Finance, Daily Work, Tasks & Weekly Planning, Performance Analysis) are now implemented. Weekly Reports renders the accountability workflow in full.
- **Timezone preference.** The timezone field is stored on the user, but rendering currently uses `NEXT_PUBLIC_APP_TIMEZONE` (default `Africa/Addis_Ababa`). Wiring the stored preference through every formatter remains a later task.
- **`zonedNow()` semantics.** It returns a wall-clock-shifted `Date`, not a real instant. Calendar-day logic is unaffected (dates are re-normalized), but timestamp comparisons (task/reminder due dates) assume the host runs in the app timezone — deploy with `TZ=Africa/Addis_Ababa`.
- **Unused module.** `src/lib/dashboard.ts` (`getDashboardData`, `PERSONAL_CATEGORY`) is no longer referenced — the dashboard page queries finance and reminders directly via `summarizeFinance`. It still carries older, divergent finance logic (all-status income, category-based personal spend) and should be deleted to avoid confusion.
- **Notifications.** Only in-app reminders exist. The `ReminderChannel` enum reserves `EMAIL` and `SMS` for later.
- **Reminder scheduling.** Reminders are generated both on page load (dashboard / reminders) and by the scheduled cron endpoint, so they are raised with the app closed. The bundled `vercel.json` schedule only fires when the app is deployed on Vercel; on any other host, add the crontab entry from the *Scheduled reminders* section. Reminders are advisory and are completed (never deleted) once their obligation is met.
- **Monthly performance review.** A `MONTHLY_PERFORMANCE` reminder is now raised for the completed month, and the `PerformanceReview` model exists — but there is no dedicated "record a performance review" form yet, so the reminder is dismissed/completed manually rather than auto-reconciled against a saved review.
- **Report delivery.** Submitting a weekly report marks it `SUBMITTED`/`LATE` and records the accountability partner, but no email is sent — delivery is out of scope for this phase.
- **Multi-user.** Not supported by design. Adding it requires a `userId` foreign key on the tenant tables and row-level scoping.
- **Prisma seed config.** `package.json` still carries the `prisma.seed` key (deprecated in favour of `prisma.config.ts`, which arrives in Prisma 7).
