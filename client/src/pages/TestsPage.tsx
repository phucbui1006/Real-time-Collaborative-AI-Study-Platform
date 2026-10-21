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
  BTN_OUT,
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
import { getSubjectStyle } from "../components/documents/DocumentStore";
import { Radio, ArrowRight, PlayCircle, Plus } from "lucide-react";

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

interface TestsPageProps {
  userId?: string;
  userName?: string;
}

export default function TestsPage({ userId, userName = "Minh Anh" }: TestsPageProps) {
  const [view, setView] = useState<
    | { name: "home" }
    | { name: "edit"; set: ExamSet }
    | { name: "host" }
    | { name: "take" }
    | { name: "result" }
  >({ name: "home" });

  const setsKey = `peermind_exam_sets_${userId || "guest"}`;
  const historyKey = `peermind_exam_history_${userId || "guest"}`;

  const [tab, setTab] = useState<"sets" | "history">("sets");
  const [sets, setSets] = useState<ExamSet[]>(() => {
    try {
      const stored = localStorage.getItem(setsKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return SEED_SETS;
  });
  const [history, setHistory] = useState<ExamHistory[]>(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return SEED_HISTORY;
  });

  useEffect(() => {
    try {
      const storedSets = localStorage.getItem(setsKey);
      setSets(storedSets ? JSON.parse(storedSets) : SEED_SETS);
      const storedHistory = localStorage.getItem(historyKey);
      setHistory(storedHistory ? JSON.parse(storedHistory) : SEED_HISTORY);
    } catch {}
  }, [userId, setsKey, historyKey]);

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
    setHistory((h) => {
      const updated = [
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
      ];
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
    setSets((a) => {
      const updated = a.some((x) => x.id === clean.id)
        ? a.map((x) => (x.id === clean.id ? clean : x))
        : [clean, ...a];
      try {
        localStorage.setItem(setsKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
          <p className="text-xs font-semibold tracking-widest text-sky-600 dark:text-cyan-400 uppercase">
            XIN CHÀO, {userName.toUpperCase()}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Bài kiểm tra trực tuyến
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
          className="inline-flex items-center justify-center gap-2 rounded-md h-9 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20 active:translate-y-[1px] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          <span>Tạo bộ câu hỏi</span>
        </button>
      </div>

      {/* Bài đang mở + tham gia bằng mã */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thẻ tham gia bài kiểm tra (Mục 6A) */}
        <div className="rounded-2xl p-5 border border-indigo-200/90 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/60 shadow-2xs backdrop-blur-md">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Tham gia bài kiểm tra</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nhập mã phòng 6 số do bạn bè hoặc người tạo phòng gửi cho bạn.</p>
          <form
            className="mt-3.5 flex gap-2.5 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              joinExam(joinCode);
            }}
          >
            <input
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-base font-mono font-bold tracking-widest uppercase text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors shadow-2xs"
              inputMode="numeric"
              maxLength={6}
              value={joinCode}
              placeholder="Nhập mã 6 số"
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              type="submit"
              disabled={joinCode.length !== 6}
              className="whitespace-nowrap shrink-0 px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:translate-y-[1px]"
            >
              Vào thi
            </button>
          </form>
          {joinErr && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">{joinErr}</p>}
        </div>

        {/* Khung bài kiểm tra đang mở (Mục 6A Empty State) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Bài kiểm tra bạn đang mở</h2>
            {live ? (
              <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-500/30">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{live.set.title}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    Mã <strong className="text-indigo-700 dark:text-indigo-400 font-bold">{live.code}</strong> · {running ? `còn ${fmt(remaining)}` : "đã kết thúc"}
                  </div>
                </div>
                <button
                  onClick={() => setView({ name: "host" })}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Xem bảng điểm</span>
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <div className="py-5 flex flex-col items-center justify-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 mb-2">
                  <Radio className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chưa có phòng thi nào đang hoạt động</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs">
                  Chọn "Mở bài kiểm tra" ở danh sách bên dưới để lấy mã phòng cho bạn bè.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-2">
        {[
          ["sets", "Bộ câu hỏi của tôi"],
          ["history", "Lịch sử làm bài"],
        ].map(([id, l]) => (
          <button
            key={id}
            onClick={() => setTab(id as "sets" | "history")}
            className={`rounded-md px-3.5 py-1.5 text-xs transition-colors cursor-pointer ${
              tab === id
                ? "bg-indigo-600 text-white border border-indigo-500 font-semibold shadow-2xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 font-medium"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {tab === "sets" ? (
          sets.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Chưa có bộ câu hỏi nào. Bấm "+ Tạo bộ câu hỏi" để bắt đầu.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sets.map((s) => {
                const subStyle = getSubjectStyle(s.subject);
                return (
                  <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${subStyle.box}`}>
                      {subStyle.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[10px] font-bold tracking-wider uppercase ${subStyle.text}`}>{s.subject}</div>
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{s.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
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
                        className="inline-flex items-center gap-1.5 rounded-md h-9 px-3.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600/30 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <PlayCircle className="h-4 w-4" strokeWidth={1.75} />
                        Mở bài kiểm tra
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Xoá "${s.title}"?`)) {
                            setSets((a) => {
                              const updated = a.filter((x) => x.id !== s.id);
                              try {
                                localStorage.setItem(setsKey, JSON.stringify(updated));
                              } catch {}
                              return updated;
                            });
                          }
                        }}
                        aria-label={`Xoá ${s.title}`}
                        className="px-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors text-lg cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {history.map((h) => {
              const subStyle = getSubjectStyle(h.subject);
              return (
                <li key={h.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${subStyle.box}`}>
                    {subStyle.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold tracking-wide uppercase ${subStyle.text}`}>{h.subject}</div>
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100 text-sm">{h.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      {h.date} · Hạng {h.rank}/{h.of}
                    </div>
                  </div>
                  <span className="rounded-md px-3 py-1 text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 tabular-nums">
                    Đã đạt {h.score.toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openFor && <OpenModal set={openFor} onStart={startExam} onClose={() => setOpenFor(null)} />}
    </div>
  );
}
