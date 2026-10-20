// services/geminiClient.ts — Client gọi Google Gemini API trực tiếp từ trình duyệt
// Hỗ trợ lưu trữ API Key trong localStorage (BYOK) hoặc qua biến môi trường VITE_GEMINI_API_KEY

const STORAGE_KEY = "peermind_gemini_api_key";

// Danh sách các mô hình Flash thế hệ mới nhất của Google (tự động thử dự phòng nếu một mô hình bị nghẽn tải)
const ACTIVE_MODELS = [
  "gemini-flash-lite-latest", // Gemini 3.5 Flash Lite siêu nhanh & ổn định
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
];

/**
 * Lấy API Key đang hoạt động: ưu tiên localStorage -> biến môi trường VITE
 */
export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local && local.trim().length > 10) {
      return local.trim();
    }
  }
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  return envKey.trim();
}

/**
 * Lưu API Key người dùng nhập vào localStorage
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || key.trim().length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  }
}

/**
 * Xóa API Key khỏi localStorage
 */
export function removeGeminiApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Kiểm tra xem hiện tại đã có API Key hợp lệ hay chưa
 */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 10;
}

/**
 * Tạo URL chuẩn gọi Gemini API
 */
function buildGeminiUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

/**
 * Test kết nối với Google Gemini API
 */
export async function testGeminiApiKey(keyToTest?: string): Promise<{ success: boolean; message: string }> {
  const apiKey = (keyToTest ?? getGeminiApiKey()).trim();
  if (!apiKey || apiKey.length < 10) {
    return { success: false, message: "API Key không hợp lệ hoặc quá ngắn." };
  }

  try {
    const url = buildGeminiUrl(ACTIVE_MODELS[0], apiKey);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Chào bạn" }] }],
        generationConfig: { maxOutputTokens: 20 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `Lỗi HTTP ${res.status}`;
      return { success: false, message: msg };
    }

    return { success: true, message: "Kết nối Google Gemini AI thành công! Trợ lý đã sẵn sàng." };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, message: e.message || "Không thể kết nối đến máy chủ Google." };
  }
}

/**
 * Gọi Gemini REST API sinh văn bản với cơ chế tự động chuyển đổi mô hình (Failover)
 */
async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Chưa cấu hình Google Gemini API Key.");
  }

  let lastError: Error | null = null;

  for (const model of ACTIVE_MODELS) {
    try {
      const url = buildGeminiUrl(model, apiKey);

      const bodyPayload: Record<string, unknown> = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7, // Giúp phản hồi tự nhiên, sinh động, thông minh
          maxOutputTokens: 2500,
        },
      };

      if (jsonMode) {
        (bodyPayload.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
        (bodyPayload.generationConfig as Record<string, unknown>).temperature = 0.2;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error?.message || `Mã HTTP: ${res.status}`;
        lastError = new Error(`Lỗi mô hình ${model}: ${errMsg}`);
        // Thử mô hình tiếp theo trong danh sách
        continue;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const textPart = candidate?.content?.parts?.[0]?.text;

      if (!textPart) {
        lastError = new Error("Mô hình không trả về nội dung.");
        continue;
      }

      return textPart.trim();
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  throw lastError || new Error("Không thể kết nối đến Google Gemini API.");
}

/**
 * 1. AI RAG & Universal Chatbot: Trò chuyện tự do, giải đáp kiến thức đa ngành và theo tài liệu
 */
export async function askGeminiRAG({
  question,
  docTitle,
  docSubject,
  pagesContent = [],
}: {
  question: string;
  docTitle?: string;
  docSubject?: string;
  pagesContent?: string[];
}): Promise<string> {
  let context = "";
  const hasDoc = !!docTitle && pagesContent && pagesContent.length > 0;

  if (hasDoc) {
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["này", "trong", "bài", "cho", "biết", "được", "không"].includes(w));

    const relevantPages = pagesContent
      .map((text, idx) => ({ text, page: idx + 1 }))
      .filter(({ text }) => keywords.some((kw) => text.toLowerCase().includes(kw)))
      .slice(0, 3);

    if (relevantPages.length > 0) {
      context = relevantPages.map((p) => `[Trang ${p.page}]:\n${p.text}`).join("\n\n---\n\n");
    }
  }

  const prompt = `
Bạn là Trợ lý AI PeerMind — một AI Chatbot thông minh, uyên bác và thân thiện như một người bạn học cùng bàn 24/7.

VAI TRÒ VÀ NĂNG LỰC TOÀN DIỆN CỦA BẠN:
1. Bạn là một trợ lý chatbot đa năng (như ChatGPT / Gemini):
   - Bạn có thể trả lời BẤT KỲ câu hỏi nào về: Toán học, Hình học, Vật lý, Hóa học, Lập trình & CNTT (React, TypeScript, Python...), Ngữ pháp tiếng Anh, Khoa học tự nhiên, Kỹ năng học tập, cho đến những câu hỏi giao tiếp, đời sống hàng ngày.
2. NGUYÊN TẮC QUAN TRỌNG VỀ TÀI LIỆU ĐANG MỞ:
   ${hasDoc ? `- Hiện tại người dùng đang mở tài liệu: "${docTitle}" (${docSubject || "Chung"}).
   - QUY TẮC: Bạn CHỈ nhắc đến tài liệu này khi câu hỏi của người dùng THỰC SỰ LIÊN QUAN đến tài liệu đó (hoặc người dùng yêu cầu tóm tắt, giải thích tài liệu).
   - NẾU người dùng hỏi các câu hỏi kiến thức ngoài (ví dụ: công thức chu vi hình tròn, hỏi về lập trình, giải toán phổ thông, hỏi thăm đời sống...): Hãy TRẢ LỜI ĐẦY ĐỦ, CHÍNH XÁC VÀ TỰ NHIÊN câu hỏi đó! TUYỆT ĐỐI KHÔNG gượng ép lôi tài liệu vào nếu không liên quan.` : "- Hiện tại không có tài liệu nào được chỉ định. Hãy giải đáp tự do mọi câu hỏi của người dùng như một AI Chatbot thông minh và hữu ích."}
3. PHONG CÁCH GIAO TIẾP & ĐỊNH DẠNG CÔNG THỨC (BẮT BUỘC):
   - Xưng hô "mình" và "bạn". Giao tiếp gần gũi, tự nhiên, ấm áp như hai bạn học thân thiết đang ngồi học cùng nhau.
   - QUY TẮC CÔNG THỨC TOÁN HỌC & KÝ HIỆU:
     + TUYỆT ĐỐI KHÔNG dùng cú pháp LaTeX thô như $$ \times \pi \approx \text{} $$.
     + Hãy viết công thức bằng ký tự Unicode tự nhiên dễ đọc trên mọi thiết bị:
       * Dấu nhân: × (thay vì * hay \times)
       * Số Pi: π (thay vì \pi)
       * Số mũ: ², ³ (ví dụ: r², cm², m³)
       * Dấu xấp xỉ: ≈ (thay vì \approx)
       * Căn bậc hai: √ (ví dụ: √(a² + b²))
       * Đặt công thức trọng tâm trong khối mã hoặc in đậm để nổi bật: ví dụ \`C = 2 × π × r\` hoặc \`S = π × r\`.
   - Trình bày Markdown sạch sẽ, font tiếng Việt chuẩn xác, danh sách gạch đầu dòng rõ ràng, emoji tươi vui (💡, 📌, ✨, 🚀, 📐, 💻).
   - Nếu người dùng chào hỏi, hỏi thăm hoặc trò chuyện phiếm: Hãy vui vẻ trò chuyện tự nhiên, đừng tuôn ra lý thuyết sách vở khô khan.

${context ? `=== NỘI DUNG TÀI LIỆU THAM KHẢO (CHỈ DÙNG KHI LIÊN QUAN) ===\n${context}\n` : ""}

=== CÂU HỎI TỪ BẠN HỌC ===
"${question}"
`;

  return callGemini(prompt, false);
}

/**
 * 2. Tóm tắt tài liệu tự nhiên, sinh động bằng Gemini
 */
export async function summarizeDocumentWithGemini({
  docTitle,
  docSubject,
  pagesContent,
}: {
  docTitle: string;
  docSubject?: string;
  pagesContent: string[];
}): Promise<string> {
  const contentText = pagesContent.length > 0 ? pagesContent.join("\n\n") : docTitle;

  const prompt = `
Bạn là bạn học cùng bàn kiêm trợ lý học tập thân thiện của PeerMind.
Hãy tóm tắt tài liệu "${docTitle}" (${docSubject || "Tổng hợp"}) một cách sinh động, dễ hiểu, ngắn gọn và cuốn hút nhất.

=== NỘI DUNG TÀI LIỆU ===
${contentText.slice(0, 10000)}

=== YÊU CẦU TRÌNH BÀY ===
Dùng giọng văn thân thiện, xưng "mình - bạn", có icon và định dạng Markdown đẹp mắt:
1. 🎯 **Bản chất của bài này là gì?**: Tóm gọn trong 1-2 câu dễ hiểu nhất.
2. 🔑 **Những ý đắt giá cần nhớ**: 3-4 gạch đầu dòng then chốt, nhấn mạnh công thức hoặc mẹo nhớ nhanh.
3. 💡 **Bẫy thi cử / Mẹo ôn tập**: Chia sẻ mẹo thực tế để không bị mất điểm oan.
`;

  return callGemini(prompt, false);
}

/**
 * 3. Vẽ sơ đồ tư duy (Mindmap) phân cấp bằng Gemini
 */
export async function generateMindmapTextWithGemini({
  docTitle,
  docSubject,
  pagesContent,
}: {
  docTitle: string;
  docSubject?: string;
  pagesContent: string[];
}): Promise<string> {
  const contentText = pagesContent.length > 0 ? pagesContent.join("\n\n") : docTitle;

  const prompt = `
Bạn là chuyên gia trực quan hóa kiến thức và sơ đồ tư duy của PeerMind.
Dựa vào nội dung tài liệu "${docTitle}" (${docSubject || "Chung"}), hãy dựng một sơ đồ tư duy (Mindmap) phân cấp bằng Markdown tuyệt đẹp, trực quan, sinh động.

=== NỘI DUNG TÀI LIỆU ===
${contentText.slice(0, 9000)}

=== YÊU CẦU TRÌNH BÀY ===
- Dùng các ký tự cây phân nhánh: ├──, └──, │ và các emoji (🧠, 📦, 🌿, 📌, 💡, ⚡) để tạo thành sơ đồ tư duy trực quan, rõ ràng từng tầng lớp.
- Bố cục gồm:
  + Gốc: 📦 **CHỦ ĐỀ: ${docTitle.toUpperCase()}**
  + Các nhánh cấp 1 (🌿): Các phần lớn / nội dung trọng tâm
  + Các nhánh con cấp 2 (📌): Khái niệm, công thức hoặc quy tắc cốt lõi
- Kèm 1 lời nhắn thân thiện ở cuối khích lệ bạn học bằng giọng văn tự nhiên xưng "mình - bạn".
`;

  return callGemini(prompt, false);
}

/**
 * 4. Tạo bộ câu hỏi trắc nghiệm tự động (Quiz Generator)
 */
export type GeneratedQuestion = {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
};

export async function generateQuizWithGemini({
  docTitle,
  pagesContent,
  count = 4,
}: {
  docTitle: string;
  pagesContent: string[];
  count?: number;
}): Promise<GeneratedQuestion[]> {
  const contentText = pagesContent.length > 0 ? pagesContent.join("\n\n") : docTitle;

  const prompt = `
Bạn là người bạn đồng hành cùng ôn thi. Dựa vào nội dung tài liệu dưới đây, hãy soạn thảo ${count} câu hỏi trắc nghiệm thú vị, bám sát kiến thức:

=== TÀI LIỆU: "${docTitle}" ===
${contentText.slice(0, 9000)}

=== YÊU CẦU BẮT BUỘC ===
Trả về kết quả ở dạng JSON thuần túy theo schema sau (KHÔNG bọc trong markdown \`\`\`json hay thêm văn bản giải thích nào khác):
{
  "questions": [
    {
      "id": 1,
      "question": "Nội dung câu hỏi?",
      "options": {
        "A": "Đáp án A",
        "B": "Đáp án B",
        "C": "Đáp án C",
        "D": "Đáp án D"
      },
      "correctAnswer": "A",
      "explanation": "Giải thích ngắn gọn, dễ hiểu vì sao đáp án này đúng."
    }
  ]
}
`;

  const rawJson = await callGemini(prompt, true);
  try {
    const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error("Cấu trúc JSON không khớp.");
  } catch (err) {
    console.error("Lỗi parse JSON câu hỏi Gemini:", err, rawJson);
    throw new Error("Không thể phân tích dữ liệu câu hỏi từ AI. Hãy thử lại.");
  }
}
