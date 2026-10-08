// services/aiService.ts — Tương tác AI & Dữ liệu mẫu tài liệu

export type DocumentItem = {
  id: number;
  subject: string;
  title: string;
  progress: number;
  color: string;
  icon: string;
  pagesCount?: number;
  fileSize?: string;
  fileType?: "PDF" | "DOCX" | "PPTX" | "IMG";
  updatedAt?: string;
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
  { id: 1, subject: "TOÁN HỌC", title: "Toán cao cấp – Chương 4", progress: 72, color: "#0ea5e9", icon: "Σ", pagesCount: 38, fileSize: "4.2 MB", fileType: "PDF", updatedAt: "2 giờ trước" },
  { id: 2, subject: "NGOẠI NGỮ", title: "Ngữ pháp tiếng Anh B1", progress: 48, color: "#8b5cf6", icon: "Aa", pagesCount: 24, fileSize: "1.8 MB", fileType: "DOCX", updatedAt: "Hôm qua" },
  { id: 3, subject: "VẬT LÝ", title: "Vật lý đại cương – Điện trường", progress: 86, color: "#f59e0b", icon: "⚡", pagesCount: 52, fileSize: "6.5 MB", fileType: "PPTX", updatedAt: "3 ngày trước" },
  { id: 4, subject: "CÔNG NGHỆ", title: "Lập trình Web ReactJS & Vite", progress: 95, color: "#10b981", icon: "💻", pagesCount: 64, fileSize: "8.1 MB", fileType: "PDF", updatedAt: "Vừa xong" },
  { id: 5, subject: "TRÍ TUỆ NHÂN TẠO", title: "Mô hình RAG & Prompt Engineering", progress: 30, color: "#ec4899", icon: "🤖", pagesCount: 18, fileSize: "2.4 MB", fileType: "PDF", updatedAt: "1 tuần trước" },
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
