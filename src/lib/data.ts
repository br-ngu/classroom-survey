/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";
export type Choice = { id: string; choice_text: string; position: number };
export type Question = {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  position: number;
  choices: Choice[];
};
export type Survey = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "closed" | "archived";
  public_slug: string | null;
  created_at: string;
  questions: Question[];
};
export type ResponseRow = {
  id: string;
  submitted_at: string;
  answers: { question_id: string; choice_id: string }[];
};
const env = import.meta.env;
export const configured = Boolean(
  env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_ANON_KEY,
);
export const db = createClient(
  env?.VITE_SUPABASE_URL || "https://unconfigured.supabase.co",
  env?.VITE_SUPABASE_ANON_KEY || "unconfigured",
  configured
    ? {}
    : {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
);
export function check<T extends { data: unknown; error: unknown }>({
  data,
  error,
}: T): T["data"] {
  if (error) throw error;
  return data;
}
export const normalize = (s: Survey): Survey => ({
  ...s,
  questions: (s.questions || [])
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      ...q,
      choices: q.choices.sort((a, b) => a.position - b.position),
    })),
});
export async function getSurvey(id: string, slug = false) {
  const data = check(
    await db
      .from("surveys")
      .select("*,questions(*,choices(*))")
      .eq(slug ? "public_slug" : "id", id)
      .maybeSingle(),
  );
  if (!data) throw Error("Survey not found or no longer accepting responses.");
  return normalize(data as Survey);
}
export async function getResponses(id: string) {
  return check(
    await db
      .from("responses")
      .select("id,submitted_at,answers(question_id,choice_id)")
      .eq("survey_id", id)
      .order("submitted_at"),
  ) as ResponseRow[];
}
export async function saveSurvey(s: Survey) {
  return check(
    await db.rpc("save_survey", {
      p_id: s.id || null,
      p_title: s.title,
      p_description: s.description,
      p_questions: s.questions,
    }),
  ) as string;
}
export function friendly(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";
  const known: Record<string, string> = {
    DUPLICATE_RESPONSE: "You have already submitted a response to this survey.",
    SURVEY_NOT_ACTIVE: "This survey is no longer accepting responses.",
    INVALID_QUESTION: "The survey changed. Reload and try again.",
    INVALID_CHOICE: "An answer is invalid. Reload and try again.",
    MISSING_REQUIRED_ANSWER: "Please answer every question.",
    AUTH_REQUIRED: "An approved instructor account is required.",
    DRAFT_ONLY:
      "Only draft surveys can be edited or activated. Duplicate this survey to start again.",
    CLOSE_FIRST: "Close the survey before archiving or deleting it.",
  };
  for (const [code, text] of Object.entries(known))
    if (message.includes(code)) return text;
  if (/fetch|network/i.test(message))
    return "Unable to connect. Check your connection and try again.";
  if (message === "Invalid login credentials")
    return "Email or password is incorrect.";
  return "The request could not be completed. Please try again.";
}
export function csvCell(value: string) {
  return (
    '"' +
    (/^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll(
      '"',
      '""',
    ) +
    '"'
  );
}
export function toCSV(s: Survey, rows: ResponseRow[]) {
  return [
    [
      "survey_id",
      "survey_title",
      "response_id",
      "submitted_at",
      ...s.questions.map((q) => q.question_text),
    ],
    ...rows.map((r) => [
      s.id,
      s.title,
      r.id,
      r.submitted_at,
      ...s.questions.map(
        (q) =>
          q.choices.find(
            (c) =>
              c.id === r.answers.find((a) => a.question_id === q.id)?.choice_id,
          )?.choice_text || "",
      ),
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
export function download(
  name: string,
  contents: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function totals(q: Question, rows: ResponseRow[]) {
  return q.choices.map((c) => {
    const count = rows.filter((r) =>
      r.answers.some((a) => a.question_id === q.id && a.choice_id === c.id),
    ).length;
    return {
      name: c.choice_text,
      count,
      percentage: rows.length ? (100 * count) / rows.length : 0,
    };
  });
}
export function validate(s: Survey) {
  if (!s.title.trim() || s.title.length > 200)
    return "Enter a survey title of 1–200 characters.";
  if (!s.questions.length) return "Add at least one question.";
  for (let i = 0; i < s.questions.length; i++) {
    const q = s.questions[i];
    if (!q.question_text.trim())
      return `Question ${i + 1}: enter question text.`;
    if (q.choices.length < 2 || q.choices.some((c) => !c.choice_text.trim()))
      return `Question ${i + 1}: add at least two nonempty choices.`;
  }
  return "";
}
