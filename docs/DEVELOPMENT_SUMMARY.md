# Development summary — Classroom Survey

**Draft for review and personalization.** This describes actual implementation work. External setup, deployment and evidence collection remain pending; replace the marked sections only after performing them. Do not submit this as a claim of actions you have not taken.

## Using the specifications

The AI agent reviewed the overall specification, UI routes, data model, API and task roadmap supplied with the assignment. These documents defined two separate experiences: a protected instructor workspace and a public student survey. The React application follows those routes and limits questions to multiple choice and true/false. The database uses the five specified tables and preserves historical results. The supplied TODO contained prechecked tasks despite no source code being attached, so a new checklist distinguishes implemented features from unverified live-service work.

## Generated application and architecture

The agent generated the React/TypeScript frontend, Vite configuration, Tailwind and custom responsive styles, Supabase access helpers, PostgreSQL migration, tests and documentation. The instructor workspace supports draft editing, reordering questions and choices, duplication, search, filtering, activation, closing, archiving and confirmed deletion. A presentation page generates a QR code from the current site's origin. The student view has no account requirement and submits all answers together. Results show bar charts and numeric tables; CSV exports include one row per response plus survey metadata.

The frontend is responsible for display and immediate form feedback. Supabase Auth handles instructor credentials and sessions. The PostgreSQL backend is responsible for authoritative access checks, survey state, submission validation and persistence. Frontend protections improve usability but do not replace database security.

## Database configuration

The generated migration creates surveys, questions, choices, responses and answers with UUID keys and foreign keys. Cascading deletion removes a deleted survey's related records; archiving preserves them. A partial unique index prevents more than one active survey. A response uniqueness constraint pairs the survey ID with an anonymous browser token to prevent accidental repeated submissions.

RLS limits anonymous reads to active survey content and denies access to responses and answers. An additional instructor allowlist prevents an arbitrary authenticated account from acquiring instructor permissions. All browser writes go through restricted SQL functions. Draft saves and student submissions execute in transactions, preventing partial records when validation fails.

**Live setup pending:** Create a Supabase project, run the migration, create an instructor account, insert its Auth UUID into the allowlist and configure the two public Vite environment variables. No secret or service-role key belongs in the frontend.

## Frontend-to-database communication

The Supabase JavaScript client uses password authentication for instructors. It retrieves surveys and nested questions/choices through PostgREST queries protected by RLS. The `save_survey`, `activate_survey`, `close_survey` and `manage_survey` RPCs implement instructor mutations. Students call `submit_survey_response` with a browser token and question/choice IDs. This RPC checks that the survey is active, all questions are answered exactly once and each choice belongs to its question. It then inserts the response and answers atomically. Instructor result queries retrieve responses and answers; the browser calculates counts and percentages and refreshes every five seconds.

## Problems and testing

A concurrency issue was identified during implementation: checking status only in the frontend could allow submission after closing. The submission function therefore holds a shared survey-row lock, while closing updates the same row. Concurrent submissions can coexist, but close and submission are ordered at the database boundary. Administrative transitions also share an advisory lock. Live multi-connection testing remains necessary.

The initial TypeScript build exposed a generic helper mismatch with Supabase's authentication response union. The helper was changed to preserve the input response's data type, and the production build passed. Local automated checks cover CSV quoting/formula protection, result calculations, validation and ordering. Nineteen embedded PostgreSQL checks passed against the migration with modeled Supabase authentication, covering permissions, transactional rollback, lifecycle rules, invalid submissions and duplicate protection. These checks do not substitute for a live Supabase integration test. Browser QA was attempted but the remote browser could not reach the local preview.

## Deployment and learning

**Deployment pending:** Publish the source to a personal GitHub repository and connect it to Cloudflare Pages with Vite build settings and public Supabase variables. Verify production routes, instructor login, QR scanning, persistent student submissions and results. Capture real database and results screenshots. Record the final URLs in the submission checklist and supply test credentials privately.

**Student reflection to complete:** Explain in your own words what you learned about foreign keys, RLS versus frontend route protection, transactions and hosting a static frontend separately from its database. Describe the live setup/testing you personally performed and one issue you encountered. This report intentionally does not invent a student's experiences or completed deployment.
