# Live setup checkpoint

The user connected GitHub and Supabase and authorized a new classroom-survey project in the listed Supabase organization.

## Completed

- Created Supabase project `classroom-survey`, reference `taeebreetytwhamutmeu`, region `us-east-1`.
- Applied migration `initial_classroom_survey` successfully.
- Verified RLS is enabled on all six public application tables.
- Verified `anon` lacks SELECT on responses/answers, INSERT on surveys, and EXECUTE on activate_survey.
- Verified `anon` can execute the intended submission RPC.
- Retrieved public client configuration and configured the local ignored .env.
- Rebuilt frontend with the live project configuration.

## Advisor review

The private instructor allowlist deliberately has RLS with no browser policies or grants. SECURITY DEFINER warnings correspond to intentionally exposed RPC endpoints: instructor mutations check allowlist membership; anonymous submission validates active state and every answer. Details: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable . Performance notices concern unused indexes in this empty database and multiple permissive SELECT policies; these are recorded rather than misrepresented as a clean report.

## Pending

- Instructor user created and confirmed by user; allowlist grant completed. Password remains private.
- Instructor login verification still needs a live application session.
- User created br-ngu/classroom-survey as a private repository with an initial README. The project source is being uploaded there; code_3000 remains unchanged.
- Live login and end-to-end workflow; hosting/deployment and screenshots.

The initial ZIP predates this checkpoint. Live database setup is now complete, but deployment and full integration verification remain pending.
