import assert from "node:assert/strict";
import {
  csvCell,
  toCSV,
  totals,
  validate,
  normalize,
} from "../src/lib/data.ts";
const s = {
  id: "s1",
  title: 'Test, "survey"',
  description: "",
  status: "draft",
  public_slug: null,
  created_at: "",
  questions: [
    {
      id: "q1",
      question_text: "Pick one",
      question_type: "multiple_choice",
      position: 1,
      choices: [
        { id: "c1", choice_text: "First", position: 1 },
        { id: "c2", choice_text: '=HYPERLINK("bad")', position: 2 },
      ],
    },
  ],
};
let passed = 0;
function test(name, fn) {
  fn();
  console.log(`PASS ${name}`);
  passed++;
}
test("zero percentages without responses", () =>
  assert.deepEqual(
    totals(s.questions[0], []).map((x) => x.percentage),
    [0, 0],
  ));
test("counts and percentages use all responses", () =>
  assert.deepEqual(
    totals(s.questions[0], [
      { answers: [{ question_id: "q1", choice_id: "c1" }] },
      { answers: [{ question_id: "q1", choice_id: "c2" }] },
    ]).map((x) => [x.count, x.percentage]),
    [
      [1, 50],
      [1, 50],
    ],
  ));
test("CSV quotes multiline values and quotes", () =>
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"'));
test("CSV neutralizes spreadsheet formulas", () =>
  assert.equal(csvCell(" =1+1"), '"\' =1+1"'));
test("CSV includes metadata and one response per row", () => {
  const csv = toCSV(s, [
    {
      id: "r1",
      submitted_at: "2026-11-05",
      answers: [{ question_id: "q1", choice_id: "c2" }],
    },
  ]);
  assert.equal(csv.split("\r\n").length, 2);
  assert(csv.includes("survey_title"));
  assert(csv.includes("'=HYPERLINK"));
  assert(csv.includes("2026-11-05"));
});
test("valid draft accepted", () => assert.equal(validate(s), ""));
test("empty survey rejected", () =>
  assert.match(validate({ ...s, questions: [] }), /at least one/));
test("empty choices rejected", () =>
  assert.match(
    validate({
      ...s,
      questions: [
        {
          ...s.questions[0],
          choices: [{ id: "c", choice_text: "", position: 1 }],
        },
      ],
    }),
    /Question 1/,
  ));
test("stored choices sorted by position", () =>
  assert.equal(
    normalize({
      ...s,
      questions: [
        { ...s.questions[0], choices: [...s.questions[0].choices].reverse() },
      ],
    }).questions[0].choices[0].id,
    "c1",
  ));
console.log(`${passed} data-helper checks passed.`);
