// services/geminiClient.ts — Client gọi Google Gemini API trực tiếp từ trình duyệt
// Hỗ trợ lưu trữ API Key trong localStorage (BYOK) hoặc qua biến môi trường VITE_GEMINI_API_KEY

const STORAGE_KEY = "peermind_gemini_api_key";
const DEFAULT_MODEL = "gemini-2.0-flash";
const BACKUP_MODEL = "gemini-2.0-flash-exp";

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
 * Tạo URL chuẩn gọi Gemini API:
 * Với key AQ... thì chỉ dùng x-goog-api-key trong header, không gắn ?key= vào URL
 */
function buildGeminiUrl(model: string, apiKey: string): string {
  if (apiKey.startsWith("AIza")) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/**
 * Test thử kết nối của API Key với Google Gemini API
 */
export async function testGeminiApiKey(keyToTest?: string): Promise<{ success: boolean; message: string }> {
  const apiKey = (keyToTest ?? getGeminiApiKey()).trim();
  if (!apiKey || apiKey.length < 10) {
    return { success: false, message: "API Key không hợp lệ hoặc quá ngắn." };
  }

  try {
    const url = buildGeminiUrl(DEFAULT_MODEL, apiKey);
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
 * Gọi Gemini REST API sinh văn bản
 */
async function callGemini(prompt: string, jsonMode = false, model = DEFAULT_MODEL): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Chưa cấu hình Google Gemini API Key.");
  }

  const url = buildGeminiUrl(model, apiKey);

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7, // Giúp phản hồi tự nhiên, sinh động, thân thiện
      maxOutputTokens: 2500,
    },
  };

  if (jsonMode) {
    (bodyPayload.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
    (bodyPayload.generationConfig as Record<string, unknown>).temperature = 0.2;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      if (model === DEFAULT_MODEL) {
        return callGemini(prompt, jsonMode, BACKUP_MODEL);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi API Google Gemini (Mã: ${res.status})`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("Mô hình không trả về nội dung.");
    }

    return textPart.trim();
  } catch (err) {
    if (model === DEFAULT_MODEL) {
      return callGemini(prompt, jsonMode, BACKUP_MODEL);
    }
    throw err;
  }
}

/**
 * 1. AI RAG Chat — Trò chuyện tự nhiên, thân thiện và giải đáp theo tài liệu
 */
export async function askGeminiRAG({
  question,
  docTitle,
  docSubject,
  pagesContent,
}: {
  question: string;
  docTitle: string;
  docSubject?: string;
  pagesContent: string[];
}): Promise<string> {
  let context = "";
  if (pagesContent.length > 0) {
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const relevantPages = pagesContent
      .map((text, idx) => ({ text, page: idx + 1 }))
      .filter(({ text }) => keywords.some((kw) => text.toLowerCase().includes(kw)))
      .slice(0, 4);

    const pagesToUse =
      relevantPages.length > 0
        ? relevantPages
        : pagesContent.slice(0, 4).map((text, idx) => ({ text, page: idx + 1 }));

    context = pagesToUse.map((p) => `[Trang ${p.page}]:\n${p.text}`).join("\n\n---\n\n");
  }

  const prompt = `
Bạn là Trợ lý AI PeerMind — một người bạn học cùng bàn cực kỳ thân thiện, thông minh, dí dỏm và dễ mến.

PHONG CÁCH GIAO TIẾP BẮT BUỘC:
1. Giao tiếp hoàn toàn tự nhiên, gần gũi, ấm áp như hai người bạn thân đang học cùng nhau.
2. Xưng hô "mình" và "bạn". Tránh hoàn toàn giọng điệu hàn lâm, trang trọng kiểu công chức hay sách giáo khoa khô khan. Dùng thêm emoji sinh động (😊, ✨, 💡, 🚀) để không khí học tập thoải mái.
3. Nếu người dùng chỉ chào hỏi, làm quen hoặc nói chuyện phiếm (ví dụ: "chào bạn", "hello", "hi", "bạn tên gì", "hôm nay thế nào"): Hãy vui vẻ chào lại, hỏi thăm bạn học một cách tự nhiên. TUYỆT ĐỐI KHÔNG tự động tuôn ra một tràng lý thuyết tài liệu nếu người dùng chưa hỏi!
4. Nếu người dùng hỏi về bài học: Hãy giải thích thật đơn giản, dễ hiểu, dùng hình ảnh so sánh hoặc ví dụ thực tế đời sống để bạn học nhớ lâu. Có thể gợi ý: "(Nội dung này có ở trang X nè)".
5. Luôn động viên tinh thần bạn học.

=== THÔNG TIN TÀI LIỆU ĐANG MỞ (ĐỂ BẠN THAM KHẢO KHI CẦN) ===
- Tên tài liệu: "${docTitle}"
- Phân môn: ${docSubject || "Chung"}
${context ? `\n- Nội dung tài liệu:\n${context}` : ""}

=== CÂU HỎI / TIN NHẮN TỪ BẠN HỌC ===
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
