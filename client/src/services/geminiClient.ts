// services/geminiClient.ts — Client gọi Google Gemini API trực tiếp từ trình duyệt
// Hỗ trợ lưu trữ API Key trong localStorage (BYOK) hoặc qua biến môi trường VITE_GEMINI_API_KEY

const STORAGE_KEY = "peermind_gemini_api_key";
const DEFAULT_MODEL = "gemini-2.0-flash";
const BACKUP_MODEL = "gemini-1.5-flash";

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
 * Test thử kết nối của API Key với Google Gemini API
 */
export async function testGeminiApiKey(keyToTest?: string): Promise<{ success: boolean; message: string }> {
  const apiKey = (keyToTest ?? getGeminiApiKey()).trim();
  if (!apiKey || apiKey.length < 10) {
    return { success: false, message: "API Key không hợp lệ hoặc quá ngắn." };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, reply with 'OK' only." }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `Lỗi HTTP ${res.status}`;
      return { success: false, message: msg };
    }

    return { success: true, message: "Kết nối Google Gemini AI thành công!" };
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2500,
    },
  };

  if (jsonMode) {
    (bodyPayload.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
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
      // Nếu model 2.0-flash lỗi, thử dự phòng sang model 1.5-flash
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
 * 1. AI RAG Chat — Hỏi đáp thông minh trực tiếp trên nội dung tài liệu
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
  // Lọc lấy các trang có liên quan hoặc tối đa 4 trang đầu nếu câu hỏi chung
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

    const pagesToUse = relevantPages.length > 0 ? relevantPages : pagesContent.slice(0, 4).map((text, idx) => ({ text, page: idx + 1 }));

    context = pagesToUse.map((p) => `[Trang ${p.page}]:\n${p.text}`).join("\n\n---\n\n");
  }

  const prompt = `
Bạn là Trợ lý Gia sư AI chuyên nghiệp của nền tảng học tập PeerMind.
Nhiệm vụ của bạn là giải đáp thắc mắc của học sinh dựa trên nội dung tài liệu học tập được cung cấp.

=== THÔNG TIN TÀI LIỆU ===
- Tên tài liệu: "${docTitle}"
- Phân môn: ${docSubject || "Chung"}

=== NỘI DUNG TRÍCH XUẤT TỪ TÀI LIỆU ===
${context || "(Tài liệu chưa có trích xuất chi tiết theo trang, hãy trả lời theo kiến thức môn học này một cách ngắn gọn)"}

=== CÂU HỎI CỦA HỌC SINH ===
"${question}"

=== YÊU CẦU TRẢ LỜI ===
1. Trả lời bằng tiếng Việt, giọng điệu thân thiện, khuyến khích học sinh.
2. Trả lời chính xác, trọng tâm, rõ ràng trong 2-4 đoạn ngắn. Dùng Markdown (gạch đầu dòng, **in đậm** công thức/khái niệm quan trọng).
3. Nếu câu hỏi liên quan trực tiếp đến nội dung trích xuất ở trên, hãy chỉ rõ: "(Trích từ trang X)".
4. Nếu tài liệu không chứa thông tin câu hỏi, hãy trả lời dựa trên kiến thức chuẩn của môn học và ghi chú rằng đây là kiến thức mở rộng ngoài tài liệu.
`;

  return callGemini(prompt, false);
}

/**
 * 2. Tóm tắt tài liệu tự động bằng Gemini
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
Bạn là chuyên gia tóm tắt kiến thức giáo trình cho học sinh, sinh viên.
Hãy đọc hiểu nội dung tài liệu sau và tạo bản tóm lược kiến thức cô đọng, dễ nhớ nhất.

=== TÀI LIỆU ===
Tên: "${docTitle}"
Môn học: ${docSubject || "Tổng hợp"}

=== NỘI DUNG TÀI LIỆU ===
${contentText.slice(0, 10000)}

=== YÊU CẦU ĐẦU RA ===
Trình bày tóm tắt bằng tiếng Việt dưới định dạng Markdown chuẩn:
1. 🎯 **Mục tiêu cốt lõi**: 2 câu tóm gọn ý nghĩa bài học.
2. 🔑 **Kiến thức trọng tâm**: 3-5 ý chính có phân tích ngắn gọn và công thức/thuật toán (nếu có).
3. 💡 **Lưu ý quan trọng / Mẹo thi cử**: Các bẫy thường gặp hoặc điểm cần chú ý.
`;

  return callGemini(prompt, false);
}

/**
 * 3. Tạo bộ câu hỏi trắc nghiệm tự động (Quiz Generator)
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
  count = 5,
}: {
  docTitle: string;
  pagesContent: string[];
  count?: number;
}): Promise<GeneratedQuestion[]> {
  const contentText = pagesContent.length > 0 ? pagesContent.join("\n\n") : docTitle;

  const prompt = `
Bạn là giáo viên giàu kinh nghiệm. Dựa vào nội dung tài liệu dưới đây, hãy soạn thảo ${count} câu hỏi trắc nghiệm 4 đáp án (A, B, C, D) phục vụ ôn thi.

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
      "explanation": "Giải thích cặn kẽ tại sao đáp án này đúng."
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
