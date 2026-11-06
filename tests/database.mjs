import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const pg = new PGlite();
let passed = 0;
const test = async (name, fn) => {
  await fn();
  console.log(`PASS ${name}`);
  passed++;
};
const query = async (sql, params = []) => (await pg.query(sql, params)).rows;
const instructor = "11111111-1111-4111-8111-111111111111";
await pg.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
);
await pg.exec(
  await readFile(
    new URL("../supabase/migrations/001_initial.sql", import.meta.url),
    "utf8",
  ),
);
await pg.exec(
  `insert into auth.users values('${instructor}');insert into public.instructors values('${instructor}');`,
);
await query(`select set_config('request.jwt.claim.sub',$1,false)`, [
  instructor,
]);
const questions = [
  {
    question_text: "Choose one",
    question_type: "multiple_choice",
    choices: [{ choice_text: "A" }, { choice_text: "B" }],
  },
  {
    question_text: "A recursive function needs a stopping condition.",
    question_type: "true_false",
    choices: [{ choice_text: "True" }, { choice_text: "False" }],
  },
];
async function save(title = "Survey") {
  return (
    await query("select public.save_survey(null,$1,$2,$3::jsonb) id", [
      title,
      "Test",
      JSON.stringify(questions),
    ])
  )[0].id;
}
let sid, other, payload;
await test("migration creates five related survey tables", async () => {
  const rows = await query(
    "select tablename from pg_tables where schemaname='public'",
  );
  for (const name of [
    "surveys",
    "questions",
    "choices",
    "responses",
    "answers",
  ])
    assert(rows.some((r) => r.tablename === name));
});
await test("transactional save creates questions and choices", async () => {
  sid = await save();
  assert.equal(
    (await query("select * from public.questions where survey_id=$1", [sid]))
      .length,
    2,
  );
  assert.equal((await query("select * from public.choices")).length, 4);
});
await test("invalid save rolls back all partial inserts", async () => {
  const before = (await query("select count(*)::int n from public.surveys"))[0]
    .n;
  await assert.rejects(
    query("select public.save_survey(null,'Bad','',$1::jsonb)", [
      JSON.stringify([{ ...questions[0], choices: [{ choice_text: "only" }] }]),
    ]),
    /INVALID_CHOICES/,
  );
  assert.equal(
    (await query("select count(*)::int n from public.surveys"))[0].n,
    before,
  );
});
await test("activation closes previous active survey", async () => {
  other = await save("Other");
  await query("select public.activate_survey($1)", [other]);
  await query("select public.activate_survey($1)", [sid]);
  assert.equal(
    (
      await query(
        "select count(*)::int n from public.surveys where status='active'",
      )
    )[0].n,
    1,
  );
  assert.equal(
    (await query("select status from public.surveys where id=$1", [other]))[0]
      .status,
    "closed",
  );
});
await test("active survey editing is rejected", () =>
  assert.rejects(
    query("select public.save_survey($1,'Changed','',$2::jsonb)", [
      sid,
      JSON.stringify(questions),
    ]),
    /DRAFT_ONLY/,
  ));
const qs = await query(
  "select * from public.questions where survey_id=$1 order by position",
  [sid],
);
payload = [];
for (const q of qs) {
  const c = (
    await query(
      "select * from public.choices where question_id=$1 order by position",
      [q.id],
    )
  )[0];
  payload.push({ question_id: q.id, choice_id: c.id });
}
await query("select set_config('request.jwt.claim.sub','',false)");
await pg.exec("set role anon");
await test("anonymous readers see only active survey and its questions", async () => {
  assert.equal((await query("select * from public.surveys")).length, 1);
  assert.equal((await query("select * from public.questions")).length, 2);
  assert.equal((await query("select * from public.choices")).length, 4);
});
await test("anonymous results access is denied", () =>
  assert.rejects(query("select * from public.responses"), /permission denied/));
await test("anonymous direct writes are denied", () =>
  assert.rejects(
    query("insert into public.surveys(title) values('Attack')"),
    /permission denied/,
  ));
await test("anonymous instructor RPC is denied", () =>
  assert.rejects(
    query("select public.activate_survey($1)", [sid]),
    /permission denied/,
  ));
const submit = (token, answers = payload) =>
  query("select public.submit_survey_response($1,$2,$3::jsonb) id", [
    sid,
    token,
    JSON.stringify(answers),
  ]);
await test("anonymous submission persists atomically", async () =>
  assert((await submit("browser-token-0000001"))[0].id));
await test("duplicate browser token is rejected", () =>
  assert.rejects(submit("browser-token-0000001"), /DUPLICATE_RESPONSE/));
await test("missing answer is rejected", () =>
  assert.rejects(
    submit("browser-token-0000002", payload.slice(0, 1)),
    /MISSING_REQUIRED_ANSWER/,
  ));
await test("repeated question is rejected", () =>
  assert.rejects(
    submit("browser-token-0000002", [payload[0], payload[0]]),
    /MISSING_REQUIRED_ANSWER/,
  ));
await test("choice belonging to another question is rejected", () =>
  assert.rejects(
    submit("browser-token-0000002", [
      { ...payload[0], choice_id: payload[1].choice_id },
      payload[1],
    ]),
    /INVALID_CHOICE/,
  ));
await pg.exec("reset role");
await query(`select set_config('request.jwt.claim.sub',$1,false)`, [
  instructor,
]);
await pg.exec("set role authenticated");
await test("approved instructor sees persistent response and answers", async () => {
  assert.equal((await query("select * from public.responses")).length, 1);
  assert.equal((await query("select * from public.answers")).length, 2);
});
await test("close prevents subsequent anonymous submissions", async () => {
  await query("select public.close_survey($1)", [sid]);
  await pg.exec("reset role");
  await query("select set_config('request.jwt.claim.sub','',false)");
  await pg.exec("set role anon");
  await assert.rejects(submit("browser-token-0000003"), /SURVEY_NOT_ACTIVE/);
  assert.equal((await query("select * from public.surveys")).length, 0);
});
await pg.exec("reset role");
await query(`select set_config('request.jwt.claim.sub',$1,false)`, [
  "22222222-2222-4222-8222-222222222222",
]);
await pg.exec("set role authenticated");
await test("authenticated non-instructor cannot read historical data", async () => {
  assert.equal((await query("select * from public.surveys")).length, 0);
  assert.equal((await query("select * from public.responses")).length, 0);
  assert.equal((await query("select * from public.answers")).length, 0);
});
await test("authenticated non-instructor cannot mutate surveys", () =>
  assert.rejects(
    query("select public.manage_survey($1,'delete')", [sid]),
    /AUTH_REQUIRED/,
  ));
await pg.exec("reset role");
await query(`select set_config('request.jwt.claim.sub',$1,false)`, [
  instructor,
]);
await pg.exec("set role authenticated");
await test("archive preserves data; delete cascades", async () => {
  await query("select public.manage_survey($1,'archive')", [sid]);
  assert.equal((await query("select * from public.responses")).length, 1);
  await query("select public.manage_survey($1,'delete')", [sid]);
  assert.equal((await query("select * from public.responses")).length, 0);
  assert.equal((await query("select * from public.answers")).length, 0);
  assert.equal(
    (await query("select * from public.questions where survey_id=$1", [sid]))
      .length,
    0,
  );
});
await pg.close();
console.log(
  `${passed} PostgreSQL integration checks passed (PGlite; mocked Supabase auth identity).`,
);
