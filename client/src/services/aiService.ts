// services/aiService.ts — Tương tác AI & Dữ liệu mẫu tài liệu
import {
  hasGeminiApiKey,
  askGeminiRAG,
  summarizeDocumentWithGemini,
  generateQuizWithGemini,
} from "./geminiClient";

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
  pagesContent?: string[];
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
      "Đổi biến số trong tích phân kép: Tọa độ cực x = r*cos(phi), y = r*sin(phi) với Jacobian là r.",
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
  { label: "Vẽ biểu đồ tiến độ", prompt: "Vẽ biểu đồ tiến độ học của tôi" },
  { label: "Tạo câu hỏi ôn tập", prompt: "Tạo 5 câu hỏi ôn tập từ tài liệu này" },
];

/**
 * Hàm tương tác AI thông minh hỗ trợ kết nối Google Gemini 2.0 Flash
 */
export async function askAI(
  prompt: string,
  doc: DocumentItem | null
): Promise<{ text: string; chart?: ChartItem[]; isGemini?: boolean }> {
  const lower = prompt.toLowerCase();

  // Yêu cầu vẽ biểu đồ tiến độ
  if (lower.includes("biểu đồ") || lower.includes("tiến độ")) {
    return {
      text: "Đây là biểu đồ tiến độ học tập và mức độ hoàn thành các tài liệu của bạn:",
      chart: INITIAL_DOCS.map((d) => ({
        label: d.subject,
        value: d.progress,
        color: d.color,
      })),
      isGemini: false,
    };
  }

  if (!doc) {
    return {
      text: "Bạn hãy chọn một tài liệu ở danh sách bên trái để mình có thể giải đáp chi tiết theo nội dung bài học nhé!",
      isGemini: false,
    };
  }

  const pages = doc.pagesContent || [];

  // NẾU ĐÃ CÓ GOOGLE GEMINI API KEY -> GỌI MÔ HÌNH TRỰC TIẾP
  if (hasGeminiApiKey()) {
    try {
      // 1. Tóm tắt tài liệu
      if (
        lower.includes("tóm tắt") ||
        lower.includes("khái quát") ||
        lower.includes("nội dung chính") ||
        lower.includes("ý chính")
      ) {
        const summary = await summarizeDocumentWithGemini({
          docTitle: doc.title,
          docSubject: doc.subject,
          pagesContent: pages,
        });
        return { text: summary, isGemini: true };
      }

      // 2. Tạo câu hỏi ôn tập
      if (
        lower.includes("câu hỏi") ||
        lower.includes("trắc nghiệm") ||
        lower.includes("ôn tập") ||
        lower.includes("đề thi")
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
              `👉 **Đáp án đúng:** ${q.correctAnswer} — *${q.explanation}*`
          )
          .join("\n\n---\n\n");

        return {
          text: `Bộ câu hỏi ôn tập do **Google Gemini AI** vừa khởi tạo từ tài liệu **"${doc.title}"**:\n\n${formatted}\n\n💡 *Gợi ý: Bạn có thể sao chép câu hỏi này hoặc chuyển sang tab "Bài kiểm tra" để thi đấu trực tiếp.*`,
          isGemini: true,
        };
      }

      // 3. Hỏi đáp RAG thông thường
      const response = await askGeminiRAG({
        question: prompt,
        docTitle: doc.title,
        docSubject: doc.subject,
        pagesContent: pages,
      });
      return { text: response, isGemini: true };
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("Lỗi gọi Gemini AI:", e.message);
      // Khi gặp lỗi từ Gemini (ví dụ Quota 429 hoặc Key sai), thông báo và fallback
      const errorNotice = `⚠️ *[Google Gemini AI: ${e.message}]*\n\nHệ thống tạm thời chuyển sang chế độ phân tích dự phòng cho tài liệu:\n\n`;
      const fallbackResult = await getFallbackResponse(prompt, doc, pages);
      return { text: errorNotice + fallbackResult.text, isGemini: false };
    }
  }

  // NẾU CHƯA CÓ KEY -> SỬ DỤNG CHẾ ĐỘ PHÂN TÍCH NỘI DUNG TÀI LIỆU DỰ PHÒNG
  return getFallbackResponse(prompt, doc, pages);
}

/**
 * Chế độ phản hồi thông minh dự phòng khi chưa cấu hình Gemini API Key
 */
async function getFallbackResponse(
  prompt: string,
  doc: DocumentItem,
  pages: string[]
): Promise<{ text: string; isGemini: boolean }> {
  await new Promise((r) => setTimeout(r, 650));
  const lower = prompt.toLowerCase();

  // Yêu cầu tóm tắt
  if (
    lower.includes("tóm tắt") ||
    lower.includes("khái quát") ||
    lower.includes("nội dung chính") ||
    lower.includes("ý chính")
  ) {
    if (pages.length > 0) {
      const summaryList = pages
        .map((p, i) => `• **Phần ${i + 1}:** ${p}`)
        .join("\n\n");
      return {
        text: `Dưới đây là tóm tắt các điểm trọng tâm của tài liệu **"${doc.title}"**:\n\n${summaryList}\n\n💡 *Mẹo: Bạn có thể bấm biểu tượng ⚙️ góc trên khung chat để nhập Google Gemini API Key và mở khóa phản hồi AI trực tiếp!*`,
        isGemini: false,
      };
    }
    return {
      text: `Tóm tắt nhanh tài liệu **"${doc.title}"** (${doc.subject}):\n\n• Tài liệu bao gồm ${doc.pagesCount || 15} trang kiến thức trọng tâm.\n• Tập trung vào lý thuyết nền tảng, các công thức cốt lõi và ví dụ minh họa trực quan.\n• Tiến độ ôn tập hiện tại của bạn là **${doc.progress}%**.`,
      isGemini: false,
    };
  }

  // Yêu cầu tạo câu hỏi ôn tập
  if (
    lower.includes("câu hỏi") ||
    lower.includes("trắc nghiệm") ||
    lower.includes("ôn tập") ||
    lower.includes("đề thi")
  ) {
    return {
      text:
        `Bộ câu hỏi ôn tập trọng tâm cho tài liệu **"${doc.title}"**:\n\n` +
        `**Câu 1:** Khái niệm cốt lõi nhất được đề cập trong tài liệu này là gì?\n` +
        `*A. Định nghĩa và nguyên lý cơ bản* | *B. Lịch sử phát triển* | *C. Danh mục tài liệu tham khảo* | *D. Bài tập mở rộng*\n\n` +
        `**Câu 2:** Phương pháp nào được ứng dụng để giải quyết bài toán trọng tâm?\n` +
        `*A. Biến đổi công thức chuẩn* | *B. Tra cứu thủ công* | *C. Ước lượng ngẫu nhiên* | *D. Loại trừ giả thuyết*\n\n` +
        `**Câu 3:** Ý nghĩa thực tiễn quan trọng nhất sau khi học xong phần này là gì?\n` +
        `*A. Nắm vững phương pháp luận và vận dụng vào bài thi thực tế*\n\n` +
        `👉 *Đáp án gợi ý: 1-A, 2-A, 3-A. Nhập Gemini API Key để AI sinh câu hỏi bám sát 100% nội dung từng trang nhé!*`,
      isGemini: false,
    };
  }

  // Khớp từ khóa theo nội dung từng trang (RAG keyword matching)
  if (pages.length > 0) {
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    const matched = pages.find((p) =>
      words.some((w) => p.toLowerCase().includes(w))
    );
    if (matched) {
      return {
        text: `Dựa vào tài liệu **"${doc.title}"**, nội dung liên quan trực tiếp đến câu hỏi của bạn:\n\n> "${matched}"\n\nNếu cần làm rõ công thức hoặc bài tập vận dụng, bạn cứ nhắn mình nhé!`,
        isGemini: false,
      };
    }
    return {
      text: `Đối với tài liệu **"${doc.title}"**, nội dung chính bao gồm:\n\n"${pages[0]}"\n\nBạn có thể hỏi cụ thể hơn về công thức, bài tập hoặc yêu cầu tóm tắt nhé!`,
      isGemini: false,
    };
  }

  return {
    text: `Trợ lý AI đã ghi nhận câu hỏi của bạn về tài liệu **"${doc.title}"** (${doc.subject}). Để nhận câu trả lời phân tích chuyên sâu bằng mô hình Gemini 2.0 Flash, bạn hãy bấm nút ⚙️ trên thanh tiêu đề để cài đặt API Key nhé!`,
    isGemini: false,
  };
}
