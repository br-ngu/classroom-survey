import React, { useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Plus,
  ArrowLeft,
  BookOpen,
  LogOut,
  Copy,
  Archive,
  Trash2,
  BarChart3,
  QrCode,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
const ResultsChart = React.lazy(() => import("./components/ResultsChart"));

import {
  db,
  configured,
  check,
  getSurvey,
  getResponses,
  saveSurvey,
  friendly,
  validate,
  toCSV,
  download,
  totals,
  type Survey,
  type Question,
  type ResponseRow,
} from "./lib/data";
import "./style.css";
const Auth = createContext<{ session: Session | null; ready: boolean }>({
  session: null,
  ready: false,
});
function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!configured);
  useEffect(() => {
    if (!configured) return;
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <Auth.Provider value={{ session, ready }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/s/:slug" element={<Student />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/surveys/new"
            element={
              <Protected>
                <Editor />
              </Protected>
            }
          />
          <Route
            path="/surveys/:id/edit"
            element={
              <Protected>
                <Editor />
              </Protected>
            }
          />
          <Route
            path="/surveys/:id/results"
            element={
              <Protected>
                <Results />
              </Protected>
            }
          />
          <Route
            path="/surveys/:id/present"
            element={
              <Protected>
                <Present />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <Shell>
                <h1>Page not found</h1>
                <Link to="/">Go home</Link>
              </Shell>
            }
          />
        </Routes>
      </BrowserRouter>
    </Auth.Provider>
  );
}
function Protected({ children }: { children: React.ReactNode }) {
  const { session, ready } = useContext(Auth);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!session) return;
    db.rpc("is_instructor").then(({ data, error }) =>
      setAllowed(!error && data === true),
    );
  }, [session]);
  if (!ready) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (allowed === null) return <Loading />;
  if (!allowed)
    return (
      <Shell>
        <h1>Instructor access required</h1>
        <p>
          Ask your project administrator to add this account to the instructor
          allowlist.
        </p>
        <button onClick={() => db.auth.signOut()}>Sign out</button>
      </Shell>
    );
  return children;
}
function Shell({ children }: { children: React.ReactNode }) {
  const { session } = useContext(Auth);
  return (
    <>
      <header>
        <Link className="brand" to="/">
          <span className="brand-icon">
            <BookOpen size={20} />
          </span>
          classroom<span className="brand-dot">.</span>
        </Link>
        <div className="header-right">
          <span className="muted">{session?.user.email}</span>
          {session ? (
            <button className="quiet" onClick={() => db.auth.signOut()}>
              <LogOut size={16} /> Sign out
            </button>
          ) : (
            <Link to="/login">
              Instructor login <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
      <footer>
        Built for better classroom conversations.
        <span>CLASSROOM SURVEY · V1.0</span>
      </footer>
    </>
  );
}
function Landing() {
  return (
    <Shell>
      <section className="hero">
        <span className="eyebrow">A LITTLE CHECK-IN. A LOT OF INSIGHT.</span>
        <h1>
          Meet your class
          <br />
          where they <em>are.</em>
        </h1>
        <p>
          Turn a quick question into a clearer picture of understanding.
          <br />
          Create a survey, share a QR code, and hear from everyone.
        </p>
        <Link className="button primary" to="/dashboard">
          Open instructor workspace <ArrowUpRight size={18} />
        </Link>
        <div className="hero-notes">
          <span>
            <Check size={15} /> No student accounts
          </span>
          <span>
            <Check size={15} /> Anonymous responses
          </span>
        </div>
      </section>
      <section className="feature-grid">
        {[
          [
            "01",
            "Ask a good question",
            "Multiple choice or true / false. Prepare a quick check before class.",
          ],
          [
            "02",
            "Let everyone join",
            "One QR code. Any device. A simple, focused student experience.",
          ],
          [
            "03",
            "See the whole picture",
            "View response counts, compare answers, and export your results.",
          ],
        ].map(([n, title, text]) => (
          <article key={n}>
            <span className="number">{n}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      {!configured && (
        <div className="notice">
          Setup required: configure Supabase using the included README before
          logging in. No sample data is presented as real survey results.
        </div>
      )}
    </Shell>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      Loading classroom…
    </div>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
function Login() {
  const { session } = useContext(Auth);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (session) return <Navigate to="/dashboard" replace />;
  return (
    <Shell>
      <div className="auth-card">
        <span className="eyebrow">INSTRUCTOR WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p className="muted">Make room for every voice in your classroom.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              check(await db.auth.signInWithPassword({ email, password }));
            } catch (e) {
              setError(friendly(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ErrorBox message={error} />
          {!configured && (
            <ErrorBox message="Supabase has not been configured. Follow README.md to connect your project." />
          )}
          <button className="primary full" disabled={busy || !configured}>
            {busy ? "Signing in…" : "Log in"} <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="small muted">
          Students join through the survey link. No account needed.
        </p>
      </div>
    </Shell>
  );
}
function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [date, setDate] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function load() {
    try {
      setSurveys(
        check(
          await db
            .from("surveys")
            .select("*")
            .order("created_at", { ascending: false }),
        ) as Survey[],
      );
    } catch (e) {
      setError(friendly(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(s: Survey, kind: string) {
    if (
      ["delete", "archive", "close"].includes(kind) &&
      !confirm(
        `${kind[0].toUpperCase() + kind.slice(1)} “${s.title}”? ${kind === "delete" ? "This permanently deletes all questions and responses. Archive instead to preserve results." : ""}`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (kind === "duplicate") {
        const copy = await getSurvey(s.id);
        const id = await saveSurvey({
          ...copy,
          id: "",
          title: `Copy of ${copy.title}`.slice(0, 200),
        });
        nav(`/surveys/${id}/edit`);
        return;
      }
      check(
        await db.rpc(
          kind === "activate"
            ? "activate_survey"
            : kind === "close"
              ? "close_survey"
              : "manage_survey",
          {
            p_survey_id: s.id,
            ...(["archive", "delete"].includes(kind) ? { p_action: kind } : {}),
          },
        ),
      );
      await load();
      if (kind === "activate") nav(`/surveys/${s.id}/present`);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  const filtered = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || s.status === status) &&
      (!date || s.created_at.slice(0, 10) >= date),
  );
  return (
    <Shell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR TEACHING WORKSPACE</span>
          <h1>Surveys</h1>
          <p className="muted">Small questions. Meaningful understanding.</p>
        </div>
        <Link className="button primary" to="/surveys/new">
          <Plus size={18} /> New survey
        </Link>
      </div>
      <div className="stats">
        <div>
          <strong>{surveys.length}</strong>
          <span>Total surveys</span>
        </div>
        <div>
          <strong>
            {surveys.filter((s) => s.status === "active").length}
            <i className="live-dot" />
          </strong>
          <span>Active now</span>
        </div>
        <div>
          <strong>{surveys.filter((s) => s.status === "draft").length}</strong>
          <span>Ready to prepare</span>
        </div>
      </div>
      <div className="filters">
        <label className="search">
          Search surveys
          <input
            placeholder="Find a survey by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["all", "draft", "active", "closed", "archived"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Created on or after
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <BookOpen size={32} />
          <h2>
            {surveys.length
              ? "No surveys match your search."
              : "Your next conversation starts here."}
          </h2>
          <p>Create a survey to discover what your students understand.</p>
          <Link to="/surveys/new" className="button">
            Create a survey <Plus size={16} />
          </Link>
        </div>
      ) : (
        <div className="survey-list">
          {filtered.map((s) => (
            <article key={s.id} className="survey-row">
              <div>
                <span className={`badge ${s.status}`}>
                  {s.status === "active" && <i className="live-dot" />}
                  {s.status}
                </span>
                <h2>{s.title}</h2>
                <p className="muted">
                  {s.description || "No description"}{" "}
                  <span className="date">
                    · {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
              <div className="row-actions">
                {s.status === "draft" && (
                  <>
                    <Link className="button" to={`/surveys/${s.id}/edit`}>
                      Edit
                    </Link>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => action(s, "activate")}
                    >
                      Activate <ArrowUpRight size={16} />
                    </button>
                  </>
                )}
                {s.status === "active" && (
                  <>
                    <Link className="button" to={`/surveys/${s.id}/present`}>
                      <QrCode size={16} /> Present
                    </Link>
                    <button disabled={busy} onClick={() => action(s, "close")}>
                      Close
                    </button>
                  </>
                )}
                <Link className="button quiet" to={`/surveys/${s.id}/results`}>
                  <BarChart3 size={17} /> Results
                </Link>
                <button
                  title="Duplicate survey"
                  aria-label={`Duplicate ${s.title}`}
                  disabled={busy}
                  onClick={() => action(s, "duplicate")}
                >
                  <Copy size={16} />
                </button>
                {s.status !== "active" && (
                  <>
                    <button
                      title="Archive survey"
                      aria-label={`Archive ${s.title}`}
                      disabled={busy || s.status === "archived"}
                      onClick={() => action(s, "archive")}
                    >
                      <Archive size={16} />
                    </button>
                    <button
                      className="danger quiet"
                      title="Delete survey"
                      aria-label={`Delete ${s.title}`}
                      disabled={busy}
                      onClick={() => action(s, "delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="small muted">
        One active survey at a time. Activating a new survey closes the previous
        one.
      </p>
    </Shell>
  );
}
const makeQuestion = (): Question => ({
  id: crypto.randomUUID(),
  question_text: "",
  question_type: "multiple_choice",
  position: 1,
  choices: [
    { id: crypto.randomUUID(), choice_text: "", position: 1 },
    { id: crypto.randomUUID(), choice_text: "", position: 2 },
  ],
});
const blank = (): Survey => ({
  id: "",
  title: "",
  description: "",
  status: "draft",
  public_slug: null,
  created_at: "",
  questions: [makeQuestion()],
});
function move<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  if (to < 0 || to >= arr.length) return copy;
  [copy[from], copy[to]] = [copy[to], copy[from]];
  return copy;
}
function Editor() {
  const { id } = useParams();
  const [s, setS] = useState<Survey>(blank),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (id)
      getSurvey(id)
        .then(setS)
        .catch((e) => setError(friendly(e)))
        .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function update(next: Survey) {
    setS(next);
    setDirty(true);
  }
  function qUpdate(i: number, q: Question) {
    update({
      ...s,
      questions: s.questions.map((old, j) => (i === j ? q : old)),
    });
  }
  async function save(activate = false) {
    const problem = validate(s);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const sid = await saveSurvey(s);
      setS({ ...s, id: sid });
      setDirty(false);
      if (activate) {
        check(await db.rpc("activate_survey", { p_survey_id: sid }));
        nav(`/surveys/${sid}/present`);
      } else nav("/dashboard");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  if (s.status !== "draft")
    return (
      <Shell>
        <h1>This survey is {s.status}.</h1>
        <p>
          Duplicate it from the dashboard to edit a fresh draft while preserving
          historical responses.
        </p>
        <Link to="/dashboard">Back to surveys</Link>
      </Shell>
    );
  return (
    <Shell>
      <button
        className="quiet"
        onClick={() => {
          if (!dirty || confirm("Discard unsaved changes?")) nav("/dashboard");
        }}
      >
        <ArrowLeft size={16} /> Back to surveys
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUILD A BETTER CHECK-IN</span>
          <h1>{id ? "Edit survey" : "New survey"}</h1>
        </div>
        <span className="badge draft">Draft</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <section className="panel">
            <label>
              Survey title
              <input
                maxLength={200}
                required
                placeholder="e.g. Recursion concept check"
                value={s.title}
                onChange={(e) => update({ ...s, title: e.target.value })}
              />
            </label>
            <label>
              Description <span className="muted">(optional)</span>
              <textarea
                value={s.description}
                placeholder="Let students know what this check-in is about."
                onChange={(e) => update({ ...s, description: e.target.value })}
              />
            </label>
          </section>
          {s.questions.map((q, i) => (
            <section className="panel" key={q.id}>
              <div className="question-top">
                <span className="eyebrow">
                  QUESTION {String(i + 1).padStart(2, "0")}
                </span>
                <div className="row-actions">
                  <button
                    type="button"
                    aria-label={`Move question ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() =>
                      update({ ...s, questions: move(s.questions, i, i - 1) })
                    }
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move question ${i + 1} down`}
                    disabled={i === s.questions.length - 1}
                    onClick={() =>
                      update({ ...s, questions: move(s.questions, i, i + 1) })
                    }
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="danger quiet"
                    aria-label={`Delete question ${i + 1}`}
                    onClick={() => {
                      if (confirm("Delete this question?"))
                        update({
                          ...s,
                          questions: s.questions.filter((_, j) => j !== i),
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <label>
                Question
                <input
                  required
                  value={q.question_text}
                  placeholder="What would you like to ask?"
                  onChange={(e) =>
                    qUpdate(i, { ...q, question_text: e.target.value })
                  }
                />
              </label>
              <label>
                Question type
                <select
                  value={q.question_type}
                  onChange={(e) => {
                    const type = e.target.value as Question["question_type"];
                    qUpdate(i, {
                      ...q,
                      question_type: type,
                      choices:
                        type === "true_false"
                          ? ["True", "False"].map((v, j) => ({
                              id: crypto.randomUUID(),
                              choice_text: v,
                              position: j + 1,
                            }))
                          : makeQuestion().choices,
                    });
                  }}
                >
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </label>
              <div className="choices">
                {q.choices.map((c, j) => (
                  <div className="choice-edit" key={c.id}>
                    <span className="choice-letter">
                      {String.fromCharCode(65 + j)}
                    </span>
                    <label className="grow">
                      <span className="sr-only">
                        Question {i + 1}, choice {j + 1}
                      </span>
                      <input
                        required
                        readOnly={q.question_type === "true_false"}
                        value={c.choice_text}
                        placeholder={`Answer choice ${j + 1}`}
                        onChange={(e) =>
                          qUpdate(i, {
                            ...q,
                            choices: q.choices.map((old, k) =>
                              k === j
                                ? { ...c, choice_text: e.target.value }
                                : old,
                            ),
                          })
                        }
                      />
                    </label>
                    {q.question_type === "multiple_choice" && (
                      <>
                        <button
                          type="button"
                          disabled={j === 0}
                          aria-label={`Move choice ${j + 1} up`}
                          onClick={() =>
                            qUpdate(i, {
                              ...q,
                              choices: move(q.choices, j, j - 1),
                            })
                          }
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={j === q.choices.length - 1}
                          aria-label={`Move choice ${j + 1} down`}
                          onClick={() =>
                            qUpdate(i, {
                              ...q,
                              choices: move(q.choices, j, j + 1),
                            })
                          }
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={q.choices.length <= 2}
                          aria-label={`Delete choice ${j + 1}`}
                          onClick={() => {
                            if (confirm("Delete this choice?"))
                              qUpdate(i, {
                                ...q,
                                choices: q.choices.filter((_, k) => k !== j),
                              });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {q.question_type === "multiple_choice" && (
                <button
                  type="button"
                  className="quiet"
                  disabled={q.choices.length >= 20}
                  onClick={() =>
                    qUpdate(i, {
                      ...q,
                      choices: [
                        ...q.choices,
                        {
                          id: crypto.randomUUID(),
                          choice_text: "",
                          position: q.choices.length + 1,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} /> Add choice
                </button>
              )}
            </section>
          ))}
          <button
            type="button"
            className="full add-question"
            disabled={s.questions.length >= 100}
            onClick={() =>
              update({ ...s, questions: [...s.questions, makeQuestion()] })
            }
          >
            <Plus size={18} /> Add question
          </button>
          <ErrorBox message={error} />
          <div className="save-bar">
            <span className="small muted">
              {s.questions.length} questions ·{" "}
              {dirty ? "Unsaved changes" : "Draft"}
            </span>
            <div className="row-actions">
              <button type="submit">{busy ? "Saving…" : "Save draft"}</button>
              <button
                type="button"
                className="primary"
                onClick={() => save(true)}
              >
                Save & activate <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </Shell>
  );
}
function useSurveyData() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null),
    [rows, setRows] = useState<ResponseRow[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  async function refresh() {
    if (!id) return;
    setBusy(true);
    try {
      const [s, r] = await Promise.all([getSurvey(id), getResponses(id)]);
      setSurvey(s);
      setRows(r);
      setError("");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);
  return { survey, rows, error, loading, busy, refresh };
}
function Results() {
  const { survey: s, rows, error, loading, busy, refresh } = useSurveyData();
  if (loading)
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  return (
    <Shell>
      <Link className="back" to="/dashboard">
        <ArrowLeft size={16} /> All surveys
      </Link>
      <ErrorBox message={error} />
      {s && (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">THE CLASSROOM PICTURE</span>
              <h1>{s.title}</h1>
              <p className="muted">
                {rows.length} responses · {s.status} · refreshes every 5 seconds
              </p>
            </div>
            <div className="row-actions">
              <button disabled={busy} onClick={refresh}>
                {busy ? "Refreshing…" : "Refresh"}
              </button>
              <button
                onClick={() => download(`survey-${s.id}.csv`, toCSV(s, rows))}
              >
                Export CSV
              </button>
              {s.status === "active" && (
                <Link
                  className="button primary"
                  to={`/surveys/${s.id}/present`}
                >
                  <QrCode size={16} /> Present QR
                </Link>
              )}
            </div>
          </div>
          {rows.length === 0 && (
            <div className="notice">
              No responses yet. Display the QR code so students can join.
            </div>
          )}
          {s.questions.map((q, i) => {
            const data = totals(q, rows);
            const answered = rows.filter((r) =>
              r.answers.some((a) => a.question_id === q.id),
            ).length;
            return (
              <section className="panel" key={q.id}>
                <span className="eyebrow">QUESTION {i + 1}</span>
                <h2>{q.question_text}</h2>
                <p className="small muted">
                  {answered} answered · {rows.length - answered} unanswered
                </p>
                <div className="chart" aria-hidden="true">
                  <React.Suspense fallback={<p>Loading chart…</p>}>
                    <ResultsChart data={data} />
                  </React.Suspense>
                </div>
                <table>
                  <caption className="sr-only">
                    Results for {q.question_text}
                  </caption>
                  <thead>
                    <tr>
                      <th>Answer</th>
                      <th>Count</th>
                      <th>Percent of responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, j) => (
                      <tr key={j}>
                        <td>{d.name}</td>
                        <td>{d.count}</td>
                        <td>{d.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </Shell>
  );
}
function Present() {
  const { survey: s, rows, error, loading, busy, refresh } = useSurveyData();
  const [qr, setQr] = useState(""),
    [actionError, setActionError] = useState(""),
    [closing, setClosing] = useState(false);
  const nav = useNavigate();
  const url = s?.public_slug ? `${location.origin}/s/${s.public_slug}` : "";
  useEffect(() => {
    if (url)
      import("qrcode")
        .then(({ default: QRCode }) =>
          QRCode.toDataURL(url, {
            width: 800,
            margin: 3,
            errorCorrectionLevel: "M",
          }),
        )
        .then(setQr)
        .catch(() =>
          setActionError("Could not generate QR code. Use the survey URL."),
        );
  }, [url]);
  if (loading) return <Loading />;
  return (
    <div className="present">
      <Link className="back" to="/dashboard">
        <ArrowLeft size={18} /> Back to surveys
      </Link>
      <ErrorBox message={error || actionError} />
      {s && (
        <>
          <span className={`badge ${s.status}`}>
            {s.status === "active" ? "Live · accepting responses" : s.status}
          </span>
          <h1>{s.title}</h1>
          <p>Scan. Think. Share your understanding.</p>
          {s.status === "active" ? (
            <>
              {qr && (
                <img
                  className="qr"
                  src={qr}
                  alt={`Scan QR code to answer ${s.title}`}
                />
              )}
              <a
                className="public-url"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {url}
              </a>
              <a
                className="button quiet"
                href={qr}
                download={`survey-${s.id}-qr.png`}
              >
                Download QR PNG
              </a>
            </>
          ) : (
            <div className="notice">
              This survey is no longer accepting responses.
            </div>
          )}
          <div className="response-counter">
            <strong>{rows.length}</strong>
            <span>responses received</span>
          </div>
          <div className="row-actions">
            <Link className="button" to={`/surveys/${s.id}/results`}>
              View results
            </Link>
            <button disabled={busy} onClick={refresh}>
              Refresh
            </button>
            {s.status === "active" && (
              <button
                className="primary"
                disabled={closing}
                onClick={async () => {
                  if (
                    !confirm(
                      "Close this survey? Students will no longer be able to submit.",
                    )
                  )
                    return;
                  setClosing(true);
                  try {
                    check(await db.rpc("close_survey", { p_survey_id: s.id }));
                    nav(`/surveys/${s.id}/results`);
                  } catch (e) {
                    setActionError(friendly(e));
                  } finally {
                    setClosing(false);
                  }
                }}
              >
                {closing ? "Closing…" : "Close survey"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function Student() {
  const { slug } = useParams();
  const [s, setS] = useState<Survey | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    if (!configured) {
      setError(
        "This survey service has not been configured. Please ask your instructor.",
      );
      setLoading(false);
      return;
    }
    getSurvey(slug!, true)
      .then(setS)
      .catch(() =>
        setError("Survey not found or no longer accepting responses."),
      )
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <Loading />;
  return (
    <main className="student">
      <span className="student-brand">
        <BookOpen size={20} /> classroom.
      </span>
      {done ? (
        <section className="thanks">
          <span className="success-icon">
            <Check size={36} />
          </span>
          <h1>Thank you!</h1>
          <p>Your response has been recorded.</p>
          <p className="muted">You can close this page and return to class.</p>
        </section>
      ) : (
        <>
          <ErrorBox message={error} />
          {s && (
            <>
              <span className="eyebrow">YOUR VOICE MATTERS</span>
              <h1>{s.title}</h1>
              <p className="muted">{s.description}</p>
              <p className="small muted">
                Anonymous · {s.questions.length} questions · All answers
                required
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    let token = localStorage.getItem("classroom-browser-token");
                    if (!token) {
                      token = crypto.randomUUID();
                      localStorage.setItem("classroom-browser-token", token);
                    }
                    check(
                      await db.rpc("submit_survey_response", {
                        p_survey_id: s.id,
                        p_anonymous_token: token,
                        p_answers: s.questions.map((q) => ({
                          question_id: q.id,
                          choice_id: answers[q.id],
                        })),
                      }),
                    );
                    setDone(true);
                  } catch (e) {
                    setError(friendly(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <fieldset disabled={busy}>
                  {s.questions.map((q, i) => (
                    <fieldset className="student-question" key={q.id}>
                      <legend>
                        <span className="question-num">{i + 1}.</span>{" "}
                        {q.question_text}
                      </legend>
                      {q.choices.map((c) => (
                        <label
                          className={`answer-option ${answers[q.id] === c.id ? "selected" : ""}`}
                          key={c.id}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            required
                            value={c.id}
                            checked={answers[q.id] === c.id}
                            onChange={() =>
                              setAnswers({ ...answers, [q.id]: c.id })
                            }
                          />
                          <span>{c.choice_text}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button
                    className="primary full"
                    disabled={busy || s.questions.some((q) => !answers[q.id])}
                  >
                    {busy ? "Submitting…" : "Submit response"}{" "}
                    <ArrowUpRight size={18} />
                  </button>
                </fieldset>
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
