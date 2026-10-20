// services/aiService.ts — Tương tác AI & Trợ lý học tập đa năng (Hỏi đáp tự do & Theo tài liệu)
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
 * Hàm tương tác AI thông minh:
 * - Hỗ trợ cả câu hỏi kiến thức tổng quát (Toán, Lý, Lập trình, Tiếng Anh, Đời sống...)
 * - Hỗ trợ phân tích tài liệu khi được yêu cầu (Tóm tắt, Mindmap, Quiz)
 * - Tự động fallback thông minh khi chưa có API key hoặc kết nối bị gián đoạn
 */
export async function askAI(
  prompt: string,
  doc: DocumentItem | null
): Promise<{ text: string; chart?: ChartItem[]; isGemini?: boolean }> {
  const lower = prompt.toLowerCase().trim();

  // 1. Yêu cầu vẽ biểu đồ tiến độ học tập
  if (lower.includes("biểu đồ") || (lower.includes("tiến độ") && lower.includes("học tập"))) {
    return {
      text: "Đây là biểu đồ tiến độ học tập và mức độ hoàn thành các tài liệu của bạn nè: 📊✨",
      chart: INITIAL_DOCS.map((d) => ({
        label: d.subject,
        value: d.progress,
        color: d.color,
      })),
      isGemini: false,
    };
  }

  const pages = doc?.pagesContent || [];

  // 2. KẾT NỐI GOOGLE GEMINI NẾU CÓ KEY
  if (hasGeminiApiKey()) {
    try {
      // A. Tóm tắt tài liệu
      if (
        (lower.includes("tóm tắt") || lower.includes("khái quát") || lower.includes("nội dung chính")) &&
        (lower.includes("tài liệu") || lower.includes("bài này") || lower.includes("bài học") || doc)
      ) {
        if (!doc) {
          return {
            text: "Bạn hãy chọn một tài liệu ở danh sách bên trái để mình đọc và tóm tắt chi tiết giúp bạn nhé! 😊",
            isGemini: false,
          };
        }
        const summary = await summarizeDocumentWithGemini({
          docTitle: doc.title,
          docSubject: doc.subject,
          pagesContent: pages,
        });
        return { text: summary, isGemini: true };
      }

      // B. Vẽ sơ đồ tư duy (Mindmap)
      if (
        (lower.includes("tư duy") || lower.includes("sơ đồ") || lower.includes("mindmap")) &&
        (lower.includes("tài liệu") || lower.includes("bài này") || doc)
      ) {
        if (!doc) {
          return {
            text: "Bạn hãy chọn một bài học ở danh sách bên trái để mình phác họa sơ đồ tư duy phân nhánh trực quan nhé! 🧠✨",
            isGemini: false,
          };
        }
        const mindmap = await generateMindmapTextWithGemini({
          docTitle: doc.title,
          docSubject: doc.subject,
          pagesContent: pages,
        });
        return { text: mindmap, isGemini: true };
      }

      // C. Tạo câu hỏi trắc nghiệm ôn tập
      if (
        lower.includes("trắc nghiệm") ||
        (lower.includes("câu hỏi") && (lower.includes("ôn tập") || lower.includes("đề thi") || lower.includes("kiểm tra")))
      ) {
        if (!doc) {
          return {
            text: "Bạn chọn giúp mình một tài liệu bên trái để mình soạn bộ đề trắc nghiệm chuẩn kiến thức cho bạn luyện tập nhé! 📝",
            isGemini: false,
          };
        }
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

      // D. Trò chuyện & Giải đáp kiến thức tổng quát / Trả lời tự do (General Q&A)
      const response = await askGeminiRAG({
        question: prompt,
        docTitle: doc?.title,
        docSubject: doc?.subject,
        pagesContent: pages,
      });
      return { text: response, isGemini: true };
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("Gemini API fallback trigger:", e.message);
      // Khi API gặp sự cố, tự động dùng bộ tri thức nội hàm phong phú, không làm gián đoạn người dùng
      return getFallbackResponse(prompt, doc, pages);
    }
  }

  // 3. CHẾ ĐỘ NỘI HÀM THÔNG MINH (KHI CHƯA CÓ GEMINI HOẶC NGOẠI TUYẾN)
  return getFallbackResponse(prompt, doc, pages);
}

/**
 * BỘ NÃO AI DỰ PHÒNG THÔNG MINH (Offline Knowledge Base & Chatbot):
 * Trả lời tự nhiên, chính xác các câu hỏi Toán học, Hình học, Lập trình, Tiếng Anh, Đời sống
 * mà KHÔNG bị bó buộc vô lý vào nội dung tài liệu.
 */
async function getFallbackResponse(
  prompt: string,
  doc: DocumentItem | null,
  pages: string[]
): Promise<{ text: string; isGemini: boolean }> {
  await new Promise((r) => setTimeout(r, 350));
  const lower = prompt.toLowerCase().trim();

  // -------------------------------------------------------------
  // NHÓM 1: CÔNG THỨC TOÁN HỌC & HÌNH HỌC PHỔ THÔNG
  // -------------------------------------------------------------

  // 1.1 Hình tròn (Chu vi, diện tích, bán kính, đường kính)
  if (
    lower.includes("hình tròn") ||
    (lower.includes("chu vi") && lower.includes("tròn")) ||
    (lower.includes("diện tích") && lower.includes("tròn"))
  ) {
    return {
      text:
        `Dạ, công thức đầy đủ liên quan đến **hình tròn** đây nè bạn: 📐✨\n\n` +
        `### 1. Chu vi hình tròn:\n` +
        `$$C = 2 \\times \\pi \\times r$$\n` +
        `Hoặc nếu bạn biết đường kính ($d = 2r$):\n` +
        `$$C = \\pi \\times d$$\n\n` +
        `### 2. Diện tích hình tròn:\n` +
        `$$S = \\pi \\times r^2$$\n\n` +
        `**Trong đó:**\n` +
        `- **$C$**: Chu vi hình tròn (đơn vị: cm, m...)\n` +
        `- **$S$**: Diện tích hình tròn (đơn vị: $\\text{cm}^2$, $\\text{m}^2$...)\n` +
        `- **$r$**: Bán kính hình tròn (khoảng cách từ tâm đến mép đường tròn)\n` +
        `- **$d$**: Đường kính ($d = 2r$)\n` +
        `- **$\\pi$ (Số Pi)**: Hằng số xấp xỉ $\\approx 3.14159$\n\n` +
        `💡 **Ví dụ minh họa:**\n` +
        `Nếu một hình tròn có bán kính $r = 5\\text{ cm}$:\n` +
        `- Chu vi: $C = 2 \\times 3.14 \\times 5 = \\mathbf{31.4\\text{ cm}}$\n` +
        `- Diện tích: $S = 3.14 \\times 5^2 = \\mathbf{78.5\\text{ cm}^2}$\n\n` +
        `Bạn có bài toán cụ thể nào cần mình giải từng bước cùng bạn không? 😊`,
      isGemini: false,
    };
  }

  // 1.2 Hình tam giác
  if (lower.includes("tam giác") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức về **hình tam giác** đây bạn nhé: 📐\n\n` +
        `### 1. Chu vi hình tam giác:\n` +
        `$$P = a + b + c$$\n` +
        `*(Tổng độ dài 3 cạnh)*\n\n` +
        `### 2. Diện tích hình tam giác thường:\n` +
        `$$S = \\frac{1}{2} \\times a \\times h$$\n` +
        `*(Bằng nửa tích của chiều cao nhân với cạnh đáy tương ứng)*\n\n` +
        `### 3. Các trường hợp đặc biệt:\n` +
        `- **Tam giác vuông**: $S = \\frac{1}{2} \\times a \\times b$ *(tích hai cạnh góc vuông chia 2)*.\n` +
        `- **Định lý Heron (khi biết 3 cạnh)**: $S = \\sqrt{p(p-a)(p-b)(p-c)}$ với nửa chu vi $p = \\frac{a+b+c}{2}$.\n\n` +
        `Cần áp dụng vào bài tập nào thì nhắn số đo cho mình tính cùng nha! ✨`,
      isGemini: false,
    };
  }

  // 1.3 Hình chữ nhật & Hình vuông
  if (lower.includes("chữ nhật") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức **hình chữ nhật** cực kỳ dễ nhớ nè: 📦\n\n` +
        `- **Chu vi**: $P = (a + b) \\times 2$ *(dài cộng rộng cùng đơn vị đo rồi nhân 2)*\n` +
        `- **Diện tích**: $S = a \\times b$ *(dài nhân rộng)*\n\n` +
        `Ví dụ: Chiều dài $8\\text{ cm}$, chiều rộng $5\\text{ cm}$ thì chu vi là $26\\text{ cm}$ và diện tích là $40\\text{ cm}^2$ nha!`,
      isGemini: false,
    };
  }

  if (lower.includes("hình vuông") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức **hình vuông** (cạnh $a$): ⏹️\n\n` +
        `- **Chu vi**: $P = a \\times 4$ *(độ dài một cạnh nhân 4)*\n` +
        `- **Diện tích**: $S = a^2$ *(cạnh nhân chính nó)*\n` +
        `- **Đường chéo**: $d = a\\sqrt{2}$ *(áp dụng định lý Pytago)*.`,
      isGemini: false,
    };
  }

  // 1.4 Hình thang & Hình thoi
  if (lower.includes("hình thang") && (lower.includes("diện tích") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức tính **diện tích hình thang**: 📐\n\n` +
        `$$S = \\frac{(a + b) \\times h}{2}$$\n\n` +
        `💡 *Mẹo nhớ vui: "Muốn tính diện tích hình thang / Đáy lớn đáy nhỏ ta mang cộng vào / Thế rồi nhân với chiều cao / Chia đôi lấy nửa thế nào cũng ra!"* 😄`,
      isGemini: false,
    };
  }

  // 1.5 Định lý Pytago
  if (lower.includes("pytago") || lower.includes("pythagoras") || lower.includes("pitago")) {
    return {
      text:
        `**Định lý Pytago (Pythagoras)** trong tam giác vuông: 📐\n\n` +
        `$$a^2 + b^2 = c^2$$\n\n` +
        `**Phát biểu:** Trong một tam giác vuông, bình phương cạnh huyền ($c$) luôn bằng tổng bình phương hai cạnh góc vuông ($a$ và $b$).\n\n` +
        `⭐ **Các bộ 3 số Pytago kinh điển:**\n` +
        `- $(3, 4, 5)$ vì $3^2 + 4^2 = 9 + 16 = 25 = 5^2$\n` +
        `- $(5, 12, 13)$\n` +
        `- $(6, 8, 10)$\n` +
        `- $(7, 24, 25)$`,
      isGemini: false,
    };
  }

  // 1.6 Phương trình bậc 2
  if (
    lower.includes("bậc 2") ||
    lower.includes("bậc hai") ||
    lower.includes("delta") ||
    lower.includes("ax^2") ||
    lower.includes("phương trình bậc")
  ) {
    return {
      text:
        `Cách giải **phương trình bậc hai** $ax^2 + bx + c = 0$ ($a \\neq 0$): 🧮\n\n` +
        `1. Tính biệt thức Delta: $$\\Delta = b^2 - 4ac$$\n` +
        `2. Biện luận theo $\\Delta$:\n` +
        `- **$\\Delta > 0$**: Phương trình có 2 nghiệm phân biệt:\n` +
        `  $$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$\n` +
        `- **$\\Delta = 0$**: Phương trình có nghiệm kép:\n` +
        `  $$x_1 = x_2 = -\\frac{b}{2a}$$\n` +
        `- **$\\Delta < 0$**: Phương trình vô nghiệm trên tập số thực $\\mathbb{R}$.\n\n` +
        `💡 *Hệ thức Vi-ét: $x_1 + x_2 = -\\frac{b}{a}$ và $x_1 \\times x_2 = \\frac{c}{a}$.*`,
      isGemini: false,
    };
  }

  // 1.7 Thể tích hình khối
  if (lower.includes("thể tích")) {
    if (lower.includes("cầu")) {
      return {
        text: `Thể tích **hình cầu** bán kính $r$: $$V = \\frac{4}{3}\\pi r^3$$ và Diện tích mặt cầu là $$S = 4\\pi r^2$$ nha bạn! ⚽`,
        isGemini: false,
      };
    }
    if (lower.includes("trụ")) {
      return {
        text: `Thể tích **hình trụ** có bán kính đáy $r$ và chiều cao $h$: $$V = \\pi r^2 h$$ (Bằng diện tích đáy nhân chiều cao) 🥫`,
        isGemini: false,
      };
    }
    if (lower.includes("nón")) {
      return {
        text: `Thể tích **hình nón**: $$V = \\frac{1}{3}\\pi r^2 h$$ (Bằng một phần ba thể tích hình trụ cùng đáy và chiều cao) 🍦`,
        isGemini: false,
      };
    }
  }

  // 1.8 Vận tốc, quãng đường, thời gian
  if (
    lower.includes("vận tốc") ||
    (lower.includes("quãng đường") && lower.includes("thời gian")) ||
    lower.includes("s = v")
  ) {
    return {
      text:
        `Công thức chuyển động đều căn bản: 🚗💨\n\n` +
        `- **Quãng đường**: $s = v \\times t$\n` +
        `- **Vận tốc**: $v = \\frac{s}{t}$\n` +
        `- **Thời gian**: $t = \\frac{s}{v}$\n\n` +
        `*Lưu ý đổi đồng nhất đơn vị:* km/h tương ứng với km và giờ, còn m/s tương ứng với m và giây ($1\\text{ m/s} = 3.6\\text{ km/h}$).`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 2: LẬP TRÌNH & CÔNG NGHỆ THÔNG TIN
  // -------------------------------------------------------------

  if (
    lower.includes("react") ||
    lower.includes("hook") ||
    lower.includes("usestate") ||
    lower.includes("useeffect") ||
    lower.includes("usememo")
  ) {
    return {
      text:
        `Trong **ReactJS**, các Hooks phổ biến nhất bao gồm: 💻⚛️\n\n` +
        `1. **\`useState\`**: Quản lý trạng thái cục bộ của component.\n` +
        `   \`\`\`tsx\n` +
        `   const [count, setCount] = useState<number>(0);\n` +
        `   \`\`\`\n` +
        `2. **\`useEffect\`**: Thực thi side-effects (gọi API, lắng nghe event, dọn dẹp timer).\n` +
        `   \`\`\`tsx\n` +
        `   useEffect(() => {\n` +
        `     console.log("Component mounted hoặc count thay đổi!");\n` +
        `   }, [count]);\n` +
        `   \`\`\`\n` +
        `3. **\`useMemo\` & \`useCallback\`**: Tối ưu hiệu năng, lưu bộ nhớ đệm (cache) kết quả tính toán hoặc tham chiếu hàm để tránh re-render thừa.\n\n` +
        `Bạn đang muốn viết component gì thế, gửi mình xem thử nhé!`,
      isGemini: false,
    };
  }

  if (lower.includes("javascript") || lower.includes("async") || lower.includes("await") || lower.includes("promise")) {
    return {
      text:
        `Xử lý **bất đồng bộ (Asynchronous)** trong JavaScript: ⚡\n\n` +
        `- **\`Promise\`**: Đại diện cho một thao tác sẽ hoàn tất trong tương lai (Pending -> Fulfilled / Rejected).\n` +
        `- **\`async/await\`**: Cú pháp hiện đại giúp viết code bất đồng bộ trông mạch lạc, tuần tự như code đồng bộ:\n` +
        `\`\`\`javascript\n` +
        `async function fetchData() {\n` +
        `  try {\n` +
        `    const res = await fetch("https://api.example.com/data");\n` +
        `    const data = await res.json();\n` +
        `    return data;\n` +
        `  } catch (error) {\n` +
        `    console.error("Lỗi:", error);\n` +
        `  }\n` +
        `}\n` +
        `\`\`\``,
      isGemini: false,
    };
  }

  if (lower.includes("git") && (lower.includes("commit") || lower.includes("push") || lower.includes("branch") || lower.includes("lệnh"))) {
    return {
      text:
        `Các lệnh **Git** thường dùng nhất hàng ngày nè bạn: 🐙\n\n` +
        `- \`git status\`: Xem trạng thái các file đã sửa đổi.\n` +
        `- \`git add .\`: Thêm tất cả thay đổi vào vùng chuẩn bị (staging area).\n` +
        `- \`git commit -m "mô tả thay đổi"\`: Đóng gói commit.\n` +
        `- \`git push origin main\`: Đẩy code lên nhánh main trên GitHub.\n` +
        `- \`git pull\`: Kéo các cập nhật mới nhất từ máy chủ về máy mình.\n` +
        `- \`git checkout -b feature-moi\`: Tạo và chuyển sang một nhánh tính năng mới.`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 3: TIẾNG ANH & NGỮ PHÁP
  // -------------------------------------------------------------

  if (lower.includes("hiện tại đơn") || lower.includes("present simple")) {
    return {
      text:
        `**Thì Hiện tại đơn (Present Simple Tense)**: 🇬🇧\n\n` +
        `1. **Cấu trúc:**\n` +
        `- Khẳng định: $S + V(s/es)$ (ví dụ: *She works at Google*).\n` +
        `- Phủ định: $S + do/does + not + V_0$ (ví dụ: *He does not smoke*).\n` +
        `- Nghi vấn: $Do/Does + S + V_0?$ (ví dụ: *Do you speak English?*)\n\n` +
        `2. **Cách dùng chính:**\n` +
        `- Diễn tả chân lý, sự thật hiển nhiên (*The sun rises in the East*).\n` +
        `- Diễn tả thói quen, hành động lặp đi lặp lại hàng ngày (*I drink coffee every morning*).\n` +
        `- Lịch trình tàu xe, thời khóa biểu cố định.`,
      isGemini: false,
    };
  }

  if (lower.includes("hiện tại hoàn thành") || lower.includes("present perfect")) {
    return {
      text:
        `**Thì Hiện tại hoàn thành (Present Perfect Tense)**: 🇬🇧\n\n` +
        `1. **Cấu trúc:** $S + have/has + V_3/V_{ed}$\n` +
        `2. **Cách dùng kinh điển:**\n` +
        `- Hành động đã xảy ra trong quá khứ nhưng kết quả vẫn còn liên quan đến hiện tại (*I have lost my key*).\n` +
        `- Diễn tả trải nghiệm từ trước tới nay (*Have you ever been to Paris?*).\n` +
        `- Hành động bắt đầu từ quá khứ và vẫn đang tiếp diễn ở hiện tại (đi với **since + mốc thời gian** hoặc **for + khoảng thời gian**).`,
      isGemini: false,
    };
  }

  if (lower.includes("câu điều kiện") || lower.includes("conditional")) {
    return {
      text:
        `Tóm tắt nhanh **Câu điều kiện (Conditionals)**: 🇬🇧\n\n` +
        `- **Loại 1 (Có thật ở hiện tại/tương lai):**\n` +
        `  *If + S + V(hiện tại đơn), S + will + V_0*\n` +
        `  *Ví dụ:* If it rains tomorrow, we will stay at home.\n\n` +
        `- **Loại 2 (Giả định trái ngược với hiện tại):**\n` +
        `  *If + S + V2/ed (to be dùng 'were'), S + would + V_0*\n` +
        `  *Ví dụ:* If I were you, I would take that opportunity.\n\n` +
        `- **Loại 3 (Giả định tiếc nuối trong quá khứ):**\n` +
        `  *If + S + had + V3/ed, S + would have + V3/ed*`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 4: PHƯƠNG PHÁP HỌC TẬP & NĂNG SUẤT
  // -------------------------------------------------------------

  if (lower.includes("pomodoro") || lower.includes("cà chua")) {
    return {
      text:
        `Phương pháp **Pomodoro (Quả cà chua)** giúp tập trung học đỉnh cao: 🍅⏰\n\n` +
        `1. **25 phút học tập trung cao độ:** Tắt hết thông báo, không lướt mạng xã hội.\n` +
        `2. **5 phút nghỉ ngắn:** Đứng dậy, uống ngụm nước, vươn vai thư giãn mắt.\n` +
        `3. Lặp lại 4 chu kỳ như vậy (tổng 2 tiếng).\n` +
        `4. **Nghỉ dài 15 - 30 phút** để não nạp lại năng lượng.\n\n` +
        `Tụi mình cùng bắt đầu 1 hiệp Pomodoro ngay bây giờ không nè? 🚀`,
      isGemini: false,
    };
  }

  if (lower.includes("feynman")) {
    return {
      text:
        `Kỹ thuật học sâu **Feynman** (từ nhà vật lý đạt giải Nobel Richard Feynman): 🧠✨\n\n` +
        `1. **Chọn một chủ đề** bạn muốn hiểu sâu.\n` +
        `2. **Tự giải thích nó cho một đứa trẻ 10 tuổi** (dùng từ ngữ cực kỳ đơn giản, không biệt ngữ hàn lâm).\n` +
        `3. **Phát hiện lỗ hổng kiến thức:** Chỗ nào bạn lúng túng hoặc phải dùng từ phức tạp để lấp liếm chính là chỗ bạn chưa hiểu rõ.\n` +
        `4. **Quay lại tài liệu học lại chỗ đó** và đơn giản hóa tiếp bằng ví dụ đời thực!`,
      isGemini: false,
    };
  }

  if (lower.includes("mệt") || lower.includes("stress") || lower.includes("áp lực") || lower.includes("chán học")) {
    return {
      text:
        `Nghe bạn nói mình cũng đồng cảm lắm nè 🥺. Học tập là cả một chặng đường dài, có những lúc mệt mỏi hay bão hòa là chuyện rất bình thường luôn.\n\n` +
        `Bạn hãy tạm gác sách vở lại tầm 10-15 phút, đứng dậy uống một cốc nước ấm, hít thở thật sâu hoặc nghe một bản nhạc nhẹ nhé. Khi nào đầu óc nhẹ nhàng hơn tụi mình lại cùng học tiếp, mình luôn ở đây đồng hành cùng bạn mà! Cố lên nha! 🍀☕`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 5: CHÀO HỎI, TÁN GẪU & DANH TÍNH
  // -------------------------------------------------------------

  const isGreeting =
    /^(chào|hello|hi|hey|xin chào|chào bạn|alo|hé lô|good morning)/i.test(lower) ||
    lower === "chào" ||
    lower === "hello" ||
    lower === "hi";

  if (isGreeting) {
    const docHint = doc ? ` Tụi mình cũng đang có sẵn tài liệu **"${doc.title}"** nếu bạn muốn cùng ôn bài nè.` : "";
    return {
      text: `Chào bạn nha! Rất vui được gặp bạn hôm nay 😊. Mình là Trợ lý AI PeerMind. Bạn có thắc mắc bài tập gì, cần hỏi công thức toán, lập trình, tiếng Anh hay trò chuyện học tập thì cứ thoải mái nhắn mình nhé!${docHint} ✨`,
      isGemini: false,
    };
  }

  if (lower.includes("bạn là ai") || lower.includes("tên gì") || lower.includes("giới thiệu")) {
    return {
      text:
        `Mình là **Trợ lý AI PeerMind** — bạn đồng hành học tập cùng bàn 24/7 của bạn nè! 🤖🎓\n\n` +
        `Mình có thể hỗ trợ bạn:\n` +
        `- 📐 Giải đáp mọi câu hỏi Toán học, Vật lý, Khoa học, Hình học.\n` +
        `- 💻 Hỗ trợ lập trình (React, JavaScript, Python, Git...).\n` +
        `- 🇬🇧 Giải thích ngữ pháp tiếng Anh & mẹo học tập (Pomodoro, Feynman).\n` +
        `- 📄 Đọc hiểu tài liệu, tóm tắt ý chính & tạo sơ đồ tư duy (Mindmap).\n` +
        `- 📝 Soạn trắc nghiệm để cùng bạn ôn luyện trước kỳ thi.\n\n` +
        `Cứ tự nhiên coi mình như bạn học cùng lớp nhé! Bạn đang băn khoăn phần nào thế? 🚀`,
      isGemini: false,
    };
  }

  if (lower.includes("cảm ơn") || lower.includes("thanks") || lower.includes("thank you")) {
    return {
      text: `Không có chi nè bạn ơi! Giúp được bạn là mình vui lắm rồi 😊. Cần hỏi thêm câu nào nữa thì bạn cứ nhắn tiếp nha, mình luôn sẵn sàng! ✨`,
      isGemini: false,
    };
  }

  if (lower.includes("khen") || lower.includes("giỏi quá") || lower.includes("xịn") || lower.includes("tuyệt vời")) {
    return {
      text: `Hihi, cảm ơn bạn nhiều nha! Được bạn khen làm mình có thêm bao nhiêu động lực luôn á 🥰. Chúc bạn học thật vui và đạt kết quả thật cao nha!`,
      isGemini: false,
    };
  }

  if (lower.includes("chuyện cười") || lower.includes("đố vui") || lower.includes("câu đố")) {
    return {
      text:
        `Gửi bạn một câu đố vui thư giãn đầu óc nè: 😄\n\n` +
        `👉 *"Cái gì bạn có thể giữ sau khi đã cho người khác?"*\n\n` +
        `*(Gợi ý: Liên quan đến lời nói hoặc chữ tín nha! Bạn đoán thử xem nào?)*`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 6: THAO TÁC THEO TÀI LIỆU (KHI CÓ DOC VÀ NGƯỜI DÙNG YÊU CẦU)
  // -------------------------------------------------------------

  if (doc) {
    // 6.1 Sơ đồ tư duy
    if (lower.includes("tư duy") || lower.includes("sơ đồ") || lower.includes("mindmap")) {
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
          : `├── 🌿 **1. Khái niệm & Nguyên lý nền tảng**\n│    └── 📌 Định nghĩa cốt lõi\n├── 🌿 **2. Phương pháp & Công thức chính**\n│    └── 📌 Trình tự từng bước giải bài toán mẫu\n└── 🌿 **3. Điểm lưu ý & Bẫy thường gặp**\n     └── 💡 Mẹo làm bài nhanh và chuẩn xác`;

      return {
        text:
          `Dưới đây là sơ đồ tư duy (Mindmap) trực quan cho bài học **"${doc.title}"** nè bạn: 🧠✨\n\n` +
          `📦 **CHỦ ĐỀ: ${doc.title.toUpperCase()}**\n` +
          branches +
          `\n\n💡 *Nhìn theo sơ đồ này bạn sẽ thấy toàn bộ cấu trúc bài học liên kết rất mạch lạc! Cần đào sâu nhánh nào thì nhắn mình nhé!*`,
        isGemini: false,
      };
    }

    // 6.2 Tóm tắt tài liệu
    if (lower.includes("tóm tắt") || lower.includes("khái quát") || lower.includes("nội dung chính")) {
      if (pages.length > 0) {
        const summaryList = pages.map((p, i) => `• **Ý ${i + 1}:** ${p}`).join("\n\n");
        return {
          text: `Dưới đây là tóm tắt nhanh những điểm then chốt của tài liệu **"${doc.title}"** nè: 📄\n\n${summaryList}\n\n💡 *Bạn muốn mình giải thích chi tiết hơn phần nào không?*`,
          isGemini: false,
        };
      }
      return {
        text: `Tóm tắt nhanh tài liệu **"${doc.title}"** (${doc.subject}):\n\n• Tài liệu bao gồm ${doc.pagesCount || 15} trang kiến thức trọng tâm.\n• Tập trung vào lý thuyết nền tảng, công thức cốt lõi và bài tập áp dụng.\n• Tiến độ ôn tập hiện tại của bạn là **${doc.progress}%**. Cố lên nha!`,
        isGemini: false,
      };
    }

    // 6.3 Tạo câu hỏi ôn tập
    if (lower.includes("câu hỏi") || lower.includes("trắc nghiệm") || lower.includes("ôn tập")) {
      return {
        text:
          `Mình gửi bạn 3 câu hỏi ôn tập nhanh cho tài liệu **"${doc.title}"** nè:\n\n` +
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

    // 6.4 Tìm kiếm theo tài liệu CHỈ KHI người dùng nhắc rõ về tài liệu
    const mentionsDocExplicitly =
      lower.includes("tài liệu") ||
      lower.includes("trong bài") ||
      lower.includes("bài này") ||
      lower.includes("trang") ||
      lower.includes(doc.title.toLowerCase());

    if (mentionsDocExplicitly && pages.length > 0) {
      const meaningfulKeywords = lower
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["này", "trong", "bài", "cho", "biết", "được", "không"].includes(w));

      const matched = pages.find((p) =>
        meaningfulKeywords.some((kw) => p.toLowerCase().includes(kw))
      );

      if (matched) {
        return {
          text: `Về câu hỏi của bạn trong tài liệu **"${doc.title}"**, trong bài có đoạn này rất đáng lưu ý nè:\n\n> "${matched}"\n\nBạn có cần mình lấy thêm ví dụ đời thường để dễ nhớ hơn không? 😊`,
          isGemini: false,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // NHÓM 7: CÂU TRẢ LỜI MẶC ĐỊNH THÔNG MINH, TỰ NHIÊN
  // -------------------------------------------------------------
  return {
    text:
      `Mình đã ghi nhận câu hỏi của bạn: *" ${prompt} "* 💡\n\n` +
      `Bạn có thể hỏi mình chi tiết hơn về:\n` +
      `- 📐 Các công thức Toán học, Hình học, Vật lý (ví dụ: chu vi hình tròn, diện tích tam giác, định lý Pytago, giải pt bậc 2...).\n` +
      `- 💻 Giải thích code & công nghệ (React, JavaScript, Python, Git...).\n` +
      `- 🇬🇧 Ngữ pháp tiếng Anh & các thì.\n` +
      `${doc ? `- 📄 Tóm tắt, vẽ sơ đồ tư duy hoặc giải đáp bài học **"${doc.title}"** đang mở.\n` : ""}` +
      `\nCứ tự nhiên đặt câu hỏi cụ thể, mình sẽ giải thích thật chi tiết cho bạn nha! 😊`,
    isGemini: false,
  };
}
