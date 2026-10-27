// client/src/services/ragService.ts — Thuật toán RAG lọc ngữ cảnh theo chunks và số trang thật
// Mỗi chunk bắt buộc có page là số trang thật chứa nó.
// Định dạng đưa vào AI: [Trang N] ... để AI trích dẫn chuẩn xác.

export interface RelevantChunk {
  pageNumber: number; // Trang thật
  text: string;
  score: number;
}

// Từ dừng phổ biến tiếng Việt để lọc nhiễu khi so khớp từ khóa
const VI_STOP_WORDS = new Set([
  "là", "của", "và", "các", "những", "trong", "để", "với", "cho", "về",
  "khi", "có", "được", "này", "đó", "thì", "mà", "ở", "tại", "từ",
  "như", "hay", "hoặc", "một", "bị", "bởi", "do", "bạn", "mình",
  "gì", "sao", "thế", "nào", "hỏi", "biết", "xin", "giúp"
]);

/**
 * Tách từ khóa quan trọng từ câu hỏi
 */
export function extractKeywords(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[/\\?%*:|"<>.,!()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 1 && !VI_STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Chuẩn hóa input đầu vào thành mảng các chunk chuẩn { page: number, text: string }
 */
export function normalizeChunks(
  rawSource: Array<{ page?: number; text?: string } | string> | undefined
): Array<{ page: number; text: string }> {
  if (!rawSource || !Array.isArray(rawSource)) return [];

  return rawSource
    .map((item, idx) => {
      if (typeof item === "string") {
        return { page: idx + 1, text: item };
      }
      if (item && typeof item === "object") {
        return {
          page: typeof item.page === "number" ? item.page : idx + 1,
          text: item.text || "",
        };
      }
      return { page: idx + 1, text: "" };
    })
    .filter((c) => c.text && c.text.trim().length > 0);
}

/**
 * Tìm các chunks liên quan nhất trong tài liệu
 * @param query Câu hỏi hoặc yêu cầu của người dùng
 * @param source Chunks hoặc Pages của tài liệu
 * @param topK Số lượng chunk tối đa cần lấy
 * @param currentPage Trang hiện tại đang mở trong giao diện
 */
export function findRelevantPages(
  query: string,
  source: Array<{ page?: number; text?: string } | string>,
  topK = 5,
  currentPage?: number
): RelevantChunk[] {
  const chunks = normalizeChunks(source);
  if (chunks.length === 0) return [];

  // Nếu số lượng chunk ít hơn hoặc bằng topK, trả về toàn bộ
  if (chunks.length <= topK) {
    return chunks.map((c) => ({
      pageNumber: c.page,
      text: c.text,
      score: 1.0,
    }));
  }

  // 1. Kiểm tra xem người dùng có yêu cầu trang cụ thể không (VD: "trang 3", "trang số 5", "slide 4")
  const pageMatch = query.match(/(?:trang|page|slide|mục)\s*(?:số\s*)?(\d+)/i);
  if (pageMatch) {
    const targetPageNum = parseInt(pageMatch[1], 10);
    const targetChunks = chunks.filter((c) => c.page === targetPageNum);

    if (targetChunks.length > 0) {
      const results: RelevantChunk[] = targetChunks.map((c) => ({
        pageNumber: c.page,
        text: c.text,
        score: 100,
      }));

      // Bổ sung thêm chunk của trang kế tiếp để có tính liên tục nếu còn slot
      if (results.length < topK) {
        const nextChunks = chunks.filter((c) => c.page === targetPageNum + 1);
        nextChunks.forEach((nc) => {
          if (results.length < topK) {
            results.push({ pageNumber: nc.page, text: nc.text, score: 50 });
          }
        });
      }

      return results.slice(0, topK);
    }
  }

  // 2. Nếu người dùng hỏi về "trang này", "slide này" và có currentPage
  if (currentPage && currentPage >= 1) {
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes("trang này") ||
      lowerQuery.includes("slide này") ||
      lowerQuery.includes("đoạn này") ||
      lowerQuery.includes("nội dung này") ||
      lowerQuery.includes("hiện tại")
    ) {
      const currentChunks = chunks.filter((c) => c.page === currentPage);
      if (currentChunks.length > 0) {
        return currentChunks.slice(0, topK).map((c) => ({
          pageNumber: c.page,
          text: c.text,
          score: 100,
        }));
      }
    }
  }

  // 3. TF-IDF & Keyword Matching trên từng chunk
  const keywords = extractKeywords(query);

  if (keywords.length === 0) {
    // Không có từ khóa: ưu tiên chunk trang hiện tại hoặc đầu tài liệu
    if (currentPage) {
      const currentChunks = chunks.filter((c) => c.page === currentPage);
      if (currentChunks.length > 0) {
        return currentChunks.slice(0, topK).map((c) => ({
          pageNumber: c.page,
          text: c.text,
          score: 1.0,
        }));
      }
    }
    return chunks.slice(0, topK).map((c) => ({
      pageNumber: c.page,
      text: c.text,
      score: 0.5,
    }));
  }

  const scored: RelevantChunk[] = chunks.map((chunk) => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        const count = textLower.split(kw).length - 1;
        score += count * (kw.length > 4 ? 2.5 : 1.5);

        // Thưởng điểm nếu xuất hiện ở đầu chunk
        const firstPos = textLower.indexOf(kw);
        if (firstPos < 150) {
          score += 2.0;
        }
      }
    }

    // Nếu chunk thuộc trang người dùng đang mở, ưu tiên nhẹ
    if (currentPage && chunk.page === currentPage && score > 0) {
      score += 3.0;
    }

    return {
      pageNumber: chunk.page,
      text: chunk.text,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const filtered = scored.filter((s) => s.score > 0).slice(0, topK);

  if (filtered.length === 0) {
    return chunks.slice(0, topK).map((c) => ({
      pageNumber: c.page,
      text: c.text,
      score: 0.1,
    }));
  }

  // Sắp xếp lại theo thứ tự số trang tự nhiên để AI đọc mạch lạc
  return filtered.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Định dạng khối ngữ cảnh RAG hoàn chỉnh đưa vào Prompt cho Gemini
 * Đưa chunks kèm nhãn trang [Trang N] với N là trang thật
 */
export function buildRAGContext(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return "Tài liệu chưa có nội dung văn bản bóc tách.";

  return chunks
    .map((c) => {
      // Làm sạch chuỗi Base64 ảnh để AI tập trung vào văn bản
      const cleanText = c.text
        .replace(/!\[(.*?)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=\s\\]+\)/g, "[Hình ảnh: $1]")
        .replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, "[Hình ảnh: $1]");

      return `[Trang ${c.pageNumber}]\n${cleanText}`;
    })
    .join("\n\n");
}
