-- Single classroom, explicit instructor allowlist; run as database administrator.
create table public.instructors (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.instructors enable row level security;
create function public.is_instructor() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.instructors where user_id=auth.uid()) $$;
create table public.surveys (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 200), description text not null default '',
 status text not null default 'draft' check(status in ('draft','active','closed','archived')), public_slug text unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index only_one_active_survey on public.surveys(status) where status='active';
create table public.questions(id uuid primary key default gen_random_uuid(),survey_id uuid not null references public.surveys on delete cascade,question_text text not null check(length(trim(question_text))>0),question_type text not null check(question_type in ('multiple_choice','true_false')),position integer not null check(position>0),unique(survey_id,position));
create table public.choices(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions on delete cascade,choice_text text not null check(length(trim(choice_text))>0),position integer not null check(position>0),unique(question_id,position));
create table public.responses(id uuid primary key default gen_random_uuid(),survey_id uuid not null references public.surveys on delete cascade,anonymous_token text not null check(length(anonymous_token) between 16 and 200),submitted_at timestamptz not null default now(),unique(survey_id,anonymous_token));
create table public.answers(id uuid primary key default gen_random_uuid(),response_id uuid not null references public.responses on delete cascade,question_id uuid not null references public.questions on delete cascade,choice_id uuid not null references public.choices on delete cascade,text_answer text,unique(response_id,question_id));
create index responses_survey_idx on public.responses(survey_id);
create index answers_response_idx on public.answers(response_id);
create index answers_question_idx on public.answers(question_id);
create index answers_choice_idx on public.answers(choice_id);
create function public.touch_survey() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger touch_survey before update on public.surveys for each row execute function public.touch_survey();
alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;
create policy instructor_surveys on public.surveys for select to authenticated using(public.is_instructor());
create policy instructor_questions on public.questions for select to authenticated using(public.is_instructor());
create policy instructor_choices on public.choices for select to authenticated using(public.is_instructor());
create policy instructor_responses on public.responses for select to authenticated using(public.is_instructor());
create policy instructor_answers on public.answers for select to authenticated using(public.is_instructor());
create policy public_active on public.surveys for select to anon,authenticated using(status='active');
create policy public_questions on public.questions for select to anon,authenticated using(exists(select 1 from public.surveys s where s.id=survey_id and s.status='active'));
create policy public_choices on public.choices for select to anon,authenticated using(exists(select 1 from public.questions q join public.surveys s on s.id=q.survey_id where q.id=question_id and s.status='active'));
-- All writes go through restricted, transactional functions, including instructor writes.
revoke all on public.instructors,public.surveys,public.questions,public.choices,public.responses,public.answers from anon,authenticated;
grant select on public.surveys,public.questions,public.choices to anon,authenticated;
grant select on public.responses,public.answers to authenticated;

create function public.save_survey(p_id uuid,p_title text,p_description text,p_questions jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; q jsonb; c jsonb; qid uuid; qi int:=0; ci int; st text;
begin
 if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 100 then raise exception 'INVALID_QUESTIONS'; end if;
 if p_id is null then insert into public.surveys(title,description) values(trim(p_title),coalesce(p_description,'')) returning id into sid;
 else
  select status into st from public.surveys where id=p_id for update;
  if st is distinct from 'draft' then raise exception 'DRAFT_ONLY'; end if;
  sid:=p_id;
  update public.surveys set title=trim(p_title),description=coalesce(p_description,'') where id=sid;
  delete from public.questions where survey_id=sid;
 end if;
 for q in select value from jsonb_array_elements(p_questions) loop
  qi:=qi+1;
  if jsonb_typeof(q->'choices') is distinct from 'array' or jsonb_array_length(q->'choices') not between 2 and 20 then raise exception 'INVALID_CHOICES'; end if;
  if q->>'question_type'='true_false' and (jsonb_array_length(q->'choices')<>2 or q->'choices'->0->>'choice_text' is distinct from 'True' or q->'choices'->1->>'choice_text' is distinct from 'False') then raise exception 'INVALID_TRUE_FALSE'; end if;
  insert into public.questions(survey_id,question_text,question_type,position) values(sid,trim(q->>'question_text'),q->>'question_type',qi) returning id into qid;
  ci:=0;
  for c in select value from jsonb_array_elements(q->'choices') loop
   ci:=ci+1;
   insert into public.choices(question_id,choice_text,position) values(qid,trim(c->>'choice_text'),ci);
  end loop;
 end loop;
 return sid;
end $$;
create function public.activate_survey(p_survey_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare st text;
begin
 if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(4095,1);
 select status into st from public.surveys where id=p_survey_id for update;
 if st is distinct from 'draft' then raise exception 'DRAFT_ONLY'; end if;
 if not exists(select 1 from public.questions where survey_id=p_survey_id) then raise exception 'INVALID_QUESTIONS'; end if;
 update public.surveys set status='closed' where status='active';
 update public.surveys set status='active',public_slug=coalesce(public_slug,replace(gen_random_uuid()::text,'-','')) where id=p_survey_id;
 return p_survey_id;
end $$;
create function public.close_survey(p_survey_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(4095,1);
 update public.surveys set status='closed' where id=p_survey_id and status='active';
 if not found then raise exception 'SURVEY_NOT_ACTIVE'; end if;
end $$;
create function public.manage_survey(p_survey_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(4095,1);
 perform 1 from public.surveys where id=p_survey_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from public.surveys where id=p_survey_id and status='active') then raise exception 'CLOSE_FIRST'; end if;
 if p_action='delete' then delete from public.surveys where id=p_survey_id;
 elsif p_action='archive' then update public.surveys set status='archived' where id=p_survey_id;
 else raise exception 'INVALID_ACTION'; end if;
end $$;
create function public.submit_survey_response(p_survey_id uuid,p_anonymous_token text,p_answers jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; a jsonb; st text; n int;
begin
 -- Shared lock allows simultaneous submissions, but serializes against close/activation.
 select status into st from public.surveys where id=p_survey_id for share;
 if st is distinct from 'active' then raise exception 'SURVEY_NOT_ACTIVE'; end if;
 if p_anonymous_token is null or length(p_anonymous_token) not between 16 and 200 then raise exception 'INVALID_TOKEN'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'MISSING_REQUIRED_ANSWER'; end if;
 select count(*) into n from public.questions where survey_id=p_survey_id;
 if jsonb_array_length(p_answers)<>n or (select count(distinct value->>'question_id') from jsonb_array_elements(p_answers))<>n then raise exception 'MISSING_REQUIRED_ANSWER'; end if;
 for a in select value from jsonb_array_elements(p_answers) loop
  if not exists(select 1 from public.questions where id=(a->>'question_id')::uuid and survey_id=p_survey_id) then raise exception 'INVALID_QUESTION'; end if;
  if not exists(select 1 from public.choices where id=(a->>'choice_id')::uuid and question_id=(a->>'question_id')::uuid) then raise exception 'INVALID_CHOICE'; end if;
 end loop;
 insert into public.responses(survey_id,anonymous_token) values(p_survey_id,p_anonymous_token) returning id into rid;
 insert into public.answers(response_id,question_id,choice_id) select rid,(value->>'question_id')::uuid,(value->>'choice_id')::uuid from jsonb_array_elements(p_answers);
 return rid;
exception when unique_violation then raise exception 'DUPLICATE_RESPONSE';
end $$;
-- Functions default to executable by PUBLIC in PostgreSQL: explicitly revoke this.
revoke execute on function public.is_instructor(),public.touch_survey(),public.save_survey(uuid,text,text,jsonb),public.activate_survey(uuid),public.close_survey(uuid),public.manage_survey(uuid,text),public.submit_survey_response(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.is_instructor() to anon,authenticated;
grant execute on function public.save_survey(uuid,text,text,jsonb),public.activate_survey(uuid),public.close_survey(uuid),public.manage_survey(uuid,text) to authenticated;
grant execute on function public.submit_survey_response(uuid,text,jsonb) to anon,authenticated;
