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

export type ExamHistory = {
  id: string;
  title: string;
  subject: string;
  score: number;
  rank: number;
  of: number;
  date: string;
};

export type LiveBot = {
  name: string;
  answered: number;
  correct: number;
};

export type LiveExam = {
  set: ExamSet;
  code: string;
  minutes: number;
  endAt: number;
  status: "running" | "ended";
  bots: LiveBot[];
};

export type MyExamState = {
  answers: Record<string, number>;
  done: boolean;
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
};

export type LeaderboardRow = {
  name: string;
  correct: number;
  answered: number;
  me?: boolean;
  rank: number;
  score: number;
};

export const DARK = "#1e293b";
export const PURPLE = "#7c3aed";
export const BTN = "rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer";
export const BTN_OUT = "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer";
export const INP = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500";

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

export const AI_DOCS = [
  { id: 1, title: "Toán cao cấp – Chương 4" },
  { id: 2, title: "Ngữ pháp tiếng Anh B1" },
  { id: 3, title: "Vật lý – Điện trường" },
];

export const LEVELS = ["Dễ", "Vừa", "Khó"];

export function board(live: LiveExam, mine: MyExamState | null, userName: string): LeaderboardRow[] {
  const qs = live.set.questions;
  const rows: { name: string; me?: boolean; answered: number; correct: number }[] = live.bots.map((b) => ({
    name: b.name,
    correct: b.correct,
    answered: b.answered,
  }));
  if (mine) {
    const ans = mine.answers;
    rows.push({
      name: `${userName} (bạn)`,
      me: true,
      answered: Object.keys(ans).length,
      correct: qs.filter((q) => ans[q.id] === q.correct).length,
    });
  }
  rows.sort((a, b) => b.correct - a.correct || b.answered - a.answered);
  return rows.map((r, i) => ({ ...r, rank: i + 1, score: score10(r.correct, qs.length) }));
}

export async function generateQuestionsApi({
  topic,
  docTitle,
  count,
  level,
}: {
  topic: string;
  docTitle: string;
  count: number;
  level: string;
}): Promise<(Question & { keep: boolean })[]> {
  await new Promise((r) => setTimeout(r, 1200));
  const base = topic.trim() || docTitle;
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    keep: true,
    correct: i % 4,
    text: `[Mẫu · ${level}] Nhận định nào sau đây đúng về “${base}”? (câu ${i + 1})`,
    options: ["Nhận định A", "Nhận định B", "Nhận định C", "Nhận định D"],
  }));
}

export function validateQ(q: Question, i: number, label = "Câu"): string {
  if (!q.text.trim()) return `${label} ${i + 1}: chưa có nội dung câu hỏi.`;
  if (q.options.filter((o) => o.trim()).length < 2) return `${label} ${i + 1}: cần ít nhất 2 đáp án.`;
  if (!q.options[q.correct]?.trim()) return `${label} ${i + 1}: đáp án đúng đang để trống.`;
  return "";
}

export const isBlankQ = (q: Question) => !q.text.trim() && q.options.every((o) => !o.trim());
