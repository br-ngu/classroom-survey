# Classroom Survey Web App — AI Development History

**Environment:** ChatGPT Work mode with an AI coding agent.  
**Format:** Markdown summary of actual interactions, not an exported Cursor transcript.  
**Repository:** https://github.com/br-ngu/classroom-survey  
**Application:** https://classroom-survey-6q4.pages.dev/

## 1. Requirements and implementation

I uploaded the assignment and the five specification files and asked the agent to complete the assignment. The agent reviewed the required frontend, database, authentication, QR, results, and deployment features. It generated a React/TypeScript/Vite application, Supabase integration, SQL migration, automated tests, and documentation. It also noted that the supplied TODO already contained completion marks without accompanying source code, so it created a separate implementation checklist.

The generated design included an instructor allowlist, immutable non-draft surveys, transactional draft saves and submissions, anonymous browser-token duplicate protection, and a database constraint allowing only one active survey.

## 2. Initial verification

The first production build exposed a TypeScript mismatch involving Supabase authentication response types. The agent corrected the response helper. Nine data-helper checks and nineteen embedded PostgreSQL checks passed. The latter exercised the actual migration with modeled Supabase authentication roles; they were not presented as real Supabase login tests. An attempted local browser preview could not be reached by the remote browser.

## 3. Connected services and database setup

I asked whether the agent could perform setup on my behalf, then connected GitHub and Supabase. The agent inspected the accessible accounts. I authorized creation of the classroom-survey Supabase project in my organization. The agent created the project, inspected the empty schema, applied the migration, reviewed advisors, and verified live database permissions.

I created and confirmed an instructor account privately in Supabase and created the GitHub repository. I supplied the repository URL. The agent allowlisted the specific instructor account and uploaded the source, excluding `.env`, dependencies, and build output. The initial GitHub Actions build/test workflow succeeded. No password was shared in the conversation.

## 4. Deployment guidance

I configured Cloudflare and shared screenshots when uncertain about its interface. The first setup was a Worker deployment. The agent guided me to create a Pages deployment connected to the GitHub repository, using `npm run build`, output directory `dist`, and the public Supabase build variables. I supplied the resulting production URL.

## 5. Production configuration bug

The agent's browser observed that the deployed login page reported missing Supabase configuration. I replied that it worked for me and supplied a homepage screenshot. The agent rechecked the login page, where the warning remained. I then supplied a screenshot showing that I had entered the build variables correctly.

That evidence led the agent to inspect its code rather than continue assuming configuration entry was the problem. It found an alias-based `import.meta` access that prevented Vite's environment substitution, changed it to direct `import.meta.env` access, rebuilt, checked the generated assets for the public project settings, and pushed a corrective commit. I subsequently confirmed that the application worked.

## 6. Manual evidence and final documents

I supplied screenshots of the dashboard, database schema, results, editor, and stored choices. They show a closed Recursion Concept Check, a duplicated draft, both question types, and one recorded response with displayed counts and percentages. The agent explained that schema and UI screenshots should be supplemented by actual survey/question and response/answer database records.

A live query later confirmed that the closed survey had two questions, one response, and two answers, while its duplicated draft had two questions and zero responses. I asked what to submit and requested written deliverables. The agent prepared the development summary, this history, and a submission guide based on the observed work.

## Verification boundaries

This record distinguishes generated implementation, automated checks, user-reported success, screenshots, and direct database verification. It does not claim that all manual checks, real-device QR scanning, spreadsheet compatibility, 200 simultaneous students, or the page-load target have been verified. The development report's suggested personal reflection should be reviewed and rewritten to match my own understanding before submission.
