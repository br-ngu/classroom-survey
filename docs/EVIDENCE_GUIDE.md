# Database evidence guide

No evidence screenshots have been supplied or fabricated. Capture these after configuring the live service. Use only synthetic classroom answers. Hide credentials, account details, private student information and anonymous browser tokens.

1. **01-database-tables.png:** Supabase Table Editor showing surveys, questions, choices, responses and answers. The instructor allowlist is an additional administrative table.
2. **02-survey-and-questions.png:** Show one test survey and its associated questions with matching survey IDs. A SQL Editor join is useful:

```sql
select s.id as survey_id,s.title,q.position,q.question_text,q.question_type,c.choice_text
from public.surveys s
join public.questions q on q.survey_id=s.id
join public.choices c on c.question_id=q.id
order by s.created_at desc,q.position,c.position;
```

3. **03-stored-responses.png:** Show persisted response/answer relationships after an anonymous browser submission, excluding browser tokens:

```sql
select r.id as response_id,r.survey_id,r.submitted_at,q.question_text,c.choice_text
from public.responses r
join public.answers a on a.response_id=r.id
join public.questions q on q.id=a.question_id
join public.choices c on c.id=a.choice_id
order by r.submitted_at desc,q.position;
```

4. **04-application-results.png:** Instructor results page showing the same test survey, counts and percentages. Reload before capturing to demonstrate retrieval from storage.

An administrator's SQL Editor bypasses RLS. Its screenshots prove data exists, not that public access is secure. Separately verify anonymous restrictions through the app/API and record outcomes. Store screenshots in `docs/evidence/`, review for sensitive content and commit them before submitting.
