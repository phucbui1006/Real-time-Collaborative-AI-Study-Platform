import { useState, useEffect, useRef, useMemo } from "react";
import {
  uid,
  code6,
  fmt,
  newQ,
  score10,
  SEED_SETS,
  SEED_HISTORY,
  BOT_NAMES,
  BTN_OUT,
  ExamSet,
  ExamHistory,
  LiveExam,
  MyExamState,
  ExamResult,
  board,
  QuizDocItem,
  loadUserQuizDocs,
  loadUserExamSets,
  saveUserExamSet,
  deleteUserExamSet,
  loadUserExamHistory,
  saveUserExamHistory,
  HostedExamRecord,
  loadUserHostedExams,
  saveUserHostedExam,
  deleteUserHostedExam,
  LeaderboardRow,
  shuffleQuestionsForUser,
} from "../services/examService";
import { Editor } from "../components/quiz/Editor";
import { OpenModal } from "../components/quiz/OpenModal";
import { HostView } from "../components/quiz/HostView";
import { TakeView } from "../components/quiz/TakeView";
import { ResultView } from "../components/quiz/ResultView";
import { getSubjectStyle } from "../components/documents/DocumentStore";
import { Radio, PlayCircle, Plus } from "lucide-react";
import { idleService } from "../services/idleService";
import { isValidUUID } from "../utils";
import {
  publishLiveExam,
  fetchLiveExam,
  closeLiveExam,
  subscribeExamRealtime,
} from "../services/liveExamSync";


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

  const isRealUser = isValidUUID(userId);
  const setsKey = `permind_exam_sets_${userId || "guest"}`;
  const historyKey = `permind_exam_history_${userId || "guest"}`;

  const [tab, setTab] = useState<"sets" | "history">("sets");
  const [hostedExams, setHostedExams] = useState<HostedExamRecord[]>([]);
  const [historySubTab, setHistorySubTab] = useState<"taken" | "hosted">("taken");
  const [viewingHosted, setViewingHosted] = useState<HostedExamRecord | null>(null);
  const [libraryDocs, setLibraryDocs] = useState<QuizDocItem[]>([]);

  // Tải danh sách tài liệu từ Thư viện (kết hợp cache và Supabase) để phục vụ AI tạo câu hỏi
  useEffect(() => {
    let active = true;
    loadUserQuizDocs(userId).then((docs) => {
      if (active) setLibraryDocs(docs);
    });
    return () => {
      active = false;
    };
  }, [userId]);


  // Tài khoản thật: ban đầu rỗng (0 bộ đề, 0 lịch sử thi), người dùng tự thêm/tự xóa
  // Tài khoản demo/khách: nạp SEED_SETS và SEED_HISTORY mẫu
  const [sets, setSets] = useState<ExamSet[]>(() => {
    try {
      const stored = localStorage.getItem(setsKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return isRealUser ? [] : SEED_SETS;
  });
  const [history, setHistory] = useState<ExamHistory[]>(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return isRealUser ? [] : SEED_HISTORY;
  });

  // Tải danh sách bộ câu hỏi và lịch sử thi (đồng bộ Cloud Supabase + LocalStorage Cache)
  useEffect(() => {
    let active = true;
    loadUserExamSets(userId).then((loadedSets) => {
      if (active) setSets(loadedSets);
    });
    loadUserExamHistory(userId).then((loadedHistory) => {
      if (active) setHistory(loadedHistory);
    });
    loadUserHostedExams(userId).then((loadedHosted) => {
      if (active) setHostedExams(loadedHosted);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // Khôi phục phòng thi đang mở (nếu còn thời gian chạy)
  const [live, setLive] = useState<LiveExam | null>(() => {
    try {
      const stored = localStorage.getItem("permind_current_live_exam");
      if (stored) {
        const parsed: LiveExam = JSON.parse(stored);
        if (parsed.status === "running" && parsed.endAt > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [mine, setMine] = useState<MyExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [openFor, setOpenFor] = useState<ExamSet | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [joining, setJoining] = useState(false);
  const channelRef = useRef<ReturnType<typeof subscribeExamRealtime> | null>(null);
  const now = useNow();

  const remaining = live ? Math.max(0, Math.ceil((live.endAt - now) / 1000)) : 0;
  // Chỉ coi là đang hoạt động nếu bài đang running, còn thời gian và người dùng chưa nộp bài
  const isLiveActive = Boolean(live && live.status === "running" && remaining > 0 && (!mine || !mine.done));

  // Danh sách câu hỏi được xáo trộn ngẫu nhiên riêng biệt cho từng thí sinh (theo mã phòng + ID/Tên)
  const candidateQuestions = useMemo(() => {
    if (!live || !live.set || !live.set.questions) return [];
    const seedKey = `${live.code}_${userId || userName || "guest"}`;
    return shuffleQuestionsForUser(live.set.questions, seedKey);
  }, [live?.code, live?.set, userId, userName]);

  const rows = live ? board(live, mine, userName, candidateQuestions) : [];

  // Tự động lưu bản tổng kết kết quả phòng thi do người dùng này tổ chức
  const saveHostedRecord = (exam: LiveExam, currentRows: LeaderboardRow[]) => {
    const total = exam.set.questions.length;
    const avg = currentRows.length
      ? currentRows.reduce((s, r) => s + r.score, 0) / currentRows.length
      : 0;

    const sorted = [...currentRows].sort((a, b) => b.score - a.score || b.answered - a.answered);

    const record: HostedExamRecord = {
      id: `hosted_${exam.code}_${Date.now()}`,
      code: exam.code,
      title: exam.set.title,
      subject: exam.set.subject || "KIỂM TRA",
      date: new Date().toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      totalQuestions: total,
      participantCount: sorted.length,
      avgScore: Number(avg.toFixed(1)),
      leaderboard: sorted.map((r, idx) => ({
        name: r.name,
        score: Number(r.score.toFixed(1)),
        answered: r.answered,
        correct: r.correct,
        rank: idx + 1,
        isMe: !!r.me,
      })),
    };

    setHostedExams((prev) => {
      const filtered = prev.filter((p) => p.code !== record.code);
      const updated = [record, ...filtered];
      saveUserHostedExam(userId, record);
      return updated;
    });
  };

  // Tự động lưu bài thi vào Lịch sử làm bài (Ghi nhận điểm cao nhất nếu làm lại)
  const saveExamToHistory = (
    exam: LiveExam,
    score: number,
    rank: number,
    ofCount: number
  ) => {
    setHistory((prev) => {
      const today = new Date().toLocaleDateString("vi-VN");
      const existingIdx = prev.findIndex(
        (h) => h.examCode === exam.code || (h.title === exam.set.title && h.date === today)
      );

      // Nếu đã từng làm bài thi này: ghi nhận điểm số cao nhất
      if (existingIdx !== -1) {
        const old = prev[existingIdx];
        const newScore = Number(score.toFixed(1));
        const attempts = (old.attempts || 1) + 1;
        const bestScore = Math.max(old.score, newScore);
        const bestRank = score >= old.score ? rank : old.rank;
        const updatedEntry: ExamHistory = {
          ...old,
          score: bestScore,
          rank: Math.max(1, bestRank),
          of: Math.max(old.of, ofCount),
          attempts,
        };
        const updated = [...prev];
        updated[existingIdx] = updatedEntry;
        try {
          localStorage.setItem(historyKey, JSON.stringify(updated));
        } catch {}
        saveUserExamHistory(userId, updatedEntry);
        return updated;
      }

      const newEntry: ExamHistory = {
        id: uid(),
        examCode: exam.code,
        title: exam.set.title,
        subject: exam.set.subject || "KIỂM TRA",
        score: Number(score.toFixed(1)),
        rank: Math.max(1, rank),
        of: Math.max(1, ofCount),
        date: today,
        attempts: 1,
      };

      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch {}
      saveUserExamHistory(userId, newEntry);
      return updated;
    });
  };

  // Hết giờ theo mốc thời gian tuyệt đối (endAt) → tự động kết thúc bài
  useEffect(() => {
    if (live?.status === "running" && remaining === 0) {
      const endedLive: LiveExam = { ...live, status: "ended" };
      setLive(endedLive);
      try {
        localStorage.setItem(`permind_active_exam_${live.code}`, JSON.stringify(endedLive));
        localStorage.setItem("permind_current_live_exam", JSON.stringify(endedLive));
      } catch {}
    }
  }, [remaining, live]);

  // Kết nối Supabase Realtime Channel để nhận dữ liệu từ các thí sinh thực tế
  useEffect(() => {
    if (!live || live.status !== "running") {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    const sub = subscribeExamRealtime(live.code, {
      onStudentJoin: (student) => {
        setLive((curr) => {
          if (!curr) return curr;
          const parts = curr.participants || [];
          if (parts.some((p) => p.name === student.name)) return curr;
          return {
            ...curr,
            participants: [
              ...parts,
              {
                id: student.id,
                name: student.name,
                answered: 0,
                correct: 0,
                score: 0,
                done: false,
                joinedAt: Date.now(),
              },
            ],
          };
        });
      },
      onStudentProgress: (data) => {
        setLive((curr) => {
          if (!curr) return curr;
          const parts = (curr.participants || []).map((p) =>
            p.name === data.name
              ? { ...p, answered: data.answered, correct: data.correct, score: data.score, done: data.done }
              : p
          );
          if (!parts.some((p) => p.name === data.name)) {
            parts.push({
              name: data.name,
              answered: data.answered,
              correct: data.correct,
              score: data.score,
              done: data.done,
            });
          }
          return { ...curr, participants: parts };
        });
      },
      onStudentSubmit: (data) => {
        setLive((curr) => {
          if (!curr) return curr;
          const parts = (curr.participants || []).map((p) =>
            p.name === data.name
              ? { ...p, answered: data.answered, correct: Math.max(p.correct || 0, data.correct), score: Math.max(p.score || 0, data.score), done: true }
              : p
          );
          if (!parts.some((p) => p.name === data.name)) {
            parts.push({
              name: data.name,
              answered: data.answered,
              correct: data.correct,
              score: data.score,
              done: true,
            });
          }
          return { ...curr, participants: parts };
        });
      },
      onExamEnded: () => {
        setLive((curr) => (curr ? { ...curr, status: "ended" } : null));
      },
    });

    channelRef.current = sub;

    // Nếu người dùng đang ở chế độ làm bài (thí sinh), phát thông báo tham gia
    if (view.name === "take") {
      sub.sendStudentJoin(userName, userId);
    }

    return () => {
      sub.unsubscribe();
      channelRef.current = null;
    };
  }, [live?.code, live?.status, view.name, userName, userId]);

  // Mô phỏng thí sinh mẫu (chỉ chạy khi chủ phòng chủ động bấm thêm bot)
  useEffect(() => {
    if (live?.status !== "running" || !live.bots || live.bots.length === 0) return;
    const total = live.set.questions.length;
    const t = setInterval(() => {
      setLive((l) => {
        if (!l || l.status !== "running" || !l.bots || l.bots.length === 0) return l;
        const open = l.bots.map((b, i): [typeof b, number] => [b, i]).filter(([b]) => b.answered < total);
        if (!open.length) return l;
        const [b, i] = open[Math.floor(Math.random() * open.length)];
        const bots = l.bots.slice();
        bots[i] = { ...b, answered: b.answered + 1, correct: b.correct + (Math.random() < 0.7 ? 1 : 0) };
        return { ...l, bots };
      });
    }, 2200);
    return () => clearInterval(t);
  }, [live?.status, live?.code, live?.bots?.length]);

  const finishTake = () => {
    if (!mine || mine.done || !live) return;
    const qs = candidateQuestions.length ? candidateQuestions : live.set.questions;
    const ans = mine.answers;
    const me = rows.find((r) => r.me) || { score: 0, rank: 1, correct: 0 };
    const existingHistory = history.find((h) => h.examCode === live.code || (h.title === live.set.title && h.date === new Date().toLocaleDateString("vi-VN")));
    const prevBest = existingHistory ? existingHistory.score : 0;
    const bestScore = Math.max(prevBest, me.score);
    const attempts = (existingHistory?.attempts || 0) + 1;
    const res: ExamResult = {
      title: live.set.title,
      subject: live.set.subject,
      correct: me.correct,
      total: qs.length,
      score: me.score,
      rank: me.rank,
      of: rows.length,
      perQ: qs.map((q) => (ans[q.id] === undefined ? null : ans[q.id] === q.correct)),
      bestScore,
      attempts,
    };
    channelRef.current?.sendStudentSubmit(userName, me.correct, me.correct, me.score);
    setMine((m) => (m ? { ...m, done: true } : null));
    saveExamToHistory(live, res.score, res.rank, res.of);
    setResult(res);
    setView({ name: "result" });
    try {
      localStorage.removeItem("permind_current_mine_exam");
      localStorage.removeItem("permind_current_live_exam");
    } catch {}
  };

  // Hết giờ khi đang làm bài → tự nộp
  useEffect(() => {
    if (live?.status === "ended" && view.name === "take") finishTake();
  }, [live?.status]);

  const startExam = async (set: ExamSet, minutes: number, allowRetake: boolean = true) => {
    const startedAt = Date.now();
    const endAt = startedAt + minutes * 60000;
    const code = code6();
    const newLive: LiveExam = {
      set,
      code,
      minutes,
      startedAt,
      endAt,
      status: "running",
      hostUserId: userId || null,
      hostName: userName || "Chủ phòng",
      participants: [],
      bots: [],
      allowRetake,
    };
    setLive(newLive);
    try {
      localStorage.setItem(`permind_active_exam_${code}`, JSON.stringify(newLive));
      localStorage.setItem("permind_current_live_exam", JSON.stringify(newLive));
    } catch {}
    setMine(null);
    setOpenFor(null);
    setView({ name: "host" });

    // Đồng bộ phòng thi lên Supabase Cloud để mọi máy khác đều có thể nhập mã tham gia
    await publishLiveExam(newLive, userId, userName);
  };

  const joinExam = async (code: string) => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) return;
    setJoinErr("");
    setJoining(true);

    try {
      // 1. Kiểm tra bộ nhớ cục bộ nếu cùng máy
      let target: LiveExam | null = live && live.code === trimmed ? live : null;

      // 2. Tra cứu từ Supabase Cloud
      if (!target) {
        target = await fetchLiveExam(trimmed);
      }

      if (!target) {
        setJoinErr("Không tìm thấy bài kiểm tra đang mở với mã này. Hãy kiểm tra lại mã 6 số từ người tạo phòng.");
        return;
      }

      const nowTime = Date.now();
      if (target.status === "ended" || nowTime >= target.endAt) {
        const formattedEnd = new Date(target.endAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setJoinErr(`Bài kiểm tra này đã kết thúc thời gian làm bài (đã đóng lúc ${formattedEnd}).`);
        return;
      }

      setJoinErr("");
      // 3. Kiểm tra nếu thí sinh đã nộp bài trong phòng thi này
      const isSubmitted =
        history.some((h) => h.examCode === trimmed) ||
        target.participants?.some((p) => (p.name === userName || (Boolean(userId) && p.id === userId)) && p.done);

      if (isSubmitted && !target.allowRetake) {
        setJoinErr("Bài kiểm tra này không cho phép làm lại (bạn đã hoàn thành và nộp bài rồi).");
        return;
      }

      setJoinCode("");
      setLive(target);
      setMine({ answers: {}, done: false, startedAt: Date.now() });
      setView({ name: "take" });
    } catch (err: any) {
      setJoinErr(err?.message || "Lỗi kết nối khi tham gia bài kiểm tra.");
    } finally {
      setJoining(false);
    }
  };

  const answer = (qid: string, idx: number) => {
    if (!live || live.status !== "running" || !mine || mine.answers[qid] === idx) return;
    const newAnswers = { ...mine.answers, [qid]: idx };
    setMine((m) => (m ? { ...m, answers: newAnswers } : null));

    // Phát sóng tiến độ thời gian thực cho chủ phòng
    const qs = candidateQuestions.length ? candidateQuestions : live.set.questions;
    const answeredCount = Object.keys(newAnswers).length;
    const correctCount = qs.filter((q) => newAnswers[q.id] === q.correct).length;
    const currentScore = score10(correctCount, qs.length);
    channelRef.current?.sendStudentProgress(userName, answeredCount, correctCount, currentScore, false);
  };

  const saveSet = (s: ExamSet) => {
    const { isNew: _isNew, ...clean } = s;
    setSets((a) => {
      const updated = a.some((x) => x.id === clean.id)
        ? a.map((x) => (x.id === clean.id ? clean : x))
        : [clean, ...a];
      return updated;
    });
    saveUserExamSet(userId, clean);
    setView({ name: "home" });
  };

  const home = () => {
    // Nếu bài thi đã kết thúc hoặc thí sinh đã làm xong bài, tự động mở tab Lịch sử làm bài
    if (!isLiveActive && (result || (mine && mine.done) || (live && live.status === "ended"))) {
      setTab("history");
      setLive(null);
      setMine(null);
      try {
        localStorage.removeItem("permind_current_live_exam");
        localStorage.removeItem("permind_current_mine_exam");
      } catch {}
    }
    setView({ name: "home" });
  };

  /* ---- các màn ---- */
  if (view.name === "edit") {
    return <Editor initial={view.set} docs={libraryDocs} onSave={saveSet} onCancel={home} />;
  }

  if (view.name === "host" && live) {
    return (
      <HostView
        live={live}
        rows={rows}
        remaining={remaining}
        onBack={home}
        onEnd={() => {
          if (live) {
            channelRef.current?.sendExamEnded();
            closeLiveExam(live.code);
            saveHostedRecord(live, rows);
            setLive((l) => {
              if (!l) return null;
              const endedLive: LiveExam = { ...l, status: "ended", endAt: Date.now() };
              try {
                localStorage.setItem(`permind_active_exam_${l.code}`, JSON.stringify(endedLive));
                localStorage.setItem("permind_current_live_exam", JSON.stringify(endedLive));
              } catch {}
              return endedLive;
            });
          }
        }}
        onClose={() => {
          if (live) {
            channelRef.current?.sendExamEnded();
            closeLiveExam(live.code);
            saveHostedRecord(live, rows);
            try {
              localStorage.removeItem(`permind_active_exam_${live.code}`);
              localStorage.removeItem("permind_current_live_exam");
            } catch {}
          }
          setLive(null);
          setMine(null);
          setTab("history");
          setHistorySubTab("hosted");
          home();
        }}
        onTry={() => {
          setMine({ answers: {}, done: false, startedAt: Date.now() });
          setView({ name: "take" });
        }}
        onAddBots={() => {
          if (!live) return;
          const newBots = BOT_NAMES.map((name) => ({ name, answered: 0, correct: 0 }));
          setLive((curr) => (curr ? { ...curr, bots: newBots } : null));
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
        questions={candidateQuestions}
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
            className="inline-flex items-center justify-center gap-2 rounded-pill h-12 px-6 text-base font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-5 w-5" strokeWidth={1.75} />
            <span>Tạo bộ câu hỏi</span>
          </button>
        </div>

        {/* Bài đang mở + tham gia bằng mã (Cân đối không gian & nút rõ ràng) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thẻ tham gia bài kiểm tra */}
          <div className="rounded-md p-6 border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex flex-col justify-between">
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
                  className="flex-1 h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-5 text-base font-mono tracking-[0.25em] uppercase text-[#111118] dark:text-[#f0f6ff] placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-[#111118]/40 dark:placeholder:text-[#f0f6ff]/40 outline-none focus:border-[#0b7a75] transition-colors"
                  inputMode="numeric"
                  maxLength={6}
                  value={joinCode}
                  placeholder="Nhập mã 6 số"
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button
                  type="submit"
                  disabled={joinCode.length !== 6 || joining}
                  className={`whitespace-nowrap shrink-0 px-6 h-12 font-normal rounded-pill border-2 border-[#111118] text-base transition-all active:translate-y-[2px] ${
                    joinCode.length === 6 && !joining
                      ? "bg-[#0b7a75] hover:bg-[#09635f] text-white shadow-[0_4px_0_0_#111118] cursor-pointer"
                      : "bg-[#e1edff] dark:bg-[#242436] text-[#111118]/60 dark:text-[#f0f6ff]/60 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] cursor-not-allowed"
                  }`}
                >
                  {joining ? "Đang vào…" : "Vào thi"}
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

          {/* Khung bài kiểm tra đang tham gia (Chỉ hiện khi đang diễn ra) */}
          <div className="rounded-md bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-normal text-[#111118] dark:text-[#f0f6ff] text-xl tracking-[-0.015em]">
                  Bài kiểm tra đang tham gia
                </h2>
                {isLiveActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#16ab59]/15 text-[#16ab59] border border-[#16ab59]/30">
                    <span className="w-2 h-2 rounded-full bg-[#16ab59] animate-pulse" />
                    Đang diễn ra
                  </span>
                )}
              </div>

              {isLiveActive && live ? (
                <div className="mt-4 p-4 rounded-[4px] bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a]">
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium text-[#111118] dark:text-[#f0f6ff]">
                      {live.set.title}
                    </div>
                    <div className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono tabular-nums mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span>Mã: <strong className="text-[#0b7a75] dark:text-[#2dd4bf] font-mono text-sm">{live.code}</strong></span>
                      <span>·</span>
                      <span>Còn <strong className="text-[#ff4141] font-mono">{fmt(remaining)}</strong></span>
                      {mine && (
                        <>
                          <span>·</span>
                          <span>Đã làm {Object.keys(mine.answers).length}/{(candidateQuestions.length || live.set.questions.length)} câu</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#111118]/10 dark:border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (mine) {
                          if (window.confirm("Bạn có muốn nộp bài sớm và rời phòng thi? Điểm số hiện tại sẽ được lưu vào Lịch sử.")) {
                            finishTake();
                          }
                        } else {
                          if (window.confirm("Bạn có muốn kết thúc và đóng bài kiểm tra này?")) {
                            channelRef.current?.sendExamEnded();
                            closeLiveExam(live.code);
                            saveHostedRecord(live, rows);
                            const me = rows.find((r) => r.me);
                            saveExamToHistory(live, me ? me.score : 10, me ? me.rank : 1, rows.length || 1);
                            setLive(null);
                            setTab("history");
                            setHistorySubTab("hosted");
                            try {
                              localStorage.removeItem("permind_current_live_exam");
                              localStorage.removeItem("permind_current_mine_exam");
                            } catch {}
                          }
                        }
                      }}
                      className="text-xs text-[#ff4141] hover:underline cursor-pointer font-normal"
                    >
                      {mine ? "Nộp bài sớm & Rời" : "Đóng bài kiểm tra"}
                    </button>

                    <button
                      onClick={() => {
                        if (mine) {
                          setView({ name: "take" });
                        } else {
                          setView({ name: "host" });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill bg-[#0b7a75] hover:bg-[#09635f] text-white text-xs font-normal border-2 border-[#111118] shadow-[0_3px_0_0_#111118] active:translate-y-[1px] transition-all cursor-pointer"
                    >
                      <span>{mine ? "Tiếp tục làm bài" : "Vào phòng thi & Bảng điểm"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-5 flex flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#91d8ec] text-[#111118] border border-[#111118] mb-2 shadow-[0_2px_0_0_#111118]">
                    <Radio className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Chưa có bài kiểm tra nào đang tham gia</p>
                  <p className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 mt-0.5 max-w-xs font-normal">
                    Nhập mã 6 chữ số bên trái để vào thi, hoặc chọn "Mở bài kiểm tra" từ bộ câu hỏi của bạn bên dưới.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
              <span>Trạng thái phòng thi</span>
              <span className="font-mono text-[11px] text-[#0b7a75] dark:text-[#2dd4bf] font-normal">
                {isLiveActive ? "Đang tham gia" : "Sẵn sàng"}
              </span>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div className="mt-10 inline-flex p-1 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] gap-1">
        {[
          ["sets", "Bộ câu hỏi của tôi"],
          ["history", "Lịch sử làm bài"],
        ].map(([id, l]) => (
          <button
            key={id}
            onClick={() => setTab(id as "sets" | "history")}
            className={`px-5 py-2 text-sm font-normal transition-all cursor-pointer ${
              tab === id
                ? "rounded-pill bg-[#0b7a75] text-white shadow-[0_2px_0_0_#111118]"
                : "rounded-[8px] text-[#111118] dark:text-[#f0f6ff] hover:bg-white/50 dark:hover:bg-[#1b1b26]/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
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
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[#111118] shadow-[0_2px_0_0_#111118] ${subStyle.box}`}>
                      {subStyle.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-normal text-[#111118] dark:text-[#f0f6ff] text-base">{s.title}</div>
                      <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums mt-1">
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
                        className="inline-flex items-center gap-1.5 rounded-pill h-12 px-5 text-sm font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] transition-all cursor-pointer disabled:opacity-40"
                      >
                        <PlayCircle className="h-4 w-4" strokeWidth={1.75} />
                        Mở bài kiểm tra
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Xoá "${s.title}"?`)) {
                            setSets((a) => a.filter((x) => x.id !== s.id));
                            deleteUserExamSet(userId, s.id);
                          }
                        }}
                        aria-label={`Xoá ${s.title}`}
                        className="w-10 h-10 rounded-sm border border-[#111118]/30 flex items-center justify-center text-[#ff4141] hover:bg-[#ffbac4]/30 text-base cursor-pointer transition-colors"
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
          <div>
            {/* Thanh chuyển đổi mục Lịch sử: Bài thi đã làm vs Phòng đã tổ chức */}
            <div className="flex items-center gap-2 mb-6 border-b border-[#e1edff] dark:border-[#2a2a3a] pb-4">
              <button
                type="button"
                onClick={() => setHistorySubTab("taken")}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-pill border border-[#111118] transition-all cursor-pointer ${
                  historySubTab === "taken"
                    ? "bg-[#0b7a75] text-white shadow-[0_2px_0_0_#111118]"
                    : "bg-white dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#e1edff] dark:hover:bg-[#1b1b26]"
                }`}
              >
                Bài thi đã làm ({history.length})
              </button>

              <button
                type="button"
                onClick={() => setHistorySubTab("hosted")}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-pill border border-[#111118] transition-all cursor-pointer ${
                  historySubTab === "hosted"
                    ? "bg-[#0b7a75] text-white shadow-[0_2px_0_0_#111118]"
                    : "bg-white dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#e1edff] dark:hover:bg-[#1b1b26]"
                }`}
              >
                Phòng đã tổ chức ({hostedExams.length})
              </button>
            </div>

            {historySubTab === "taken" ? (
              history.length === 0 ? (
                <p className="py-10 text-center text-sm font-normal text-[#111118]/60 dark:text-[#f0f6ff]/60">
                  Chưa có lịch sử làm bài kiểm tra nào. Hãy tham gia hoặc mở phòng thi để xem xếp hạng nhé!
                </p>
              ) : (
                <ul className="divide-y divide-[#e1edff] dark:divide-[#2a2a3a]">
                  {history.map((h) => {
                    const subStyle = getSubjectStyle(h.subject);
                    return (
                      <li key={h.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[#111118] shadow-[0_2px_0_0_#111118] ${subStyle.box}`}>
                          {subStyle.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-normal tracking-wide uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">{h.subject}</div>
                          <div className="truncate font-normal text-[#111118] dark:text-[#f0f6ff] text-base mt-0.5">{h.title}</div>
                          <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums mt-0.5">
                            {h.date} · Hạng {h.rank}/{h.of}{h.attempts && h.attempts > 1 ? ` · Đã làm ${h.attempts} lần` : ""}
                          </div>
                        </div>
                        <span className="rounded-sharp px-4 py-2 text-xs font-mono font-normal bg-[#16ab59] text-white border-2 border-[#111118] shadow-[0_2px_0_0_#111118] tabular-nums">
                          {h.attempts && h.attempts > 1 ? `Cao nhất ${h.score.toFixed(1)}` : `Đã đạt ${h.score.toFixed(1)}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : hostedExams.length === 0 ? (
              <p className="py-10 text-center text-sm font-normal text-[#111118]/60 dark:text-[#f0f6ff]/60">
                Bạn chưa có phòng thi nào đã đóng. Khi bạn mở phòng thi và đóng lại, toàn bộ bảng điểm và kết quả của các thí sinh sẽ được lưu trữ tại đây!
              </p>
            ) : (
              <ul className="divide-y divide-[#e1edff] dark:divide-[#2a2a3a]">
                {hostedExams.map((rec) => {
                  const subStyle = getSubjectStyle(rec.subject);
                  return (
                    <li key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[#111118] shadow-[0_2px_0_0_#111118] ${subStyle.box}`}>
                          {subStyle.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal tracking-wide uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">{rec.subject}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] font-semibold border border-[#111118]/20">
                              Mã: {rec.code}
                            </span>
                          </div>
                          <div className="truncate font-medium text-[#111118] dark:text-[#f0f6ff] text-base mt-0.5">{rec.title}</div>
                          <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                            <span>📅 {rec.date}</span>
                            <span>👥 {rec.participantCount} thí sinh</span>
                            <span>⭐ Điểm TB: {rec.avgScore.toFixed(1)}/10</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingHosted(rec)}
                          className="inline-flex items-center gap-1.5 rounded-pill h-10 px-4 text-xs font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_3px_0_0_#111118] active:translate-y-[1px] transition-all cursor-pointer"
                        >
                          Xem bảng điểm
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Xoá lịch sử phòng thi "${rec.title}" (Mã: ${rec.code})?`)) {
                              deleteUserHostedExam(userId, rec.id).then((updated) => {
                                setHostedExams(updated);
                              });
                            }
                          }}
                          className="w-10 h-10 rounded-sm border border-[#111118]/30 flex items-center justify-center text-[#ff4141] hover:bg-[#ffbac4]/30 text-base cursor-pointer transition-colors"
                          title="Xoá lịch sử phòng này"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {openFor && <OpenModal set={openFor} onStart={startExam} onClose={() => setOpenFor(null)} />}

      {/* Modal xem chi tiết bảng điểm phòng thi đã tổ chức */}
      {viewingHosted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-md bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <div>
                <span className="rounded-sharp px-2.5 py-0.5 text-xs font-mono bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] border border-[#111118]">
                  Mã phòng: {viewingHosted.code}
                </span>
                <h3 className="mt-2 text-xl font-normal text-[#111118] dark:text-[#f0f6ff]">
                  {viewingHosted.title}
                </h3>
                <p className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 mt-1 font-mono">
                  Ngày tổ chức: {viewingHosted.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHosted(null)}
                className="w-8 h-8 rounded-full border border-[#111118]/20 flex items-center justify-center text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Stats Overview */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8fafd] dark:bg-[#20202e] border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <div className="text-center p-2 rounded bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-xl font-mono font-medium text-[#111118] dark:text-[#f0f6ff]">
                  {viewingHosted.participantCount}
                </div>
                <div className="text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60 mt-0.5">Thí sinh</div>
              </div>
              <div className="text-center p-2 rounded bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-xl font-mono font-medium text-[#111118] dark:text-[#f0f6ff]">
                  {viewingHosted.totalQuestions}
                </div>
                <div className="text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60 mt-0.5">Số câu hỏi</div>
              </div>
              <div className="text-center p-2 rounded bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-xl font-mono font-medium text-[#0b7a75] dark:text-[#2dd4bf]">
                  {viewingHosted.avgScore.toFixed(1)}
                </div>
                <div className="text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60 mt-0.5">Điểm TB</div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h4 className="text-sm font-medium text-[#111118] dark:text-[#f0f6ff] mb-3">
                Bảng xếp hạng chung cuộc
              </h4>
              {viewingHosted.leaderboard.length === 0 ? (
                <p className="text-center py-8 text-sm text-[#111118]/60 dark:text-[#f0f6ff]/60">
                  Không có dữ liệu thí sinh cho phòng thi này.
                </p>
              ) : (
                <div className="rounded border border-[#e1edff] dark:border-[#2a2a3a] overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f0f4f9] dark:bg-[#242436] text-xs font-medium text-[#111118]/70 dark:text-[#f0f6ff]/70 border-b border-[#e1edff] dark:border-[#2a2a3a]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-14">Hạng</th>
                        <th className="py-2.5 px-3">Thí sinh</th>
                        <th className="py-2.5 px-3 text-center">Làm đúng</th>
                        <th className="py-2.5 px-3 text-right">Điểm số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1edff] dark:divide-[#2a2a3a]">
                      {viewingHosted.leaderboard.map((p, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-[#f8fafd] dark:hover:bg-[#20202e] ${
                            p.isMe ? "bg-[#e1edff]/40 dark:bg-[#242436]/40 font-medium" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            {p.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#facc15] text-[#111118] font-bold text-xs shadow-sm">
                                1
                              </span>
                            ) : p.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#cbd5e1] text-[#111118] font-bold text-xs shadow-sm">
                                2
                              </span>
                            ) : p.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#fdba74] text-[#111118] font-bold text-xs shadow-sm">
                                3
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60">
                                #{p.rank}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[#111118] dark:text-[#f0f6ff]">
                              {p.name} {p.isMe && <span className="text-xs text-[#0b7a75] font-normal">(Bạn)</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                            {p.correct}/{viewingHosted.totalQuestions} câu
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-medium text-xs px-2.5 py-1 rounded bg-[#16ab59]/15 text-[#16ab59] border border-[#16ab59]/30">
                              {p.score.toFixed(1)} đ
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e1edff] dark:border-[#2a2a3a] flex justify-end">
              <button
                type="button"
                onClick={() => setViewingHosted(null)}
                className="h-10 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#09635f] text-white text-xs font-normal border-2 border-[#111118] shadow-[0_2px_0_0_#111118] cursor-pointer transition-all active:translate-y-[1px]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
