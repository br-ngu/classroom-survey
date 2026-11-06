# Classroom Survey Web App — Development Summary

**Course:** CSE 4095 — Agentic Programming  
**Repository:** https://github.com/br-ngu/classroom-survey  
**Deployed application:** https://classroom-survey-6q4.pages.dev/

## How the specifications guided development

I provided ChatGPT's coding agent with the assignment and the five supplied specification documents. The overall specification established the application's scope; DATABASE.md defined the relationships; API.md described data access; UI.md guided the screens and routes; and TODO.md provided the implementation roadmap. The resulting application separates the instructor workspace from the anonymous student experience and supports multiple-choice and true/false questions.

The agent generated the React and TypeScript frontend, Vite configuration, responsive styles, Supabase integration, database migration, automated checks, and initial documentation. I connected my GitHub and Supabase accounts, created the instructor login and repository, configured Cloudflare Pages, and supplied screenshots and feedback during testing. The agent performed database setup and source uploads through the authorized integrations. This was AI-assisted implementation, rather than code I wrote entirely by hand.

## Database setup and security

The backend uses Supabase's hosted PostgreSQL database. After I authorized the project, the agent created it and applied the SQL migration. The five required tables are `surveys`, `questions`, `choices`, `responses`, and `answers`. UUID primary keys identify records, and foreign keys connect questions to surveys, choices to questions, responses to surveys, and answers to responses and selected choices.

An additional `instructors` table controls instructor authorization. I created and confirmed my authentication account, and the agent added it to that allowlist. Row Level Security is enabled on all six tables. Anonymous students can read active survey content, but cannot read stored responses or answers or directly modify survey content. Instructor operations check allowlist membership. The frontend uses a public publishable key; no instructor password or service-role key was committed to GitHub.

## Frontend and backend communication

The React frontend uses the Supabase JavaScript client. Supabase Auth handles instructor login and sessions. Read queries retrieve survey content and instructor-only results. Database RPC functions handle draft saves, activation, closing, archiving/deletion, and student submissions.

A submission sends the survey ID, an anonymous browser token, and question/choice IDs. The database checks that the survey is active, every question is answered exactly once, and each choice belongs to its question. The response and answers are inserted in one transaction. A unique constraint on survey ID and browser token provides accidental duplicate protection. A partial unique index enforces one active survey. Results show counts, percentages, charts, and CSV export; the presentation page generates a QR code using the deployed site's URL.

## Debugging and verification

One significant problem appeared after deployment. Although I had entered the Supabase environment variables in Cloudflare, the login page still reported that Supabase was not configured. I shared a screenshot showing the variables. The agent identified that its code accessed `import.meta` through an alias, preventing Vite from substituting the environment settings during the production build. It changed the code to use `import.meta.env` directly, verified that the built assets contained the expected public configuration, and pushed the fix. After redeployment, I confirmed that the application worked.

Automated verification included nine data-helper checks and nineteen embedded PostgreSQL checks covering validation, CSV handling, result calculations, permissions, transactions, lifecycle rules, and duplicate rejection. The initial GitHub Actions build/test workflow completed successfully. Live permission queries also confirmed that anonymous users cannot read responses or answers or activate surveys.

My screenshots show a closed “Recursion Concept Check,” its results, its multiple-choice and true/false questions, and a duplicated draft. A later live database query verified two questions, one response, and two answers for the closed survey. The duplicated draft contained two questions and no responses. I also inspected the schema and saved choice records in Supabase. These observations demonstrate stored application data; they do not establish 200-user concurrency, load-time targets, or completion of every manual test.

## Deployment and learning reflection

The source is stored in my GitHub repository, and I deployed the frontend with Cloudflare Pages using `npm run build` and the `dist` output directory. Supabase hosts authentication and persistent database storage separately. Cloudflare's build configuration supplies the public Supabase URL and key. Instructor test credentials will be shared privately with the grader, and the private repository requires grader access.

**Suggested personal reflection — review and revise before submitting:** This project helped me understand how a frontend, authentication service, and relational database work together. Foreign keys maintain relationships, while RLS and database functions enforce permissions beyond what the interface displays. Transactions prevent partially saved submissions. The deployment bug also showed why a successful build does not prove that production configuration is correct. AI accelerated implementation, but reviewing behavior, supplying evidence, and testing the deployed application remained necessary.
