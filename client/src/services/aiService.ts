// services/aiService.ts — Tương tác AI & Dữ liệu mẫu tài liệu

export type DocumentItem = {
  id: number;
  subject: string;
  title: string;
  progress: number;
  color: string;
  icon: string;
};

export type ChartItem = {
  label: string;
  value: number;
  color: string;
};

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
  chart?: ChartItem[];
};

export const INITIAL_DOCS: DocumentItem[] = [
  { id: 1, subject: "TOÁN HỌC", title: "Toán cao cấp – Chương 4", progress: 72, color: "#0ea5e9", icon: "Σ" },
  { id: 2, subject: "NGOẠI NGỮ", title: "Ngữ pháp tiếng Anh B1", progress: 48, color: "#8b5cf6", icon: "Aa" },
  { id: 3, subject: "VẬT LÝ", title: "Vật lý – Điện trường", progress: 86, color: "#f59e0b", icon: "⚡" },
];

export const SUGGESTIONS = [
  { label: "Tóm tắt tài liệu", prompt: "Tóm tắt nội dung chính của tài liệu này" },
  { label: "Vẽ biểu đồ tiến độ", prompt: "Vẽ biểu đồ tiến độ học của tôi" },
  { label: "Tạo câu hỏi ôn tập", prompt: "Tạo 5 câu hỏi ôn tập từ tài liệu này" },
];

/**
 * Hàm mô phỏng hoặc gọi backend AI
 */
export async function askAI(prompt: string, doc: DocumentItem | null): Promise<{ text: string; chart?: ChartItem[] }> {
  await new Promise((r) => setTimeout(r, 900));
  if (/biểu đồ/i.test(prompt)) {
    return {
      text: "Đây là tiến độ học của bạn theo từng tài liệu:",
      chart: INITIAL_DOCS.map((d) => ({ label: d.subject, value: d.progress, color: d.color })),
    };
  }
  return {
    text: doc
      ? `Mình đang đọc "${doc.title}". (Kết quả từ AI sẽ hiển thị ở đây.)`
      : "Hãy chọn một tài liệu bên trái để mình trả lời chính xác hơn nhé.",
  };
}
