// services/aiService.ts — Tương tác AI & Dữ liệu mẫu tài liệu (Phong cách tự nhiên, thân thiện)
import {
  hasGeminiApiKey,
  askGeminiRAG,
  summarizeDocumentWithGemini,
  generateQuizWithGemini,
  generateMindmapTextWithGemini,
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
  { label: "Vẽ mô hình tư duy", prompt: "Vẽ mô hình tư duy cho tôi" },
  { label: "Tạo câu hỏi ôn tập", prompt: "Tạo 5 câu hỏi ôn tập từ tài liệu này" },
];

/**
 * Hàm tương tác AI thông minh hỗ trợ kết nối Google Gemini 2.0 Flash
 */
export async function askAI(
  prompt: string,
  doc: DocumentItem | null
): Promise<{ text: string; chart?: ChartItem[]; isGemini?: boolean }> {
  const lower = prompt.toLowerCase().trim();

  // Yêu cầu vẽ biểu đồ tiến độ
  if (lower.includes("biểu đồ") || lower.includes("tiến độ")) {
    return {
      text: "Đây là biểu đồ tiến độ học tập và mức độ hoàn thành các tài liệu của bạn nè:",
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
      text: "Bạn hãy chọn một tài liệu ở danh sách bên trái để tụi mình cùng thảo luận và ôn bài nhé! 😊",
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

      // 2. Vẽ mô hình tư duy / Sơ đồ tư duy (Mindmap)
      if (
        lower.includes("tư duy") ||
        lower.includes("sơ đồ") ||
        lower.includes("mô hình") ||
        lower.includes("mindmap")
      ) {
        const mindmap = await generateMindmapTextWithGemini({
          docTitle: doc.title,
          docSubject: doc.subject,
          pagesContent: pages,
        });
        return { text: mindmap, isGemini: true };
      }

      // 3. Tạo câu hỏi ôn tập
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
              `👉 **Đáp án:** ${q.correctAnswer} — *${q.explanation}*`
          )
          .join("\n\n---\n\n");

        return {
          text: `Mình vừa nhờ **Google Gemini AI** soạn nhanh bộ câu hỏi ôn tập cho tài liệu **"${doc.title}"** nè:\n\n${formatted}\n\n💡 *Bạn thử làm xem đúng được mấy câu nhé!*`,
          isGemini: true,
        };
      }

      // 4. Hỏi đáp RAG / Trò chuyện thông thường
      const response = await askGeminiRAG({
        question: prompt,
        docTitle: doc.title,
        docSubject: doc.subject,
        pagesContent: pages,
      });
      return { text: response, isGemini: true };
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("Gemini API log:", e.message);
      // Khi gặp lỗi kết nối API, phản hồi tự nhiên, thân thiện mà không in mã lỗi máy móc
      const fallbackResult = await getFallbackResponse(prompt, doc, pages);
      return { text: fallbackResult.text, isGemini: false };
    }
  }

  // NẾU CHƯA CÓ KEY -> SỬ DỤNG PHẢN HỒI THÂN THIỆN THÔNG MINH
  return getFallbackResponse(prompt, doc, pages);
}

/**
 * Chế độ phản hồi thông minh thân thiện, tự nhiên
 */
async function getFallbackResponse(
  prompt: string,
  doc: DocumentItem,
  pages: string[]
): Promise<{ text: string; isGemini: boolean }> {
  await new Promise((r) => setTimeout(r, 450));
  const lower = prompt.toLowerCase().trim();

  // 1. Chào hỏi / giao tiếp thông thường
  const isGreeting =
    /^(chào|hello|hi|hey|xin chào|chào bạn|alo|hé lô)/i.test(lower) ||
    lower === "chào" ||
    lower === "hello" ||
    lower === "hi";

  if (isGreeting) {
    return {
      text: `Chào bạn nha! Rất vui được đồng hành học tập cùng bạn hôm nay 😊.\n\nTụi mình đang xem tài liệu **"${doc.title}"**. Bạn có thắc mắc gì, muốn mình tóm tắt bài giảng hay vẽ sơ đồ tư duy thì cứ thoải mái nhắn mình nhé! ✨`,
      isGemini: false,
    };
  }

  // 2. Hỏi danh tính
  if (lower.includes("bạn là ai") || lower.includes("tên gì") || lower.includes("giới thiệu")) {
    return {
      text: `Mình là **Trợ lý AI PeerMind** — bạn đồng hành học tập cùng bàn 24/7 của bạn nè! Mình có thể cùng bạn đọc tài liệu, tóm tắt bài học, vẽ sơ đồ tư duy hay soạn câu hỏi trắc nghiệm ôn thi bất cứ lúc nào. Cứ tự nhiên coi mình như bạn cùng lớp nhé! 🚀`,
      isGemini: false,
    };
  }

  // 3. Yêu cầu vẽ mô hình tư duy / Sơ đồ tư duy
  if (
    lower.includes("tư duy") ||
    lower.includes("sơ đồ") ||
    lower.includes("mô hình") ||
    lower.includes("mindmap")
  ) {
    const branches =
      pages.length > 0
        ? pages
            .map((p, i) => {
              const parts = p.split(":");
              const mainTitle = parts[0]?.trim() || `Phần ${i + 1}`;
              const subDetail = parts[1]?.trim() || p;
              return `├── 🌿 **Nhánh ${i + 1}: ${mainTitle}**\n│    └── 📌 ${subDetail}`;
            })
            .join("\n")
        : `├── 🌿 **1. Khái niệm & Nguyên lý nền tảng**\n│    └── 📌 Định nghĩa cốt lõi và các quy tắc áp dụng\n├── 🌿 **2. Phương pháp giải & Thuật toán**\n│    └── 📌 Trình tự từng bước giải bài toán mẫu\n└── 🌿 **3. Điểm lưu ý & Bẫy thường gặp**\n     └── 💡 Mẹo làm bài nhanh và chính xác`;

    return {
      text:
        `Dưới đây là sơ đồ tư duy (Mindmap) trực quan cho bài học **"${doc.title}"** nè bạn: 🧠✨\n\n` +
        `📦 **CHỦ ĐỀ: ${doc.title.toUpperCase()}**\n` +
        branches +
        `\n\n💡 *Nhìn theo sơ đồ này bạn sẽ thấy toàn bộ cấu trúc bài học liên kết với nhau rất mạch lạc! Cần mình đào sâu nhánh nào thì cứ nhắn nhé!*`,
      isGemini: false,
    };
  }

  // 4. Yêu cầu tóm tắt
  if (
    lower.includes("tóm tắt") ||
    lower.includes("khái quát") ||
    lower.includes("nội dung chính") ||
    lower.includes("ý chính")
  ) {
    if (pages.length > 0) {
      const summaryList = pages
        .map((p, i) => `• **Ý ${i + 1}:** ${p}`)
        .join("\n\n");
      return {
        text: `Dưới đây là tóm tắt nhanh những điểm đáng nhớ nhất của tài liệu **"${doc.title}"** nè:\n\n${summaryList}\n\n💡 *Bạn muốn mình giải thích chi tiết hơn phần nào không?*`,
        isGemini: false,
      };
    }
    return {
      text: `Tóm tắt nhanh tài liệu **"${doc.title}"** (${doc.subject}):\n\n• Tài liệu bao gồm ${doc.pagesCount || 15} trang kiến thức trọng tâm.\n• Tập trung vào lý thuyết nền tảng, công thức cốt lõi và bài tập áp dụng.\n• Tiến độ ôn tập hiện tại của bạn là **${doc.progress}%**. Cố lên nha!`,
      isGemini: false,
    };
  }

  // 5. Yêu cầu tạo câu hỏi ôn tập
  if (
    lower.includes("câu hỏi") ||
    lower.includes("trắc nghiệm") ||
    lower.includes("ôn tập") ||
    lower.includes("đề thi")
  ) {
    return {
      text:
        `Mình gửi bạn 3 câu đố vui ôn tập nhanh cho tài liệu **"${doc.title}"** nè:\n\n` +
        `**Câu 1:** Khái niệm cốt lõi nhất được đề cập trong bài này là gì?\n` +
        `*A. Định nghĩa và nguyên lý cơ bản* | *B. Lịch sử phát triển* | *C. Danh mục tài liệu tham khảo* | *D. Bài tập mở rộng*\n\n` +
        `**Câu 2:** Phương pháp nào được ứng dụng để giải quyết bài toán trọng tâm?\n` +
        `*A. Biến đổi công thức chuẩn* | *B. Tra cứu thủ công* | *C. Ước lượng ngẫu nhiên* | *D. Loại trừ giả thuyết*\n\n` +
        `**Câu 3:** Ý nghĩa thực tiễn quan trọng nhất sau khi học xong phần này là gì?\n` +
        `*A. Nắm vững phương pháp luận và vận dụng vào bài thi thực tế*\n\n` +
        `👉 *Đáp án gợi ý: 1-A, 2-A, 3-A. Bạn thấy sao, có muốn thử sức thêm không?*`,
      isGemini: false,
    };
  }

  // 6. Khớp từ khóa theo nội dung từng trang
  if (pages.length > 0) {
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    const matched = pages.find((p) =>
      words.some((w) => p.toLowerCase().includes(w))
    );
    if (matched) {
      return {
        text: `Về câu hỏi của bạn trong tài liệu **"${doc.title}"**, trong bài có đoạn này rất đáng lưu ý nè:\n\n> "${matched}"\n\nBạn có cần mình lấy thêm ví dụ đời thường để dễ nhớ hơn không? 😊`,
        isGemini: false,
      };
    }
    return {
      text: `Đối với tài liệu **"${doc.title}"**, nội dung chính bao gồm:\n\n"${pages[0]}"\n\nBạn có thể hỏi cụ thể hơn về công thức, bài tập hoặc yêu cầu tóm tắt nhé!`,
      isGemini: false,
    };
  }

  return {
    text: `Mình đã nghe rõ câu hỏi của bạn về **"${doc.title}"** rồi nha! Bạn muốn mình giúp tóm tắt bài giảng, vẽ sơ đồ tư duy hay làm vài câu đố vui trắc nghiệm cùng bạn nè? 😊`,
    isGemini: false,
  };
}
