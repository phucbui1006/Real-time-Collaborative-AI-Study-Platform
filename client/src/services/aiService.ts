// services/aiService.ts — Tương tác AI & Trợ lý học tập đa năng (Hỏi đáp tự do & Theo tài liệu)
import {
  askGeminiRAG,
  summarizeDocumentWithGemini,
  generateQuizWithGemini,
  generateMindmapTextWithGemini,
} from "./geminiClient";

export type DocumentItem = {
  id: number;
  subject: string;
  title: string;
  progress?: number;
  color: string;
  icon: string;
  pagesCount?: number;
  fileSize?: string;
  fileType?: "PDF" | "DOCX" | "PPTX" | "IMG";
  updatedAt?: string;
  pagesContent?: string[];
  isPublic?: boolean;
  ownerUserId?: string | null;
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
  isGemini?: boolean;
};

export const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 1,
    subject: "TOÁN HỌC",
    title: "Toán cao cấp – Chương 4",
    progress: 72,
    color: "#0ea5e9",
    icon: "Σ",
    pagesCount: 38,
    fileSize: "4.2 MB",
    fileType: "PDF",
    updatedAt: "2 giờ trước",
    pagesContent: [
      "Tích phân kép trên miền chữ nhật: Định lý Fubini và cách tính tích phân lặp.",
      "Đổi biến số trong tích phân kép: Tọa độ cực $x = r \\cdot \\cos(\\varphi), y = r \\cdot \\sin(\\varphi)$ với Jacobian $J = r$.",
      "Ứng dụng hình học: Tính diện tích hình phẳng và thể tích vật thể không gian.",
    ],
  },
  {
    id: 2,
    subject: "NGOẠI NGỮ",
    title: "Ngữ pháp tiếng Anh B1",
    progress: 48,
    color: "#8b5cf6",
    icon: "Aa",
    pagesCount: 24,
    fileSize: "1.8 MB",
    fileType: "DOCX",
    updatedAt: "Hôm qua",
    pagesContent: [
      "Present Perfect Tense: Have/Has + V3/ed. Dùng cho hành động xảy ra trong quá khứ kéo dài đến hiện tại.",
      "Conditional Sentences: Type 1 (Điều kiện có thật) và Type 2 (Điều kiện không có thật ở hiện tại).",
    ],
  },
  {
    id: 3,
    subject: "VẬT LÝ",
    title: "Vật lý đại cương – Điện trường",
    progress: 86,
    color: "#f59e0b",
    icon: "⚡",
    pagesCount: 52,
    fileSize: "6.5 MB",
    fileType: "PPTX",
    updatedAt: "3 ngày trước",
    pagesContent: [
      "Điện trường: Khái niệm cường độ điện trường E = F/q và đường sức điện trường.",
      "Định luật Coulomb và nguyên lý chồng chất điện trường.",
      "Điện thế, hiệu điện thế U = E * d và năng lượng điện trường trong tụ điện.",
    ],
  },
  {
    id: 4,
    subject: "CÔNG NGHỆ",
    title: "Lập trình Web ReactJS & Vite",
    progress: 95,
    color: "#10b981",
    icon: "💻",
    pagesCount: 64,
    fileSize: "8.1 MB",
    fileType: "PDF",
    updatedAt: "Vừa xong",
    pagesContent: [
      "React Hooks nâng cao: useEffect, useMemo, useCallback và tối ưu re-render.",
      "Quản lý trạng thái toàn cục với Context API kết hợp Socket.io.",
      "Tối ưu tốc độ tải trang với Vite build và phân đoạn bundle (Code Splitting).",
    ],
  },
  {
    id: 5,
    subject: "TRÍ TUỆ NHÂN TẠO",
    title: "Mô hình RAG & Prompt Engineering",
    progress: 30,
    color: "#ec4899",
    icon: "🤖",
    pagesCount: 18,
    fileSize: "2.4 MB",
    fileType: "PDF",
    updatedAt: "1 tuần trước",
    pagesContent: [
      "Kiến trúc RAG (Retrieval-Augmented Generation): Kết hợp Vector Search và LLM.",
      "Kỹ thuật Prompting hiệu quả: Chain of Thought và Few-shot prompting.",
      "Đánh giá và kiểm soát độ ảo giác (Hallucination) trong các mô hình tạo sinh.",
    ],
  },
];

export const SUGGESTIONS = [
  { label: "Tóm tắt tài liệu", prompt: "Tóm tắt nội dung chính của tài liệu này" },
  { label: "Vẽ mô hình tư duy", prompt: "Vẽ mô hình tư duy cho tôi" },
  { label: "Tạo câu hỏi ôn tập", prompt: "Tạo 5 câu hỏi ôn tập từ tài liệu này" },
];

/**
 * Hàm tương tác AI thông minh:
 * - 100% tin nhắn được gửi trực tiếp tới Google Gemini API
 * - Duy trì đầy đủ ngữ cảnh lịch sử trò chuyện (Chat History)
 * - Chế độ Hybrid linh hoạt: bám sát tài liệu khi liên quan hoặc giải đáp mở rộng tự nhiên
 */
export async function askAI(
  prompt: string,
  doc: DocumentItem | null,
  history?: ChatMessage[]
): Promise<{ text: string; chart?: ChartItem[]; isGemini?: boolean }> {
  const lower = prompt.toLowerCase().trim();
  const pages = doc?.pagesContent || [];

  try {
    // 1. Phím tắt: Tóm tắt tài liệu (khi người dùng bấm nút hoặc yêu cầu tóm tắt tài liệu đang mở)
    if (
      (lower.includes("tóm tắt") || lower.includes("khái quát") || lower.includes("nội dung chính")) &&
      (lower.includes("tài liệu") || lower.includes("bài này") || lower.includes("bài học")) &&
      doc
    ) {
      const summary = await summarizeDocumentWithGemini({
        docTitle: doc.title,
        docSubject: doc.subject,
        pagesContent: pages,
      });
      return { text: summary, isGemini: true };
    }

    // 2. Phím tắt: Vẽ sơ đồ tư duy (Mindmap) cho tài liệu đang mở
    if (
      (lower.includes("tư duy") || lower.includes("sơ đồ") || lower.includes("mindmap")) &&
      (lower.includes("tài liệu") || lower.includes("bài này")) &&
      doc
    ) {
      const mindmap = await generateMindmapTextWithGemini({
        docTitle: doc.title,
        docSubject: doc.subject,
        pagesContent: pages,
      });
      return { text: mindmap, isGemini: true };
    }

    // 3. Phím tắt: Soạn bộ câu hỏi trắc nghiệm ôn tập từ tài liệu đang mở
    if (
      (lower.includes("trắc nghiệm") || (lower.includes("câu hỏi") && lower.includes("ôn tập"))) &&
      doc
    ) {
      const questions = await generateQuizWithGemini({
        docTitle: doc.title,
        pagesContent: pages,
        count: 3,
      });
      const formatted = questions
        .map(
          (q, idx) =>
            `**Câu ${idx + 1}:** ${q.question}\n` +
            `*A.* ${q.options.A}  \n` +
            `*B.* ${q.options.B}  \n` +
            `*C.* ${q.options.C}  \n` +
            `*D.* ${q.options.D}  \n\n` +
            `👉 **Đáp án:** ${q.correctAnswer} — *${q.explanation}*`
        )
        .join("\n\n---\n\n");

      return {
        text: `Mình vừa soạn nhanh bộ câu hỏi ôn tập cho tài liệu **"${doc.title}"** nè:\n\n${formatted}\n\n💡 *Bạn thử sức xem đúng được bao nhiêu câu nhé!*`,
        isGemini: true,
      };
    }

    // 4. MỌI TIN NHẮN & CÂU HỎI KHÁC: Gửi trực tiếp lên Google Gemini API kèm toàn bộ lịch sử hội thoại và Hybrid Mode
    const response = await askGeminiRAG({
      question: prompt,
      docTitle: doc?.title,
      docSubject: doc?.subject,
      pagesContent: pages,
      history,
    });

    return { text: response, isGemini: true };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Gemini API Error:", e.message);
    return {
      text: `Hiện tại chưa thể kết nối đến máy chủ Google Gemini AI (${e.message || "Lỗi mạng"}). Bạn vui lòng kiểm tra kết nối mạng hoặc thử lại sau giây lát nhé!`,
      isGemini: false,
    };
  }
}
