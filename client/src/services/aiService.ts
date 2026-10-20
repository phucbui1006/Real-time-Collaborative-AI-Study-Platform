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
 * Định dạng công thức bằng ký tự Unicode tự nhiên, chuẩn font tiếng Việt, không dùng LaTeX thô.
 */
async function getFallbackResponse(
  prompt: string,
  doc: DocumentItem | null,
  pages: string[]
): Promise<{ text: string; isGemini: boolean }> {
  await new Promise((r) => setTimeout(r, 250));
  const lower = prompt.toLowerCase().trim();

  // -------------------------------------------------------------
  // NHÓM 1: CÔNG THỨC TOÁN HỌC & HÌNH HỌC PHỔ THÔNG (FONT & ICON CHUẨN)
  // -------------------------------------------------------------

  // 1.1 Hình tròn (Chu vi, diện tích, bán kính, đường kính)
  if (
    lower.includes("hình tròn") ||
    (lower.includes("chu vi") && lower.includes("tròn")) ||
    (lower.includes("diện tích") && lower.includes("tròn"))
  ) {
    return {
      text:
        `Công thức đầy đủ liên quan đến **hình tròn** đây nè bạn: 📐✨\n\n` +
        `### 1. Chu vi hình tròn:\n` +
        `> **\`C = 2 × π × r\`**  *(hoặc **\`C = π × d\`** nếu biết đường kính)*\n\n` +
        `### 2. Diện tích hình tròn:\n` +
        `> **\`S = π × r²\`**\n\n` +
        `**Trong đó:**\n` +
        `- **C**: Chu vi hình tròn (đơn vị: cm, m...)\n` +
        `- **S**: Diện tích hình tròn (đơn vị: cm², m²...)\n` +
        `- **r**: Bán kính hình tròn (khoảng cách từ tâm đến mép đường tròn)\n` +
        `- **d**: Đường kính (d = 2 × r)\n` +
        `- **π (Số Pi)**: Hằng số toán học xấp xỉ ≈ **3.14159**\n\n` +
        `💡 **Ví dụ minh họa dễ hiểu:**\n` +
        `Nếu một hình tròn có bán kính **r = 5 cm**:\n` +
        `- **Chu vi:** C = 2 × 3.14 × 5 = **31.4 cm**\n` +
        `- **Diện tích:** S = 3.14 × 5² = 3.14 × 25 = **78.5 cm²**\n\n` +
        `Bạn có bài tập cụ thể nào cần tính toán thì cứ nhắn số liệu cho mình nha! 😊`,
      isGemini: false,
    };
  }

  // 1.2 Hình tam giác
  if (lower.includes("tam giác") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức về **hình tam giác** đây bạn nhé: 📐\n\n` +
        `### 1. Chu vi hình tam giác:\n` +
        `> **\`P = a + b + c\`**  *(Tổng độ dài 3 cạnh)*\n\n` +
        `### 2. Diện tích hình tam giác thường:\n` +
        `> **\`S = (a × h) / 2\`**  *(Đáy nhân chiều cao chia 2)*\n\n` +
        `### 3. Các trường hợp đặc biệt:\n` +
        `- **Tam giác vuông:** \`S = (a × b) / 2\` *(Tích 2 cạnh góc vuông chia 2)*\n` +
        `- **Tam giác đều (cạnh a):** \`S = (a² × √3) / 4\`\n` +
        `- **Công thức Heron (khi biết 3 cạnh a, b, c):**\n` +
        `  \`S = √(p × (p - a) × (p - b) × (p - c))\` *(với nửa chu vi p = (a + b + c) / 2)*`,
      isGemini: false,
    };
  }

  // 1.3 Hình chữ nhật & Hình vuông
  if (lower.includes("chữ nhật") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức **hình chữ nhật** (chiều dài a, chiều rộng b): 📦\n\n` +
        `- **Chu vi:** \`P = (a + b) × 2\`\n` +
        `- **Diện tích:** \`S = a × b\`\n\n` +
        `*Ví dụ:* Dài 8 cm, rộng 5 cm thì Chu vi = 26 cm và Diện tích = 40 cm².`,
      isGemini: false,
    };
  }

  if (lower.includes("hình vuông") && (lower.includes("diện tích") || lower.includes("chu vi") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức **hình vuông** (cạnh a): ⏹️\n\n` +
        `- **Chu vi:** \`P = a × 4\`\n` +
        `- **Diện tích:** \`S = a²\`\n` +
        `- **Độ dài đường chéo:** \`d = a × √2\``,
      isGemini: false,
    };
  }

  // 1.4 Hình thang & Hình thoi
  if (lower.includes("hình thang") && (lower.includes("diện tích") || lower.includes("công thức"))) {
    return {
      text:
        `Công thức **diện tích hình thang**: 📐\n\n` +
        `> **\`S = ((a + b) × h) / 2\`**\n\n` +
        `*(Tổng hai đáy nhân chiều cao rồi chia đôi)*\n\n` +
        `💡 *Mẹo nhớ vui: "Muốn tính diện tích hình thang / Đáy lớn đáy nhỏ ta mang cộng vào / Thế rồi nhân với chiều cao / Chia đôi lấy nửa thế nào cũng ra!"* 😄`,
      isGemini: false,
    };
  }

  // 1.5 Định lý Pytago
  if (lower.includes("pytago") || lower.includes("pythagoras") || lower.includes("pitago")) {
    return {
      text:
        `**Định lý Pytago (Pythagoras)** trong tam giác vuông: 📐\n\n` +
        `> **\`a² + b² = c²\`**\n\n` +
        `Trong đó:\n` +
        `- **c**: Độ dài cạnh huyền\n` +
        `- **a, b**: Độ dài hai cạnh góc vuông\n\n` +
        `⭐ **Các bộ 3 số Pytago kinh điển:**\n` +
        `- (3, 4, 5) vì 3² + 4² = 9 + 16 = 25 = 5²\n` +
        `- (5, 12, 13)\n` +
        `- (6, 8, 10)\n` +
        `- (7, 24, 25)`,
      isGemini: false,
    };
  }

  // 1.6 Phương trình bậc 2
  if (
    lower.includes("bậc 2") ||
    lower.includes("bậc hai") ||
    lower.includes("delta") ||
    lower.includes("phương trình bậc")
  ) {
    return {
      text:
        `Cách giải **phương trình bậc hai** \`a × x² + b × x + c = 0\` (a ≠ 0): 🧮\n\n` +
        `1. **Tính biệt thức Delta:**\n` +
        `> **\`Δ = b² - 4 × a × c\`**\n\n` +
        `2. **Biện luận số nghiệm:**\n` +
        `- **Nếu Δ > 0:** Phương trình có 2 nghiệm phân biệt:\n` +
        `  \`x₁ = (-b + √Δ) / (2 × a)\`\n` +
        `  \`x₂ = (-b - √Δ) / (2 × a)\`\n` +
        `- **Nếu Δ = 0:** Phương trình có nghiệm kép:\n` +
        `  \`x₁ = x₂ = -b / (2 × a)\`\n` +
        `- **Nếu Δ < 0:** Phương trình vô nghiệm trên tập số thực.\n\n` +
        `💡 *Hệ thức Vi-ét: x₁ + x₂ = -b / a và x₁ × x₂ = c / a.*`,
      isGemini: false,
    };
  }

  // 1.7 Thể tích hình khối
  if (lower.includes("thể tích")) {
    if (lower.includes("cầu")) {
      return {
        text: `Thể tích **hình cầu** bán kính r:\n> **\`V = (4/3) × π × r³\`**\nDiện tích mặt cầu:\n> **\`S = 4 × π × r²\`** ⚽`,
        isGemini: false,
      };
    }
    if (lower.includes("trụ")) {
      return {
        text: `Thể tích **hình trụ** có bán kính r và chiều cao h:\n> **\`V = π × r² × h\`** 🥫`,
        isGemini: false,
      };
    }
    if (lower.includes("nón")) {
      return {
        text: `Thể tích **hình nón** có bán kính r và chiều cao h:\n> **\`V = (1/3) × π × r² × h\`** 🍦`,
        isGemini: false,
      };
    }
  }

  // 1.8 Vận tốc, quãng đường, thời gian
  if (
    lower.includes("vận tốc") ||
    (lower.includes("quãng đường") && lower.includes("thời gian"))
  ) {
    return {
      text:
        `Công thức chuyển động đều căn bản: 🚗💨\n\n` +
        `- **Quãng đường:** \`s = v × t\`\n` +
        `- **Vận tốc:** \`v = s / t\`\n` +
        `- **Thời gian:** \`t = s / v\`\n\n` +
        `*Quy đổi đơn vị:* 1 m/s = 3.6 km/h.`,
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
        `\`\`\`tsx\n` +
        `const [count, setCount] = useState<number>(0);\n` +
        `\`\`\`\n` +
        `2. **\`useEffect\`**: Thực thi side-effects (gọi API, timer, lắng nghe sự kiện).\n` +
        `\`\`\`tsx\n` +
        `useEffect(() => {\n` +
        `  console.log("Component mounted hoặc count đổi:", count);\n` +
        `}, [count]);\n` +
        `\`\`\`\n` +
        `3. **\`useMemo\` & \`useCallback\`**: Lưu cache kết quả tính toán hoặc hàm để tránh re-render thừa.`,
      isGemini: false,
    };
  }

  if (lower.includes("git") && (lower.includes("commit") || lower.includes("push") || lower.includes("lệnh"))) {
    return {
      text:
        `Các lệnh **Git** thông dụng hàng ngày: 🐙\n\n` +
        `- \`git status\`: Xem trạng thái các file đã sửa.\n` +
        `- \`git add .\`: Thêm thay đổi vào vùng chuẩn bị.\n` +
        `- \`git commit -m "nội dung"\`: Đóng gói commit.\n` +
        `- \`git push origin main\`: Đẩy code lên nhánh main.\n` +
        `- \`git pull\`: Lấy code mới nhất về máy.`,
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
        `- Khẳng định: \`S + V(s/es)\` *(Ví dụ: She loves music)*\n` +
        `- Phủ định: \`S + do/does + not + V₀\` *(Ví dụ: He does not play tennis)*\n` +
        `- Nghi vấn: \`Do/Does + S + V₀?\`\n\n` +
        `2. **Cách dùng chính:**\n` +
        `- Diễn tả chân lý, sự thật hiển nhiên (*The Earth orbits the Sun*).\n` +
        `- Diễn tả thói quen, lịch trình lặp lại hàng ngày.`,
      isGemini: false,
    };
  }

  if (lower.includes("hiện tại hoàn thành") || lower.includes("present perfect")) {
    return {
      text:
        `**Thì Hiện tại hoàn thành (Present Perfect)**: 🇬🇧\n\n` +
        `- **Cấu trúc:** \`S + have/has + V₃/V_ed\`\n` +
        `- **Cách dùng phổ biến:**\n` +
        `  + Hành động xảy ra trong quá khứ và kết quả còn ảnh hưởng ở hiện tại (*I have finished my homework*).\n` +
        `  + Trải nghiệm cuộc sống (*Have you ever visited Da Nang?*).\n` +
        `  + Đi kèm với **since + mốc thời gian** hoặc **for + khoảng thời gian**.`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 4: CHÀO HỎI, TÁN GẪU & DANH TÍNH
  // -------------------------------------------------------------

  const isGreeting =
    /^(chào|hello|hi|hey|xin chào|chào bạn|alo|hé lô|good morning)/i.test(lower) ||
    lower === "chào" ||
    lower === "hello" ||
    lower === "hi";

  if (isGreeting) {
    const docHint = doc ? ` Tụi mình đang xem tài liệu **"${doc.title}"** nếu bạn muốn cùng ôn bài nè.` : "";
    return {
      text: `Chào bạn nha! Rất vui được gặp bạn hôm nay 😊. Mình là Trợ lý AI PeerMind. Bạn cần hỏi công thức toán, lập trình, tiếng Anh hay trao đổi bài tập thì cứ thoải mái nhắn mình nhé!${docHint} ✨`,
      isGemini: false,
    };
  }

  if (lower.includes("bạn là ai") || lower.includes("tên gì") || lower.includes("giới thiệu")) {
    return {
      text:
        `Mình là **Trợ lý AI PeerMind** — bạn đồng hành học tập cùng bàn của bạn nè! 🤖🎓\n\n` +
        `Mình có thể hỗ trợ bạn:\n` +
        `- 📐 Giải đáp mọi câu hỏi Toán học, Hình học, Vật lý, Khoa học.\n` +
        `- 💻 Hỗ trợ lập trình (React, JavaScript, Python, Git...).\n` +
        `- 🇬🇧 Giải thích ngữ pháp tiếng Anh & phương pháp học tập (Pomodoro, Feynman).\n` +
        `- 📄 Đọc hiểu tài liệu, tóm tắt ý chính & tạo sơ đồ tư duy (Mindmap).\n` +
        `- 📝 Soạn trắc nghiệm để cùng bạn ôn luyện trước kỳ thi.\n\n` +
        `Cứ tự nhiên coi mình như bạn học cùng lớp nhé! Bạn đang băn khoăn phần nào thế? 🚀`,
      isGemini: false,
    };
  }

  // -------------------------------------------------------------
  // NHÓM 5: THAO TÁC THEO TÀI LIỆU
  // -------------------------------------------------------------

  if (doc) {
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
  }

  // -------------------------------------------------------------
  // NHÓM 6: CÂU TRẢ LỜI MẶC ĐỊNH
  // -------------------------------------------------------------
  return {
    text:
      `Mình đã ghi nhận câu hỏi của bạn: *" ${prompt} "* 💡\n\n` +
      `Bạn có thể hỏi mình cụ thể hơn về:\n` +
      `- 📐 Các công thức Toán học, Hình học (chu vi hình tròn, tam giác, định lý Pytago, giải pt bậc 2...)\n` +
      `- 💻 Giải thích code & công nghệ (React, JavaScript, Python, Git...)\n` +
      `- 🇬🇧 Ngữ pháp tiếng Anh & các thì\n` +
      `${doc ? `- 📄 Tóm tắt, vẽ sơ đồ tư duy bài học **"${doc.title}"** đang mở.\n` : ""}` +
      `\nCứ tự nhiên nhắn tin, mình sẽ giải thích chi tiết và tận tình cho bạn nhé! 😊`,
    isGemini: false,
  };
}
