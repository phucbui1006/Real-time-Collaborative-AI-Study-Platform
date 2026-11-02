import { supabase } from "./supabaseClient";
import { isValidUUID } from "../utils";
import { INITIAL_DOCS } from "./aiService";
import { hasGeminiApiKey, generateExamQuestionsWithGemini } from "./geminiClient";

// services/examService.ts — Dịch vụ và kiểu dữ liệu cho bài kiểm tra trực tuyến

export const uid = () => Math.random().toString(36).slice(2, 9);
export const code6 = () => String(Math.floor(100000 + Math.random() * 900000));
export const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
export const score10 = (c: number, t: number) => (t ? Math.round((c / t) * 100) / 10 : 0);
export const newQ = (): Question => ({ id: uid(), text: "", options: ["", "", "", ""], correct: 0 });
export const LETTERS = ["A", "B", "C", "D"];

export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number;
};

export type ExamSet = {
  id: string;
  subject: string;
  title: string;
  minutes: number;
  questions: Question[];
  isNew?: boolean;
};

export type HostedExamParticipant = {
  name: string;
  score: number;
  answered: number;
  correct: number;
  rank: number;
  isMe?: boolean;
};

export type HostedExamRecord = {
  id: string;
  code: string;
  title: string;
  subject: string;
  date: string;
  totalQuestions: number;
  participantCount: number;
  avgScore: number;
  leaderboard: HostedExamParticipant[];
};

export type ExamHistory = {
  id: string;
  examCode?: string;
  title: string;
  subject: string;
  score: number;
  rank: number;
  of: number;
  date: string;
  attempts?: number;
};

export type LiveBot = {
  name: string;
  answered: number;
  correct: number;
};

export type LiveParticipant = {
  id?: string;
  name: string;
  answered: number;
  correct: number;
  score?: number;
  done?: boolean;
  isMe?: boolean;
  isBot?: boolean;
  joinedAt?: number;
};

export type LiveExam = {
  set: ExamSet;
  code: string;
  minutes: number;
  startedAt?: number;
  endAt: number;
  status: "running" | "ended";
  hostUserId?: string | null;
  hostName?: string;
  participants?: LiveParticipant[];
  bots?: LiveBot[];
  allowRetake?: boolean;
};

export type MyExamState = {
  answers: Record<string, number>;
  done: boolean;
  startedAt?: number;
};

export type ExamResult = {
  title: string;
  subject: string;
  correct: number;
  total: number;
  score: number;
  rank: number;
  of: number;
  perQ: (boolean | null)[];
  bestScore?: number;
  attempts?: number;
};

export type LeaderboardRow = {
  name: string;
  correct: number;
  answered: number;
  me?: boolean;
  rank: number;
  score: number;
};

export const DARK = "#111118";
export const ACTION = "#0b7a75";
export const PURPLE = "#0b7a75";
export const BTN = "inline-flex items-center justify-center gap-2 rounded-pill h-12 px-6 text-base font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
export const BTN_OUT = "inline-flex items-center justify-center gap-2 rounded-sm h-12 border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] px-6 text-base font-normal text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] hover:bg-[#e1edff] dark:hover:bg-[#242436] active:translate-y-[2px] transition-all cursor-pointer";
export const INP = "w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-5 text-base font-normal text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/50 dark:placeholder:text-[#f0f6ff]/50 outline-none focus:border-[#0b7a75] transition-colors";


export const SEED_SETS: ExamSet[] = [
  {
    id: "s1",
    subject: "TOÁN HỌC",
    title: "Kiểm tra Đại số giữa kỳ",
    minutes: 10,
    questions: [
      { id: "a1", text: "Nghiệm của phương trình 2x + 6 = 0 là?", options: ["x = 3", "x = −3", "x = 6", "x = −6"], correct: 1 },
      { id: "a2", text: "Khai triển (a + b)² được?", options: ["a² + b²", "a² + 2ab + b²", "a² − 2ab + b²", "2a + 2b"], correct: 1 },
      { id: "a3", text: "Tập nghiệm của x² − 9 = 0 là?", options: ["{3}", "{−3}", "{−3; 3}", "∅"], correct: 2 },
      { id: "a4", text: "Hệ số góc của đường thẳng y = 4x − 1 là?", options: ["−1", "4", "1", "−4"], correct: 1 },
      { id: "a5", text: "log₂ 8 bằng?", options: ["2", "3", "4", "8"], correct: 1 },
    ],
  },
  {
    id: "s2",
    subject: "TIẾNG ANH",
    title: "English Grammar – Unit 6",
    minutes: 8,
    questions: [
      { id: "b1", text: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], correct: 1 },
      { id: "b2", text: "I have lived here ___ 2019.", options: ["for", "since", "during", "from"], correct: 1 },
      { id: "b3", text: "If I ___ rich, I would travel the world.", options: ["am", "was", "were", "be"], correct: 2 },
      { id: "b4", text: "This book is ___ than that one.", options: ["interesting", "more interesting", "most interesting", "interestinger"], correct: 1 },
      { id: "b5", text: "They ___ football when it started to rain.", options: ["play", "played", "were playing", "have played"], correct: 2 },
    ],
  },
];

export const SEED_HISTORY: ExamHistory[] = [
  { id: "h1", title: "Dao động điều hòa", subject: "VẬT LÝ", score: 8.5, rank: 2, of: 12, date: "05/10/2026" },
  { id: "h2", title: "Ngữ pháp tiếng Anh B1", subject: "TIẾNG ANH", score: 7.0, rank: 5, of: 12, date: "02/10/2026" },
  { id: "h3", title: "Tích phân bội", subject: "TOÁN HỌC", score: 6.5, rank: 8, of: 15, date: "28/09/2026" },
];

export const BOT_NAMES = ["Hà My", "Quốc Bảo", "Thu Trang", "Đức Anh"];


export type QuizDocItem = {
  id: number | string;
  title: string;
  subject?: string;
  fileType?: string;
  pagesContent?: string[];
};

export async function loadUserQuizDocs(userId?: string): Promise<QuizDocItem[]> {
  const loaded: QuizDocItem[] = [];
  const seenIds = new Set<string | number>();

  // 1. Tải trước từ LocalStorage (phản hồi tức thì 0ms)
  const localKey = `permind_docs_${userId || "guest"}`;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const d of parsed) {
            const title = (d.title || d.original_name || d.filename || `Tài liệu ${d.id}`).trim();
            const pages = Array.isArray(d.pagesContent)
              ? d.pagesContent
              : Array.isArray(d.pages_content)
              ? d.pages_content
              : [];
            loaded.push({
              id: d.id,
              title,
              subject: d.subject || "",
              fileType: d.fileType || "PDF",
              pagesContent: pages,
            });
            seenIds.add(d.id);
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc cache tài liệu:", e);
    }
  }

  // 2. Nếu là người dùng có UUID thực tế, đồng bộ từ Supabase
  if (isValidUUID(userId)) {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, original_name, filename, subject, pages_content")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const d of data) {
          const title = (d.title || d.original_name || d.filename || `Tài liệu ${d.id}`).trim();
          const pages = Array.isArray(d.pages_content) ? d.pages_content : [];
          if (!seenIds.has(d.id)) {
            loaded.push({
              id: d.id,
              title,
              subject: d.subject || "",
              pagesContent: pages,
            });
            seenIds.add(d.id);
          } else {
            const existing = loaded.find((x) => x.id === d.id);
            if (existing && (!existing.pagesContent || existing.pagesContent.length === 0) && pages.length > 0) {
              existing.pagesContent = pages;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi lấy tài liệu từ Supabase cho quiz:", e);
    }
  }

  // 3. Fallback: Nếu hoàn toàn chưa có tài liệu nào, dùng INITIAL_DOCS làm tài liệu mẫu
  if (loaded.length === 0) {
    return INITIAL_DOCS.map((d) => ({
      id: d.id,
      title: d.title,
      subject: d.subject,
      fileType: d.fileType,
      pagesContent: d.pagesContent || [],
    }));
  }

  return loaded;
}

export async function fetchDocPagesContent(docId: number | string): Promise<string[]> {
  try {
    const numId = Number(docId);
    if (!isNaN(numId)) {
      const { data } = await supabase
        .from("documents")
        .select("pages_content")
        .eq("id", numId)
        .single();
      if (data && Array.isArray(data.pages_content)) {
        return data.pages_content;
      }
    }
  } catch (e) {
    console.warn("Lỗi tải pages_content:", e);
  }
  return [];
}

export const AI_DOCS = [
  { id: 1, title: "Toán cao cấp – Chương 4" },
  { id: 2, title: "Ngữ pháp tiếng Anh B1" },
  { id: 3, title: "Vật lý – Điện trường" },
];

export const LEVELS = ["Dễ", "Vừa", "Khó"];

/**
 * Thuật toán tạo số ngẫu nhiên có kiểm soát dựa trên Seed
 */
function seededRandom(seedState: { seed: number }) {
  const x = Math.sin(seedState.seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Đảo ngẫu nhiên thứ tự câu hỏi và thứ tự đáp án (A, B, C, D) cho từng thí sinh
 * Dựa trên seedKey (mã phòng thi + định danh người dùng) để đảm bảo:
 * 1. Mỗi thí sinh có thứ tự câu hỏi và đáp án khác biệt hoàn toàn
 * 2. Độc lập và ổn định khi thí sinh tải lại trang (F5) trong cùng phòng thi
 * 3. Tự động ánh xạ lại chỉ số đáp án đúng (correct) sau khi hoán vị đáp án
 */
export function shuffleQuestionsForUser(questions: Question[], seedKey: string): Question[] {
  if (!questions || questions.length === 0) return [];

  // Tạo seed số từ chuỗi seedKey
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash << 5) - hash + seedKey.charCodeAt(i);
    hash |= 0;
  }
  const seedState = { seed: Math.abs(hash) + 12345 };

  // 1. Sao chép sâu và đảo thứ tự các đáp án trong từng câu hỏi
  const qsWithShuffledOptions = questions.map((q) => {
    const indexedOptions = q.options.map((opt, idx) => ({
      text: opt,
      originalIdx: idx,
    }));

    // Fisher-Yates shuffle cho options
    for (let i = indexedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seedState) * (i + 1));
      const temp = indexedOptions[i];
      indexedOptions[i] = indexedOptions[j];
      indexedOptions[j] = temp;
    }

    const newOptions = indexedOptions.map((o) => o.text);
    const newCorrect = indexedOptions.findIndex((o) => o.originalIdx === q.correct);

    return {
      ...q,
      options: newOptions,
      correct: newCorrect !== -1 ? newCorrect : q.correct,
    };
  });

  // 2. Đảo ngẫu nhiên thứ tự các câu hỏi
  const shuffledQuestions = [...qsWithShuffledOptions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seedState) * (i + 1));
    const temp = shuffledQuestions[i];
    shuffledQuestions[i] = shuffledQuestions[j];
    shuffledQuestions[j] = temp;
  }

  return shuffledQuestions;
}

export function board(
  live: LiveExam,
  mine: MyExamState | null,
  userName: string,
  customQuestions?: Question[]
): LeaderboardRow[] {
  const qs = customQuestions && customQuestions.length > 0 ? customQuestions : live.set.questions;
  const rowsMap = new Map<string, { name: string; me?: boolean; answered: number; correct: number }>();

  // 1. Thêm các thí sinh thực tế tham gia qua mạng
  if (Array.isArray(live.participants)) {
    for (const p of live.participants) {
      rowsMap.set(p.name, {
        name: p.name,
        me: p.name === userName || p.isMe,
        answered: p.answered,
        correct: p.correct,
      });
    }
  }

  // 2. Thêm thí sinh bot mẫu nếu có
  if (Array.isArray(live.bots)) {
    for (const b of live.bots) {
      if (!rowsMap.has(b.name)) {
        rowsMap.set(b.name, {
          name: b.name,
          correct: b.correct,
          answered: b.answered,
        });
      }
    }
  }

  // 3. Nếu người dùng hiện tại đang làm bài thi (mine), cập nhật/bổ sung điểm số trực tiếp của người đó
  if (mine) {
    const ans = mine.answers;
    const answeredCount = Object.keys(ans).length;
    const correctCount = qs.filter((q) => ans[q.id] === q.correct).length;
    rowsMap.set(userName, {
      name: `${userName} (bạn)`,
      me: true,
      answered: answeredCount,
      correct: correctCount,
    });
  }

  const rows = Array.from(rowsMap.values());
  rows.sort((a, b) => b.correct - a.correct || b.answered - a.answered);
  return rows.map((r, i) => ({ ...r, rank: i + 1, score: score10(r.correct, qs.length) }));
}

export async function generateQuestionsApi({
  topic,
  docTitle,
  pagesContent = [],
  count,
  level,
}: {
  topic: string;
  docTitle?: string;
  pagesContent?: string[];
  count: number;
  level: string;
}): Promise<(Question & { keep: boolean; explanation?: string })[]> {
  const safeCount = Math.min(20, Math.max(1, count || 5));
  const safeLevel = ["Dễ", "Vừa", "Khó"].includes(level) ? level : "Vừa";

  if (!hasGeminiApiKey()) {
    throw new Error(
      "Chưa cấu hình Google Gemini API Key. Bạn vui lòng cài đặt API Key trong phần Trợ lý AI (ở Thư viện) để AI tạo câu hỏi."
    );
  }

  const generated = await generateExamQuestionsWithGemini({
    topic,
    docTitle,
    pagesContent,
    count: safeCount,
    level: safeLevel,
  });

  return generated.map((g) => ({
    id: uid(),
    keep: true,
    text: g.question,
    options: g.options,
    correct: g.correctAnswer,
    explanation: g.explanation,
  }));
}

export function validateQ(q: Question, i: number, label = "Câu"): string {
  if (!q.text.trim()) return `${label} ${i + 1}: chưa có nội dung câu hỏi.`;
  if (q.options.filter((o) => o.trim()).length < 2) return `${label} ${i + 1}: cần ít nhất 2 đáp án.`;
  if (!q.options[q.correct]?.trim()) return `${label} ${i + 1}: đáp án đúng đang để trống.`;
  return "";
}

export const isBlankQ = (q: Question) => !q.text.trim() && q.options.every((o) => !o.trim());

// ==============================================================================
// ĐỒNG BỘ BỘ CÂU HỎI & LỊCH SỬ THI THEO TÀI KHOẢN (SUPABASE + LOCALSTORAGE)
// ==============================================================================

/**
 * Tải danh sách bộ câu hỏi của người dùng (Cloud Supabase + LocalStorage Cache)
 */
export async function loadUserExamSets(userId?: string): Promise<ExamSet[]> {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_exam_sets_${userId || "guest"}`;

  // 1. Đọc nhanh từ localStorage (0ms phản hồi tức thì)
  let localSets: ExamSet[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localSets = JSON.parse(stored);
      }
    } catch {}
  }

  // Tài khoản khách: trả về dữ liệu mẫu hoặc local
  if (!isRealUser) {
    return localSets.length ? localSets : SEED_SETS;
  }

  // 2. Tài khoản thật: Đồng bộ dữ liệu từ bảng exam_sets trên Supabase
  try {
    const { data, error } = await supabase
      .from("exam_sets")
      .select("id, subject, title, minutes, questions, created_at")
      .eq("creator_user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudSets: ExamSet[] = data.map((d: any) => ({
        id: String(d.id),
        subject: d.subject || "",
        title: d.title || "",
        minutes: Number(d.minutes) || 10,
        questions: Array.isArray(d.questions) ? d.questions : [],
      }));

      // Hợp nhất dữ liệu (ưu tiên cloud, giữ thêm local nếu có bộ đề mới vừa tạo offline)
      const cloudIds = new Set(cloudSets.map((s) => s.id));
      const merged = [...cloudSets, ...localSets.filter((s) => !cloudIds.has(s.id))];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(localKey, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ bộ đề từ Supabase:", err);
  }

  return localSets;
}

/**
 * Lưu/cập nhật bộ câu hỏi vào LocalStorage và đồng bộ lên Supabase
 */
export async function saveUserExamSet(userId: string | undefined, set: ExamSet): Promise<void> {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_exam_sets_${userId || "guest"}`;

  // 1. Cập nhật localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(localKey);
      const prev: ExamSet[] = stored ? JSON.parse(stored) : [];
      const updated = prev.some((x) => x.id === set.id)
        ? prev.map((x) => (x.id === set.id ? set : x))
        : [set, ...prev];
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Lỗi lưu bộ đề vào localStorage:", e);
    }
  }

  // 2. Đồng bộ lên Supabase
  if (isRealUser && userId) {
    try {
      const { error } = await supabase.from("exam_sets").upsert({
        id: String(set.id),
        creator_user_id: userId,
        subject: set.subject || "Chung",
        title: set.title,
        minutes: set.minutes || 10,
        questions: set.questions || [],
      });
      if (error) {
        console.warn("Lưu bộ đề lên Supabase thông báo:", error.message);
      }
    } catch (err) {
      console.warn("Lỗi mạng khi lưu bộ đề lên Supabase:", err);
    }
  }
}

/**
 * Xóa bộ câu hỏi khỏi LocalStorage và Supabase
 */
export async function deleteUserExamSet(userId: string | undefined, setId: string): Promise<void> {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_exam_sets_${userId || "guest"}`;

  // 1. Xóa khỏi localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const prev: ExamSet[] = JSON.parse(stored);
        const updated = prev.filter((x) => x.id !== setId);
        localStorage.setItem(localKey, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Lỗi xóa bộ đề khỏi localStorage:", e);
    }
  }

  // 2. Xóa khỏi Supabase
  if (isRealUser && userId) {
    try {
      const { error } = await supabase
        .from("exam_sets")
        .delete()
        .eq("id", setId)
        .eq("creator_user_id", userId);
      if (error) {
        console.warn("Xóa bộ đề trên Supabase thông báo:", error.message);
      }
    } catch (err) {
      console.warn("Lỗi mạng khi xóa bộ đề trên Supabase:", err);
    }
  }
}

/**
 * Tải lịch sử làm bài kiểm tra của người dùng (Supabase + LocalStorage)
 */
export async function loadUserExamHistory(userId?: string): Promise<ExamHistory[]> {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_exam_history_${userId || "guest"}`;

  let localHistory: ExamHistory[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localHistory = JSON.parse(stored);
      }
    } catch {}
  }

  if (!isRealUser) {
    return localHistory.length ? localHistory : SEED_HISTORY;
  }

  try {
    const { data, error } = await supabase
      .from("exam_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudHistory: ExamHistory[] = data.map((d: any) => ({
        id: String(d.id),
        title: d.title,
        subject: d.subject || "KIỂM TRA",
        score: Number(d.score),
        rank: Number(d.rank) || 1,
        of: Number(d.of_total) || 1,
        date: d.created_at ? new Date(d.created_at).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
      }));

      const cloudIds = new Set(cloudHistory.map((h) => h.id));
      const merged = [...cloudHistory, ...localHistory.filter((h) => !cloudIds.has(h.id))];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(localKey, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ lịch sử thi từ Supabase:", err);
  }

  return localHistory;
}

/**
 * Lưu kết quả thi vào Supabase
 */
export async function saveUserExamHistory(userId: string | undefined, entry: ExamHistory): Promise<void> {
  const isRealUser = isValidUUID(userId);
  if (!isRealUser || !userId) return;

  try {
    const { error } = await supabase.from("exam_history").upsert({
      id: String(entry.id),
      user_id: userId,
      title: entry.title,
      subject: entry.subject,
      score: entry.score,
      rank: entry.rank,
      of_total: entry.of,
    });
    if (error) {
      console.warn("Lưu lịch sử thi lên Supabase thông báo:", error.message);
    }
  } catch (err) {
    console.warn("Lỗi mạng khi lưu lịch sử thi lên Supabase:", err);
  }
}

/**
 * Lấy lịch sử các phòng thi do tài khoản này tổ chức
 */
export async function loadUserHostedExams(userId?: string): Promise<HostedExamRecord[]> {
  const isRealUser = isValidUUID(userId);
  const localKey = isRealUser ? `permind_hosted_exams_${userId}` : "permind_hosted_exams_guest";
  let records: HostedExamRecord[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) records = JSON.parse(raw);
    } catch {}
  }
  return records;
}

/**
 * Lưu kết quả phòng thi đã tổ chức
 */
export async function saveUserHostedExam(userId: string | undefined, record: HostedExamRecord): Promise<void> {
  const isRealUser = isValidUUID(userId);
  const localKey = isRealUser ? `permind_hosted_exams_${userId}` : "permind_hosted_exams_guest";
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(localKey);
      const existing: HostedExamRecord[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((r) => r.id !== record.id && r.code !== record.code);
      const updated = [record, ...filtered];
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Lỗi lưu lịch sử phòng thi:", e);
    }
  }
}

/**
 * Xóa phòng thi khỏi danh sách đã tổ chức
 */
export async function deleteUserHostedExam(userId: string | undefined, recordId: string): Promise<HostedExamRecord[]> {
  const isRealUser = isValidUUID(userId);
  const localKey = isRealUser ? `permind_hosted_exams_${userId}` : "permind_hosted_exams_guest";
  let updated: HostedExamRecord[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(localKey);
      const existing: HostedExamRecord[] = raw ? JSON.parse(raw) : [];
      updated = existing.filter((r) => r.id !== recordId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

/**
 * Xóa một bản ghi lịch sử làm bài kiểm tra
 */
export async function deleteUserExamHistory(userId: string | undefined, historyId: string): Promise<ExamHistory[]> {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_exam_history_${userId || "guest"}`;
  let updated: ExamHistory[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(localKey);
      const existing: ExamHistory[] = raw ? JSON.parse(raw) : [];
      updated = existing.filter((h) => h.id !== historyId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
  }

  if (isRealUser && userId) {
    try {
      const { error } = await supabase
        .from("exam_history")
        .delete()
        .eq("id", historyId)
        .eq("user_id", userId);
      if (error) {
        console.warn("Xóa lịch sử thi trên Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Lỗi mạng khi xóa lịch sử thi:", err);
    }
  }

  return updated;
}
