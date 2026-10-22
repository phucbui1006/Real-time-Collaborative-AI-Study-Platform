// services/aiService.ts — Tương tác AI & Trợ lý học tập đa năng (Hỏi đáp tự do & Theo tài liệu)
import {
  askGeminiRAG,
  summarizeDocumentWithGemini,
  generateQuizWithGemini,
  generateMindmapTextWithGemini,
} from "./geminiClient";
import { supabase } from "./supabaseClient";
import { isValidUUID } from "../utils";

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
  isUploading?: boolean;
  uploadError?: string;
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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Tải danh sách các phiên trò chuyện (Sessions) của tài liệu
 */
export async function fetchDocSessions(docId: number, userId?: string): Promise<ChatSession[]> {
  const localKey = `peermind_sessions_${docId}`;
  let localSessions: ChatSession[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localSessions = JSON.parse(raw);
  } catch {}

  try {
    let query = supabase
      .from("ai_conversations")
      .select("session_id, session_title, created_at")
      .eq("document_id", docId)
      .order("created_at", { ascending: false });

    if (isValidUUID(userId)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const sessionMap = new Map<string, ChatSession>();
      data.forEach((row) => {
        const sId = row.session_id || "default";
        if (!sessionMap.has(sId)) {
          sessionMap.set(sId, {
            id: sId,
            title: row.session_title || (sId === "default" ? "Cuộc trò chuyện chính" : "Cuộc trò chuyện"),
            createdAt: row.created_at,
          });
        }
      });
      const dbSessions = Array.from(sessionMap.values());
      const merged = [...dbSessions];
      localSessions.forEach((ls) => {
        if (!merged.some((ms) => ms.id === ls.id)) {
          merged.push(ls);
        }
      });
      if (merged.length > 0) return merged;
    }
  } catch (err) {
    console.warn("Lỗi tải sessions từ Supabase:", err);
  }

  if (localSessions.length > 0) return localSessions;

  const defaultSession: ChatSession = {
    id: "default",
    title: "Cuộc trò chuyện chính",
    createdAt: new Date().toISOString(),
  };
  return [defaultSession];
}

/**
 * Tải lịch sử trò chuyện AI theo từng phiên (Session) của tài liệu
 */
export async function fetchDocConversations(
  docId: number,
  sessionId: string = "default",
  userId?: string
): Promise<ChatMessage[]> {
  try {
    let query = supabase
      .from("ai_conversations")
      .select("question, answer, created_at, session_id")
      .eq("document_id", docId);

    if (sessionId === "default") {
      query = query.or(`session_id.eq.default,session_id.is.null`);
    } else {
      query = query.eq("session_id", sessionId);
    }

    if (isValidUUID(userId)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const messages: ChatMessage[] = [];
      data.forEach((row) => {
        if (row.question) {
          messages.push({ role: "user", text: row.question });
        }
        if (row.answer) {
          messages.push({ role: "ai", text: row.answer, isGemini: true });
        }
      });
      return messages;
    }

    // Dự phòng local storage theo session
    const localKey = `peermind_chat_${docId}_${sessionId}`;
    const stored =
      localStorage.getItem(localKey) ||
      (sessionId === "default" ? localStorage.getItem(`peermind_chat_${docId}`) : null);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
  } catch (err) {
    console.warn("Lỗi tải lịch sử chat từ Supabase:", err);
  }
  return [];
}

/**
 * Lưu cuộc trò chuyện của tài liệu vào CSDL Supabase theo Session
 */
export async function saveDocConversation(
  docId: number,
  question: string,
  answer: string,
  userId?: string,
  sessionId: string = "default",
  sessionTitle?: string
): Promise<void> {
  const payload: any = {
    document_id: docId,
    question,
    answer,
  };
  if (isValidUUID(userId)) {
    payload.user_id = userId;
  }
  if (sessionId) {
    payload.session_id = sessionId;
  }
  if (sessionTitle) {
    payload.session_title = sessionTitle;
  }

  try {
    const { error } = await supabase.from("ai_conversations").insert(payload);
    if (error) {
      // Fallback nếu CSDL Supabase chưa chạy migration thêm cột session_id/user_id
      await supabase.from("ai_conversations").insert({
        document_id: docId,
        question,
        answer,
      });
    }
  } catch (err) {
    console.warn("Lỗi lưu lịch sử chat vào Supabase:", err);
  }

  // 2. Lưu local cache theo session
  try {
    const localKey = `peermind_chat_${docId}_${sessionId}`;
    const current = JSON.parse(localStorage.getItem(localKey) || "[]");
    current.push({ role: "user", text: question });
    current.push({ role: "ai", text: answer, isGemini: true });
    localStorage.setItem(localKey, JSON.stringify(current.slice(-50)));

    // Đồng bộ session list trong local storage
    const sessionsKey = `peermind_sessions_${docId}`;
    const sessionsList: ChatSession[] = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
    const existing = sessionsList.find((s) => s.id === sessionId);
    if (existing) {
      if (sessionTitle && existing.title !== sessionTitle) {
        existing.title = sessionTitle;
      }
      existing.updatedAt = new Date().toISOString();
    } else {
      sessionsList.unshift({
        id: sessionId,
        title: sessionTitle || (sessionId === "default" ? "Cuộc trò chuyện chính" : "Cuộc trò chuyện"),
        createdAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(sessionsKey, JSON.stringify(sessionsList));
  } catch (e) {
    console.warn("Lỗi lưu local session:", e);
  }
}

/**
 * Xóa một phiên trò chuyện (Session) của tài liệu
 */
export async function deleteDocSession(
  docId: number,
  sessionId: string,
  userId?: string
): Promise<void> {
  try {
    let query = supabase.from("ai_conversations").delete().eq("document_id", docId);
    if (sessionId === "default") {
      query = query.or(`session_id.eq.default,session_id.is.null`);
    } else {
      query = query.eq("session_id", sessionId);
    }
    if (isValidUUID(userId)) {
      query = query.eq("user_id", userId);
    }
    await query;
  } catch (err) {
    console.warn("Lỗi xóa session từ Supabase:", err);
  }

  try {
    localStorage.removeItem(`peermind_chat_${docId}_${sessionId}`);
    if (sessionId === "default") {
      localStorage.removeItem(`peermind_chat_${docId}`);
    }
    const sessionsKey = `peermind_sessions_${docId}`;
    const sessionsList: ChatSession[] = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
    const filtered = sessionsList.filter((s) => s.id !== sessionId);
    localStorage.setItem(sessionsKey, JSON.stringify(filtered));
  } catch {}
}

/**
 * Đổi tên phiên trò chuyện
 */
export async function renameDocSession(
  docId: number,
  sessionId: string,
  newTitle: string,
  userId?: string
): Promise<void> {
  try {
    let query = supabase
      .from("ai_conversations")
      .update({ session_title: newTitle })
      .eq("document_id", docId);

    if (sessionId === "default") {
      query = query.or(`session_id.eq.default,session_id.is.null`);
    } else {
      query = query.eq("session_id", sessionId);
    }
    if (isValidUUID(userId)) {
      query = query.eq("user_id", userId);
    }
    await query;
  } catch (err) {
    console.warn("Lỗi đổi tên session trên Supabase:", err);
  }

  try {
    const sessionsKey = `peermind_sessions_${docId}`;
    const sessionsList: ChatSession[] = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
    const target = sessionsList.find((s) => s.id === sessionId);
    if (target) {
      target.title = newTitle;
      target.updatedAt = new Date().toISOString();
      localStorage.setItem(sessionsKey, JSON.stringify(sessionsList));
    }
  } catch {}
}
