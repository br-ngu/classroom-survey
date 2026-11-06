# Verification record

Run during this conversation on November 5, 2026 (America/New_York).

| Check | Observed result | Scope |
|---|---|---|
| TypeScript + Vite production build | PASS | Compiles frontend and emits deployable static assets |
| Data-helper checks | 9 PASS | CSV escaping/formula neutralization, metadata rows, calculation denominators, editor validation, stored ordering |
| PostgreSQL integration checks | 19 PASS | Actual migration in PGlite, modeled Supabase Auth identities/roles |
| Live Supabase integration | NOT RUN | Requires configured Supabase project |
| Browser visual/end-to-end QA | BLOCKED | Cloud browser could not connect to workspace localhost preview |
| Mobile/QR scan/two browsers/accessibility | NOT RUN | Follow manual submission checklist |
| Public deployment | NOT RUN | GitHub/hosting account setup required |
| 200 simultaneous students / two-second load | NOT RUN | No performance claim |

## PostgreSQL checks that passed

1. Migration creates five related survey tables.
2. Transactional save creates questions and choices.
3. Invalid save rolls back all partial inserts.
4. Activation closes the previously active survey.
5. Active survey editing is rejected.
6. Anonymous readers see only active survey content.
7. Anonymous results access is denied.
8. Anonymous direct writes are denied.
9. Anonymous instructor RPC execution is denied.
10. Anonymous submission persists atomically.
11. Duplicate browser token is rejected.
12. Missing answer is rejected.
13. Repeated question is rejected.
14. Choice belonging to another question is rejected.
15. Approved instructor sees persistent response and answers.
16. Close prevents subsequent anonymous submissions.
17. Authenticated non-instructor cannot read historical data.
18. Authenticated non-instructor cannot mutate surveys.
19. Archive preserves data; deletion cascades.

PGlite checks do not exercise Supabase's deployed API gateway, real Auth sessions, network concurrency or Cloudflare. Capture real service evidence separately. The production build warns about the main JavaScript bundle size; charts and QR generation load separately, but production page-load performance remains unmeasured.

## Reproduce

Use Node 22.18+ or 24, then run `npm ci`, `npm test` and `npm run build` in the project folder. Live verification steps are in README.md and SUBMISSION_CHECKLIST.md.
