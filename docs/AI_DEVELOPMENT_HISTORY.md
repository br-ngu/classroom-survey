# AI development history

This is a factual Markdown summary, not a fabricated Cursor transcript. The work occurred in ChatGPT Work mode using an AI coding agent.

1. **User request:** “Do this assignment for me.” The user supplied the assignment and five specification documents.
2. **Requirements review:** The agent read the assignment and source specifications, identified the required React/Supabase architecture and noted that the provided TODO claimed completed work without attached source code.
3. **Scope clarification through progress updates:** The agent explained that it would generate the application and deliverables, while live service setup, public deployment and database screenshots would require external accounts. It did not claim those steps had happened.
4. **Implementation:** The agent created the Vite/React/TypeScript project, all specified routes, instructor and anonymous student views, chart/CSV helpers, QR presentation and the SQL migration. It chose an explicit instructor allowlist, immutable non-draft surveys, transactional saves and browser-token duplicate protection.
5. **Security review:** The agent restricted direct table writes, revoked default public execution privileges on mutation functions, added RLS and validated question/choice relationships inside the submission RPC. Survey locks handle submission/closing ordering.
6. **Build/debug:** The first build found a TypeScript union-type mismatch in the Supabase response helper. The agent corrected the helper and obtained a passing frontend production build.
7. **Automated verification:** The agent wrote nine data-helper checks and nineteen embedded PostgreSQL checks. The database checks exercised the actual migration with modeled Supabase auth/roles, including anonymous denial, instructor access, invalid answer rejection, transaction rollback and duplicate prevention.
8. **Preview limitation:** A Vite server was started. The cloud browser failed to reach its localhost address; this is documented rather than treating browser QA as passed.
9. **Documentation and handoff:** The agent generated setup/deployment instructions, a revised TODO, this history, a development-summary draft and a checklist for real database evidence and final submission.

## Follow-up record for the student

After live setup, append your actual prompts, observed errors, fixes, test results, deployment URLs and dates here. Do not describe this summary as an exported Cursor conversation or claim live verification until performed.

## Connected-account setup

The user connected Supabase and GitHub, selected the listed Supabase organization, and authorized creation of the classroom-survey database. The agent created the project, inspected its empty schema, applied the migration, reviewed advisors, and verified table/function permissions on the live database. The user independently created and confirmed an instructor account and a private GitHub repository. The agent added that specific account to the instructor allowlist and prepared the source upload. Passwords were not shared with the agent. Production frontend hosting and live end-to-end browser verification remain pending.
