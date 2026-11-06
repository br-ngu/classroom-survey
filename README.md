# Classroom Survey

A React + TypeScript + Vite application for anonymous classroom understanding checks. PostgreSQL storage and instructor authentication use Supabase. UI: Tailwind CSS with custom responsive styles; charts: Recharts; QR: qrcode.

## Current status

Implementation and local automated checks are complete. The live Supabase project is configured, its migration has been applied, and the user-created instructor account has been allowlisted. Source is published at https://github.com/br-ngu/classroom-survey (private; grant the grader access). Public frontend deployment, live login/end-to-end testing, and screenshots remain pending. Start with `docs/SUBMISSION_CHECKLIST.md` before submitting. Original specifications are preserved in `docs/specs/`.

## 1. Install

Use Node 22.18+ (Node 24 supported).

```bash
npm ci
cp .env.example .env
```

## 2. Create and configure Supabase

1. Create a free Supabase project in your own account.
2. In SQL Editor, run `supabase/migrations/001_initial.sql` once in a fresh project. It creates tables, indexes, RLS policies, and RPCs.
3. In Authentication, disable public signups and create an instructor user with an email and password. You can confirm the email through the admin interface.
4. Copy that user's UUID from Authentication > Users, then run this SQL with the actual UUID:

```sql
insert into public.instructors(user_id)
values ('REPLACE-WITH-AUTH-USER-UUID');
```

5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Use the project's publishable key or legacy anon key, **never a secret/service-role key**. The browser key is deliberately public; RLS and RPC permissions enforce access.
6. Configure Auth's Site URL to the eventual production origin. This app uses password sign-in and no sign-up/reset flows.

Only allowlisted accounts are instructors. Merely creating an authenticated account does not grant instructor access. Keep administrator SQL access private. The `instructors` table has RLS and no browser grants; only administrators can enroll instructors.

## 3. Run and verify

```bash
npm run dev -- --host 127.0.0.1
npm test
npm run build
```

Visit the Local URL printed by Vite. Login at `/login`. Create a draft with multiple-choice and true/false questions, save, edit, reorder, and activate. Activation closes any previous active survey. Open the public link in an incognito browser or scan the QR on a phone. Answer every question and submit. Verify the response and answers in Supabase, refresh the app, and view results/CSV. Repeat submission from the same browser to verify duplicate protection. Close the survey and verify an open student tab cannot submit.

`npm test` runs nine frontend data tests and nineteen checks against the actual migration in embedded PostgreSQL (PGlite). Supabase's `auth.users`, roles and `auth.uid()` are modeled in the test database. These tests exercise RLS, grants, transactional saves, activation, validation, duplicate rejection, result access and cascading deletion. They do not verify real Supabase Auth, PostgREST embedding, network concurrency, classroom load, QR scanning, or cloud deployment. Rerun the manual workflow against Supabase.

## 4. GitHub

Create an empty GitHub repository in your account, then from this folder:

```bash
git init
git add .
git commit -m "Implement classroom survey application"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

`.env`, dependencies and built output are ignored. Review staged files before pushing. Commit `package-lock.json`, source, documentation and the SQL migration.

## 5. Deploy with Cloudflare Pages

Connect the GitHub repository to a new Cloudflare Pages project. Framework: Vite. Build command: `npm run build`. Output directory: `dist`. Set build environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same public project configuration. Use Node 22.18+ or 24. Deploy. Vite embeds these settings at build time, so rebuild after changing them.

`public/_redirects` supplies SPA fallback routing. Test direct visits to `/login` and `/s/ACTUAL_SLUG`. QR codes use `location.origin`, so generate them from the production app, not localhost. Set Supabase Auth's Site URL to the Pages production origin. Supply instructor test credentials privately to the grader; never put them in this repository.

## Architecture and decisions

- Browser -> Supabase Auth for instructor password login/session/logout.
- Browser -> PostgREST with RLS for survey content and instructor-only responses.
- Browser -> restricted SQL RPCs for all mutations. No direct table write grants.
- `save_survey` creates/updates a whole draft transactionally. Drafts have no submissions, so replacing their child records does not erase results. Closed/archived surveys remain immutable: duplicate to edit a new draft.
- A global partial unique index allows only one active survey for this classroom. Activation and administrative transitions share an advisory lock. Submissions hold a shared survey-row lock; closing waits for in-flight submissions and rejects later ones. Live multi-connection behavior still needs production verification.
- Anonymous browser UUID + unique `(survey_id, anonymous_token)` prevents accidental resubmission. Clearing storage or using another browser bypasses this intentional MVP safeguard; it is not student identity verification.
- Students can read only active content and cannot read stored responses/answers. UUID-based public slugs are generated on activation. Inactive and missing surveys share a public message because anonymous users cannot inspect inactive records.
- Results poll every five seconds; charts include a numeric table. Percentages use total survey responses as denominator. A larger classroom may benefit from an aggregation RPC instead of fetching all rows.
- CSV includes survey id/title, response id/timestamp and question/answer columns. Every cell is quoted; spreadsheet formula prefixes are neutralized. Anonymous browser tokens are never exported or fetched for results.
- Frontend does not silently fall back to browser storage for survey data. Missing configuration shows setup messages.

## Files

- `src/main.tsx`: routes, authentication and instructor/student screens.
- `src/lib/data.ts`: Supabase access, validation, aggregation and CSV helpers.
- `src/style.css`: responsive, keyboard-accessible styles.
- `supabase/migrations/001_initial.sql`: schema, policies and transactional functions.
- `tests/`: unit and embedded PostgreSQL integration checks.
- `docs/`: supplied specs, development report draft, actual AI history, evidence guide and submission checklist.

## Known limits / pending checks

No claim is made for 200 simultaneous students or a two-second average page load. Measure both against the deployed service. Pagination and server-side aggregation may be needed at scale. Accidental duplicate protection requires browser local storage. Full browser QA was blocked because the remote browser could not reach the workspace preview. Mobile device, keyboard/screen-reader, QR camera, spreadsheet compatibility and two-browser testing remain manual checks. Editor warns on tab close and its own Back action; avoid other navigation with unsaved changes. Public production hosting and live database evidence require your external account setup.
