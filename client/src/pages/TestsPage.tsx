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
import { idleService } from "../services/idleService";

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

  // Tạm dừng bộ đếm idle khi người dùng đang trực tiếp làm bài thi hoặc mở phòng thi
  useEffect(() => {
    const isTesting = view.name === "take" || view.name === "host";
    idleService.setPaused("test", isTesting);
    return () => {
      idleService.setPaused("test", false);
    };
  }, [view.name]);

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
    <div className="relative min-w-0">
      {/* Hình trang trí cắt giấy phẳng (SuperHi decorative paper cutouts) */}
      <div
        className="pointer-events-none fixed -top-24 -right-24 w-[380px] h-[380px] bg-[#ffbac4] opacity-75 dark:opacity-20 z-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
          transform: "rotate(-12deg)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-24 -left-24 w-[380px] h-[380px] bg-[#91d8ec] opacity-75 dark:opacity-20 z-0"
        style={{
          clipPath: "circle(50% at 50% 50%)",
          transform: "rotate(6deg)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        {/* ── 1. Top Header (Chuẩn hóa thống nhất 3 trang) ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16ab59] border border-[#111118]" />
              <span className="text-xs font-normal tracking-wide text-[#111118]/70 dark:text-[#f0f6ff]/70 uppercase">
                XIN CHÀO, {userName.toUpperCase()}
              </span>
            </div>
            <h1 className="mt-1 text-3xl sm:text-[42px] font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
              Bài kiểm tra trực tuyến
            </h1>
            <p className="mt-1 text-base font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
              Tạo bộ câu hỏi, mở bài kiểm tra cho mọi người và theo dõi bảng điểm trực tiếp.
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
            className="inline-flex items-center justify-center gap-2 rounded-[5000px] h-12 px-6 text-base font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-5 w-5" strokeWidth={1.75} />
            <span>Tạo bộ câu hỏi</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Bài đang mở + tham gia bằng mã (Cân đối không gian & nút rõ ràng) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thẻ tham gia bài kiểm tra */}
          <div className="rounded-[24px] p-6 border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex flex-col justify-between">
            <div>
              <h2 className="font-normal text-[#111118] dark:text-[#f0f6ff] text-xl tracking-[-0.015em]">Tham gia bài kiểm tra</h2>
              <p className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">Nhập mã phòng 6 số do bạn bè hoặc người tạo phòng gửi cho bạn.</p>
              <form
                className="mt-4 flex gap-3 items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  joinExam(joinCode);
                }}
              >
                <input
                  className="flex-1 h-12 rounded-[5000px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-5 text-base font-mono tracking-[0.25em] uppercase text-[#111118] dark:text-[#f0f6ff] placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-[#111118]/40 dark:placeholder:text-[#f0f6ff]/40 outline-none focus:border-[#0b7a75] transition-colors"
                  inputMode="numeric"
                  maxLength={6}
                  value={joinCode}
                  placeholder="Nhập mã 6 số"
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button
                  type="submit"
                  disabled={joinCode.length !== 6}
                  className={`whitespace-nowrap shrink-0 px-6 h-12 font-normal rounded-[5000px] border-2 border-[#111118] text-base transition-all active:translate-y-[2px] ${
                    joinCode.length === 6
                      ? "bg-[#0b7a75] hover:bg-[#09635f] text-white shadow-[0_4px_0_0_#111118] cursor-pointer"
                      : "bg-[#e1edff] dark:bg-[#242436] text-[#111118]/60 dark:text-[#f0f6ff]/60 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] cursor-not-allowed"
                  }`}
                >
                  Vào thi →
                </button>
              </form>
              {joinErr && <p className="mt-2 text-xs text-[#ff4141] font-normal">{joinErr}</p>}
            </div>

            <div className="mt-6 pt-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16ab59]" />
                Chấm điểm tự động &amp; Xếp hạng tức thì
              </span>
              <span className="font-mono text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60">Mã 6 chữ số</span>
            </div>
          </div>

          {/* Khung bài kiểm tra đang mở */}
          <div className="rounded-[24px] bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex flex-col justify-between">
            <div>
              <h2 className="font-normal text-[#111118] dark:text-[#f0f6ff] text-xl tracking-[-0.015em]">Bài kiểm tra bạn đang mở</h2>
              {live ? (
                <div className="mt-4 flex items-center justify-between gap-3 p-4 rounded-[20px] bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a]">
                  <div className="min-w-0">
                    <div className="truncate text-base font-normal text-[#111118] dark:text-[#f0f6ff]">{live.set.title}</div>
                    <div className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono tabular-nums mt-0.5">
                      Mã <strong className="text-[#0b7a75] dark:text-[#2dd4bf] font-mono">{live.code}</strong> · {running ? `còn ${fmt(remaining)}` : "đã kết thúc"}
                    </div>
                  </div>
                  <button
                    onClick={() => setView({ name: "host" })}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[5000px] bg-white dark:bg-[#1b1b26] border border-[#111118] text-xs font-normal text-[#111118] dark:text-[#f0f6ff] hover:bg-[#f0f6ff] dark:hover:bg-[#2a2a3a] transition-all shadow-[0_2px_0_0_#111118] cursor-pointer"
                  >
                    <span>Xem bảng điểm</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <div className="py-5 flex flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#91d8ec] text-[#111118] border border-[#111118] mb-2 shadow-[0_2px_0_0_#111118]">
                    <Radio className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Chưa có phòng thi nào đang hoạt động</p>
                  <p className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 mt-0.5 max-w-xs font-normal">
                    Chọn "Mở bài kiểm tra" ở danh sách bên dưới để lấy mã phòng cho bạn bè.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
              <span>Trạng thái phòng thi</span>
              <span className="font-mono text-[11px] text-[#0b7a75] dark:text-[#2dd4bf] font-normal">
                {live ? (running ? "Đang diễn ra" : "Đã kết thúc") : "Sẵn sàng mở"}
              </span>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div className="mt-10 inline-flex p-1 rounded-[5000px] bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] gap-1">
        {[
          ["sets", "Bộ câu hỏi của tôi"],
          ["history", "Lịch sử làm bài"],
        ].map(([id, l]) => (
          <button
            key={id}
            onClick={() => setTab(id as "sets" | "history")}
            className={`rounded-[5000px] px-5 py-2 text-sm font-normal transition-all cursor-pointer ${
              tab === id
                ? "bg-[#0b7a75] text-white shadow-[0_2px_0_0_#111118]"
                : "text-[#111118] dark:text-[#f0f6ff] hover:bg-white/50 dark:hover:bg-[#1b1b26]/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[24px] bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
        {tab === "sets" ? (
          sets.length === 0 ? (
            <p className="py-10 text-center text-sm font-normal text-[#111118]/60 dark:text-[#f0f6ff]/60">
              Chưa có bộ câu hỏi nào. Bấm "+ Tạo bộ câu hỏi" để bắt đầu.
            </p>
          ) : (
            <ul className="divide-y divide-[#e1edff] dark:divide-[#2a2a3a]">
              {sets.map((s) => {
                const subStyle = getSubjectStyle(s.subject);
                return (
                  <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#111118] shadow-[0_2px_0_0_#111118] ${subStyle.box}`}>
                      {subStyle.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-normal tracking-wide uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">{s.subject}</div>
                      <div className="truncate font-normal text-[#111118] dark:text-[#f0f6ff] text-base mt-0.5">{s.title}</div>
                      <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums mt-0.5">
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
                        className="inline-flex items-center gap-1.5 rounded-[5000px] h-12 px-5 text-sm font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] transition-all cursor-pointer disabled:opacity-40"
                      >
                        <PlayCircle className="h-4 w-4" strokeWidth={1.75} />
                        Mở bài kiểm tra →
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
                        className="w-10 h-10 rounded-full border border-[#111118]/30 flex items-center justify-center text-[#ff4141] hover:bg-[#ffbac4]/30 text-base cursor-pointer transition-colors"
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
          <ul className="divide-y divide-[#e1edff] dark:divide-[#2a2a3a]">
            {history.map((h) => {
              const subStyle = getSubjectStyle(h.subject);
              return (
                <li key={h.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#111118] shadow-[0_2px_0_0_#111118] ${subStyle.box}`}>
                    {subStyle.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-normal tracking-wide uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">{h.subject}</div>
                    <div className="truncate font-normal text-[#111118] dark:text-[#f0f6ff] text-base mt-0.5">{h.title}</div>
                    <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums mt-0.5">
                      {h.date} · Hạng {h.rank}/{h.of}
                    </div>
                  </div>
                  <span className="rounded-[5000px] px-4 py-2 text-xs font-mono font-normal bg-[#16ab59] text-white border-2 border-[#111118] shadow-[0_2px_0_0_#111118] tabular-nums">
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
    </div>
  );
}
