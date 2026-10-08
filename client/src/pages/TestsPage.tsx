import { useState, useEffect } from "react";
import {
  uid,
  code6,
  fmt,
  newQ,
  SEED_SETS,
  SEED_HISTORY,
  BOT_NAMES,
  AI_DOCS,
  DARK,
  PURPLE,
  BTN,
  BTN_OUT,
  INP,
  ExamSet,
  ExamHistory,
  LiveExam,
  MyExamState,
  ExamResult,
  board,
} from "../services/examService";
import { Editor } from "../components/quiz/Editor";
import { OpenModal } from "../components/quiz/OpenModal";
import { HostView } from "../components/quiz/HostView";
import { TakeView } from "../components/quiz/TakeView";
import { ResultView } from "../components/quiz/ResultView";

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

interface TestsPageProps {
  userName?: string;
}

export default function TestsPage({ userName = "Minh Anh" }: TestsPageProps) {
  const [view, setView] = useState<
    | { name: "home" }
    | { name: "edit"; set: ExamSet }
    | { name: "host" }
    | { name: "take" }
    | { name: "result" }
  >({ name: "home" });

  const [tab, setTab] = useState<"sets" | "history">("sets");
  const [sets, setSets] = useState<ExamSet[]>(SEED_SETS);
  const [history, setHistory] = useState<ExamHistory[]>(SEED_HISTORY);
  const [live, setLive] = useState<LiveExam | null>(null);
  const [mine, setMine] = useState<MyExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [openFor, setOpenFor] = useState<ExamSet | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const now = useNow();

  const remaining = live ? Math.max(0, Math.ceil((live.endAt - now) / 1000)) : 0;
  const rows = live ? board(live, mine, userName) : [];

  // Hết giờ → kết thúc bài
  useEffect(() => {
    if (live?.status === "running" && remaining === 0) setLive((l) => (l ? { ...l, status: "ended" } : null));
  }, [remaining, live?.status]);

  // Mô phỏng các thí sinh khác – xoá khi nối realtime thật (WebSocket)
  useEffect(() => {
    if (live?.status !== "running") return;
    const total = live.set.questions.length;
    const t = setInterval(() => {
      setLive((l) => {
        if (!l || l.status !== "running") return l;
        const open = l.bots.map((b, i): [typeof b, number] => [b, i]).filter(([b]) => b.answered < total);
        if (!open.length) return l;
        const [b, i] = open[Math.floor(Math.random() * open.length)];
        const bots = l.bots.slice();
        bots[i] = { ...b, answered: b.answered + 1, correct: b.correct + (Math.random() < 0.7 ? 1 : 0) };
        return { ...l, bots };
      });
    }, 2200);
    return () => clearInterval(t);
  }, [live?.status, live?.code]);

  const finishTake = () => {
    if (!mine || mine.done || !live) return;
    const qs = live.set.questions;
    const ans = mine.answers;
    const me = rows.find((r) => r.me) || { score: 0, rank: 1, correct: 0 };
    const res: ExamResult = {
      title: live.set.title,
      subject: live.set.subject,
      correct: me.correct,
      total: qs.length,
      score: me.score,
      rank: me.rank,
      of: rows.length,
      perQ: qs.map((q) => (ans[q.id] === undefined ? null : ans[q.id] === q.correct)),
    };
    setMine({ ...mine, done: true });
    setHistory((h) => [
      {
        id: uid(),
        title: res.title,
        subject: res.subject,
        score: res.score,
        rank: res.rank,
        of: res.of,
        date: new Date().toLocaleDateString("vi-VN"),
      },
      ...h,
    ]);
    setResult(res);
    setView({ name: "result" });
  };

  // Hết giờ khi đang làm bài → tự nộp
  useEffect(() => {
    if (live?.status === "ended" && view.name === "take") finishTake();
  }, [live?.status]);

  const startExam = (set: ExamSet, minutes: number) => {
    setLive({
      set,
      code: code6(),
      minutes,
      endAt: Date.now() + minutes * 60000,
      status: "running",
      bots: BOT_NAMES.map((name) => ({ name, answered: 0, correct: 0 })),
    });
    setMine(null);
    setOpenFor(null);
    setView({ name: "host" });
  };

  const joinExam = (code: string) => {
    if (!live || live.status !== "running" || live.code !== code) {
      setJoinErr("Không tìm thấy bài kiểm tra đang mở với mã này.");
      return;
    }
    setJoinErr("");
    setJoinCode("");
    setMine({ answers: {}, done: false });
    setView({ name: "take" });
  };

  const answer = (qid: string, idx: number) => {
    if (!live || live.status !== "running" || !mine || mine.answers[qid] !== undefined) return;
    setMine((m) => (m ? { ...m, answers: { ...m.answers, [qid]: idx } } : null));
  };

  const saveSet = (s: ExamSet) => {
    const { isNew: _isNew, ...clean } = s;
    setSets((a) => (a.some((x) => x.id === clean.id) ? a.map((x) => (x.id === clean.id ? clean : x)) : [clean, ...a]));
    setView({ name: "home" });
  };

  const home = () => setView({ name: "home" });

  /* ---- các màn ---- */
  if (view.name === "edit") {
    return <Editor initial={view.set} docs={AI_DOCS} onSave={saveSet} onCancel={home} />;
  }

  if (view.name === "host" && live) {
    return (
      <HostView
        live={live}
        rows={rows}
        remaining={remaining}
        onBack={home}
        onEnd={() => setLive((l) => (l ? { ...l, status: "ended" } : null))}
        onClose={() => {
          setLive(null);
          setMine(null);
          home();
        }}
        onTry={() => {
          setMine({ answers: {}, done: false });
          setView({ name: "take" });
        }}
      />
    );
  }

  if (view.name === "take" && live && mine) {
    return (
      <TakeView
        live={live}
        mine={mine}
        rows={rows}
        remaining={remaining}
        onAnswer={answer}
        onFinish={finishTake}
      />
    );
  }

  if (view.name === "result" && result) {
    return <ResultView res={result} onHome={home} />;
  }

  const running = live?.status === "running";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">
            XIN CHÀO, {userName.toUpperCase()}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Bài kiểm tra trực tuyến
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo bộ câu hỏi, mở bài kiểm tra cho mọi người và theo dõi điểm số, xếp hạng.
          </p>
        </div>
        <button
          onClick={() =>
            setView({
              name: "edit",
              set: {
                id: uid(),
                isNew: true,
                title: "",
                subject: "",
                minutes: 10,
                questions: [newQ()],
              },
            })
          }
          className={BTN + " shrink-0 shadow-lg cursor-pointer transition-transform active:scale-95"}
          style={{ background: PURPLE }}
        >
          + Tạo bộ câu hỏi
        </button>
      </div>

      {/* Bài đang mở + tham gia bằng mã */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="font-semibold text-slate-900">Tham gia bài kiểm tra</h2>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              joinExam(joinCode);
            }}
          >
            <input
              className={INP}
              inputMode="numeric"
              maxLength={6}
              value={joinCode}
              placeholder="Nhập mã 6 số"
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ letterSpacing: ".2em", fontWeight: 700 }}
            />
            <button
              className={BTN}
              style={{ background: PURPLE }}
              disabled={joinCode.length !== 6}
            >
              Vào thi
            </button>
          </form>
          {joinErr && <p className="mt-2 text-sm text-rose-600">{joinErr}</p>}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="font-semibold text-slate-900">Bài kiểm tra bạn đang mở</h2>
          {live ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{live.set.title}</div>
                <div className="text-xs text-slate-500">
                  Mã {live.code} · {running ? `còn ${fmt(remaining)}` : "đã kết thúc"}
                </div>
              </div>
              <button onClick={() => setView({ name: "host" })} className={BTN_OUT}>
                Xem bảng điểm
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Chưa có bài nào đang mở.</p>
          )}
        </div>
      </div>

      {/* Tab */}
      <div className="mt-8 flex gap-2">
        {[
          ["sets", "Bộ câu hỏi của tôi"],
          ["history", "Lịch sử làm bài"],
        ].map(([id, l]) => (
          <button
            key={id}
            onClick={() => setTab(id as "sets" | "history")}
            className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
            style={
              tab === id
                ? { background: DARK, color: "#fff" }
                : { background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }
            }
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        {tab === "sets" ? (
          sets.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Chưa có bộ câu hỏi nào. Bấm "+ Tạo bộ câu hỏi" để bắt đầu.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sets.map((s) => (
                <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-500 shadow-xs">
                    ☑
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold tracking-wide text-violet-600">{s.subject}</div>
                    <div className="truncate font-semibold text-slate-900">{s.title}</div>
                    <div className="text-sm text-slate-500">
                      {s.questions.length} câu hỏi · {s.minutes} phút
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setView({ name: "edit", set: s })} className={BTN_OUT}>
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setOpenFor(s)}
                      disabled={running}
                      title={running ? "Đang có một bài kiểm tra mở" : ""}
                      className={BTN}
                      style={{ background: PURPLE }}
                    >
                      Mở bài kiểm tra
                    </button>
                    <button
                      onClick={() =>
                        window.confirm(`Xoá "${s.title}"?`) &&
                        setSets((a) => a.filter((x) => x.id !== s.id))
                      }
                      aria-label={`Xoá ${s.title}`}
                      className="px-2 text-slate-300 hover:text-rose-500 transition-colors text-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold tracking-wide text-violet-600">{h.subject}</div>
                  <div className="truncate font-semibold text-slate-900">{h.title}</div>
                  <div className="text-sm text-slate-500">
                    {h.date} · Hạng {h.rank}/{h.of}
                  </div>
                </div>
                <span
                  className="rounded-full px-4 py-1.5 text-sm font-bold"
                  style={{ background: "#dcfce7", color: "#166534" }}
                >
                  Đã đạt {h.score.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openFor && <OpenModal set={openFor} onStart={startExam} onClose={() => setOpenFor(null)} />}
    </div>
  );
}
