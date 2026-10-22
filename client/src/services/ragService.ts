// client/src/services/ragService.ts — Thuật toán RAG tìm kiếm ngữ cảnh trang tài liệu thông minh
// Lọc ra các trang/đoạn sát nhất với câu hỏi của sinh viên để gửi cho Gemini kèm nguồn trích dẫn

export interface RelevantChunk {
  pageNumber: number;
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
function extractKeywords(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[/\\?%*:|"<>.,!()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 1 && !VI_STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Tìm các trang liên quan nhất trong tài liệu dựa trên thuật toán TF-IDF / Term Matching
 */
export function findRelevantPages(
  query: string,
  pages: string[],
  topK = 3
): RelevantChunk[] {
  if (!pages || pages.length === 0) return [];
  if (pages.length <= topK) {
    return pages.map((text, idx) => ({
      pageNumber: idx + 1,
      text,
      score: 1.0,
    }));
  }

  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    // Nếu không có từ khóa đặc thù (câu hỏi chào hỏi thông thường): lấy 2 trang đầu
    return pages.slice(0, 2).map((text, idx) => ({
      pageNumber: idx + 1,
      text,
      score: 0.5,
    }));
  }

  const scoredPages: RelevantChunk[] = pages.map((pageText, idx) => {
    const textLower = pageText.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        // Tần suất xuất hiện
        const count = textLower.split(kw).length - 1;
        score += count * (kw.length > 4 ? 2.5 : 1.5);

        // Điểm thưởng nếu xuất hiện ở đầu trang (thường là tiêu đề hoặc khái niệm cốt lõi)
        const firstPos = textLower.indexOf(kw);
        if (firstPos < 200) {
          score += 3.0;
        }
      }
    }

    return {
      pageNumber: idx + 1,
      text: pageText,
      score,
    };
  });

  // Sắp xếp theo điểm liên quan giảm dần
  scoredPages.sort((a, b) => b.score - a.score);

  // Lọc ra các trang có điểm > 0 hoặc lấy tối thiểu trang top 1
  const topResults = scoredPages.filter((p) => p.score > 0).slice(0, topK);

  if (topResults.length === 0) {
    return scoredPages.slice(0, 2);
  }

  // Sắp xếp lại kết quả theo thứ tự số trang tự nhiên để AI dễ đọc theo mạch
  return topResults.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Định dạng khối ngữ cảnh RAG hoàn chỉnh đưa vào Prompt cho Gemini
 */
export function buildRAGContext(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return "Tài liệu chưa có nội dung văn bản bóc tách.";

  return chunks
    .map(
      (c) =>
        `--- [TRANG ${c.pageNumber}] ---\n${c.text.slice(0, 1800)}`
    )
    .join("\n\n");
}
